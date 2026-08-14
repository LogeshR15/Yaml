import { SYSTEM_PROMPT } from './prompt';
import { validateOpenApiYaml, ValidationResult } from './validateYaml';
import { sanitizeYaml } from './sanitizeYaml';

// Catalyst Function proxy — absolute URL since Slate and Functions are on different domains.
const PROXY_URL = 'https://yaml-60039712979.development.catalystserverless.in/server/glm-proxy/execute';
const GLM_MODEL = 'crm-di-glm47b_30b_it';

export interface GenerateResult {
  yaml: string;
  modelUsed: string;
  validation: ValidationResult;
}

function stripMarkdownFences(text: string): string {
  return text
    .replace(/^```ya?ml\s*/im, '')
    .replace(/^```\s*/im, '')
    .replace(/```\s*$/im, '')
    .trim();
}

/**
 * Catalyst GLM does NOT return an OpenAI-shaped body. A real response is:
 *   { response: "openapi: 3.0.1\n...", tool_calls: [], usage: {...}, model: "..." }
 * The OpenAI `choices[]` shape is kept only as a fallback in case the endpoint
 * is ever switched to an OpenAI-compatible gateway.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractText(data: any): string | null {
  if (typeof data?.response === 'string' && data.response.trim()) {
    return data.response;
  }
  const content = data?.choices?.[0]?.message?.content;
  if (!content) return null;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (content as any[])
      .filter((b) => b.type === 'text')
      .map((b) => b.text as string)
      .join('');
  }
  return null;
}

/**
 * Measured throughput of crm-di-glm47b_30b_it is ~53 output tokens/sec, and the
 * Advanced I/O function that proxies this call is killed at 30s (hard Catalyst
 * limit, not configurable). 1300 tokens ≈ 25s, which fits inside that window.
 * Raising this trades a complete spec for a guaranteed 408.
 */
const MAX_OUTPUT_TOKENS = 1300;

async function callGlm(
  userPrompt: string,
  maxTokens = MAX_OUTPUT_TOKENS
): Promise<{ text: string; truncated: boolean }> {
  let res: Response;
  try {
    res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GLM_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: maxTokens,
        temperature: 0.1,
        stream: false,
        chat_template_kwargs: { enable_thinking: false },
      }),
    });
  } catch (networkErr) {
    throw new Error(`Network error: ${networkErr instanceof Error ? networkErr.message : String(networkErr)}`);
  }

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    console.error('[GLM] HTTP', res.status, errBody);

    // 408 is the Catalyst function being killed at its 30s ceiling, not a model error.
    if (res.status === 408 || errBody.includes('EXECUTION_TIME_EXCEEDED')) {
      throw new Error(
        'Generation took longer than the 30-second server limit. Paste fewer endpoints ' +
          '(one or two at a time) and generate them separately.'
      );
    }

    let msg = `API error ${res.status}`;
    try {
      const parsed = JSON.parse(errBody);
      msg = parsed?.error?.message || parsed?.error || parsed?.message || msg;
    } catch { /* not JSON */ }
    throw new Error(msg);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await res.json();
  console.log('[GLM] usage:', JSON.stringify(data?.usage));

  const raw = extractText(data);
  if (!raw) {
    throw new Error(`Unexpected GLM response shape. Keys: ${Object.keys(data).join(', ')}`);
  }

  // Hitting the ceiling exactly means the spec was cut off mid-output.
  const completion = Number(data?.usage?.completion_tokens ?? 0);
  const truncated = completion >= maxTokens;

  return { text: sanitizeYaml(stripMarkdownFences(raw)), truncated };
}

export async function generateYaml(docs: string): Promise<GenerateResult> {
  const userPrompt = `Convert the following Zoho API documentation into a complete, ZIA-agent-ready OpenAPI 3.0.1 YAML specification:\n\n${docs}`;

  const result = await callGlm(userPrompt);

  const validation = validateOpenApiYaml(result.text);

  if (result.text.includes('openapi')) {
    // Still return the YAML — a partial spec is often useful — but say so loudly
    // rather than letting the user upload a silently truncated file to ZIA.
    if (result.truncated) {
      validation.warnings = [
        `Output was cut off at the ${MAX_OUTPUT_TOKENS}-token limit — this spec is incomplete. ` +
          'Paste fewer endpoints and generate them one at a time.',
        ...validation.warnings,
      ];
    }
    return { yaml: result.text, modelUsed: GLM_MODEL, validation };
  }

  throw new Error(`Validation failed: ${validation.errors.join('; ')}`);
}

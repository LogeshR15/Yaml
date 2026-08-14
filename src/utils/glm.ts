import { SYSTEM_PROMPT, RETRY_PROMPT_SUFFIX } from './prompt';
import { validateOpenApiYaml, ValidationResult } from './validateYaml';
import { sanitizeYaml } from './sanitizeYaml';

// Calls the Catalyst Function proxy (same-origin, no CORS) which in turn
// calls the GLM API server-side with a Zoho OAuth token.
const PROXY_URL = '/server/glm-proxy/execute';
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractText(data: any): string | null {
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

async function callGlm(
  userPrompt: string,
  maxTokens = 16384
): Promise<{ text: string }> {
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
    let msg = `API error ${res.status}`;
    try {
      const parsed = JSON.parse(errBody);
      msg = parsed?.error?.message || parsed?.message || msg;
    } catch { /* not JSON */ }
    throw new Error(msg);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await res.json();
  console.log('[GLM] raw response:', JSON.stringify(data).slice(0, 500));

  const raw = extractText(data);
  if (!raw) {
    throw new Error(`Unexpected GLM response shape. Keys: ${Object.keys(data).join(', ')}`);
  }

  return { text: sanitizeYaml(stripMarkdownFences(raw)) };
}

export async function generateYaml(docs: string): Promise<GenerateResult> {
  const userPrompt = `Convert the following Zoho API documentation into a complete, ZIA-agent-ready OpenAPI 3.0.1 YAML specification:\n\n${docs}`;

  const result = await callGlm(userPrompt);

  const validation = validateOpenApiYaml(result.text);
  if (validation.valid) {
    return { yaml: result.text, modelUsed: GLM_MODEL, validation };
  }

  // Retry once with a stricter prompt suffix
  const retryPrompt = `${userPrompt}${RETRY_PROMPT_SUFFIX}`;
  try {
    const retry = await callGlm(retryPrompt);
    const rv = validateOpenApiYaml(retry.text);
    if (rv.valid || retry.text.includes('openapi')) {
      return { yaml: retry.text, modelUsed: GLM_MODEL, validation: rv };
    }
  } catch {
    /* fall through — return first result */
  }

  if (result.text.includes('openapi')) {
    return { yaml: result.text, modelUsed: GLM_MODEL, validation };
  }

  throw new Error(`Validation failed: ${validation.errors.join('; ')}`);
}

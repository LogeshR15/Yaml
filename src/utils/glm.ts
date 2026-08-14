import { SYSTEM_PROMPT, RETRY_PROMPT_SUFFIX } from './prompt';
import { validateOpenApiYaml, ValidationResult } from './validateYaml';
import { sanitizeYaml } from './sanitizeYaml';

const GLM_URL =
  'https://api.catalyst.zoho.in/quickml/v1/project/17603000000023001/glm/chat';
const GLM_MODEL = 'crm-di-glm47b_30b_it';
const CATALYST_ORG = '60039712979';

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
  accessToken: string,
  userPrompt: string,
  maxTokens = 16384
): Promise<{ text: string } | null> {
  let res: Response;
  try {
    res = await fetch(GLM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        'CATALYST-ORG': CATALYST_ORG,
      },
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
  } catch {
    return null;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: { message?: string }; message?: string })?.error?.message ||
        (err as { message?: string })?.message ||
        `API error ${res.status}`
    );
  }

  const data = await res.json();
  const raw = extractText(data);
  if (!raw) return null;

  return { text: sanitizeYaml(stripMarkdownFences(raw)) };
}

export async function generateYaml(
  accessToken: string,
  docs: string
): Promise<GenerateResult> {
  const userPrompt = `Convert the following Zoho API documentation into a complete, ZIA-agent-ready OpenAPI 3.0.1 YAML specification:\n\n${docs}`;

  let result: { text: string } | null = null;
  try {
    result = await callGlm(accessToken, userPrompt);
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Generation failed. Try again.');
  }

  if (!result) {
    throw new Error('No output received from GLM. Please try again.');
  }

  const validation = validateOpenApiYaml(result.text);
  if (validation.valid) {
    return { yaml: result.text, modelUsed: GLM_MODEL, validation };
  }

  // Retry once with a stricter prompt suffix
  const retryPrompt = `${userPrompt}${RETRY_PROMPT_SUFFIX}`;
  try {
    const retry = await callGlm(accessToken, retryPrompt);
    if (retry) {
      const rv = validateOpenApiYaml(retry.text);
      if (rv.valid || retry.text.includes('openapi')) {
        return { yaml: retry.text, modelUsed: GLM_MODEL, validation: rv };
      }
    }
  } catch {
    /* fall through — return first result */
  }

  if (result.text.includes('openapi')) {
    return { yaml: result.text, modelUsed: GLM_MODEL, validation };
  }

  throw new Error(`Validation failed: ${validation.errors.join('; ')}`);
}

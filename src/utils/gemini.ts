import { SYSTEM_PROMPT, RETRY_PROMPT_SUFFIX } from './prompt';
import { validateOpenApiYaml, ValidationResult } from './validateYaml';
import { sanitizeYaml } from './sanitizeYaml';

export const GEMINI_KEY_STORAGE = 'zia_yaml_gemini_key';

/**
 * Ordered list of Gemini models to try, with each model's max output token budget.
 * Lead with high-capacity models (2.5 family supports up to 65536 output tokens) so
 * large API docs produce a COMPLETE spec — older 8192-cap models truncate big specs
 * mid-output, which fails ZIA validation with confusing "responses is missing" errors.
 */
const MODELS = [
  { api: 'v1beta', name: 'gemini-2.5-flash', maxTokens: 65536 },
  { api: 'v1beta', name: 'gemini-2.5-flash-lite', maxTokens: 65536 },
  { api: 'v1beta', name: 'gemini-2.0-flash', maxTokens: 8192 },
  { api: 'v1beta', name: 'gemini-2.0-flash-lite', maxTokens: 8192 },
  { api: 'v1beta', name: 'gemini-1.5-flash', maxTokens: 8192 },
];

/** Status codes that mean "try the next model" */
const RETRYABLE_STATUSES = new Set([400, 404, 429, 503, 529]);

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function stripMarkdownFences(text: string): string {
  return text
    .replace(/^```ya?ml\s*/im, '')
    .replace(/^```\s*/im, '')
    .replace(/```\s*$/im, '')
    .trim();
}

/** Returns null when we should try the next model. Throws on hard failures. */
async function callModel(
  apiKey: string,
  model: { api: string; name: string; maxTokens: number },
  prompt: string
): Promise<{ text: string; modelUsed: string; truncated: boolean } | null> {
  const url = `https://generativelanguage.googleapis.com/${model.api}/models/${model.name}:generateContent?key=${apiKey}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\n${prompt}` }] }],
        generationConfig: { maxOutputTokens: model.maxTokens, temperature: 0.1 },
      }),
    });
  } catch {
    return null; // Network error — try next model
  }

  if (RETRYABLE_STATUSES.has(res.status)) return null;

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg: string = err?.error?.message || `API error ${res.status}`;
    // If the message is about high demand / overload, silently try next model
    if (
      msg.toLowerCase().includes('high demand') ||
      msg.toLowerCase().includes('overloaded') ||
      msg.toLowerCase().includes('resource exhausted')
    ) {
      return null;
    }
    throw new Error(msg);
  }

  const data = await res.json();
  const candidate = data.candidates?.[0];
  const raw: string | undefined = candidate?.content?.parts?.[0]?.text;
  if (!raw) return null;

  // finishReason MAX_TOKENS means the model hit its output ceiling mid-spec — the YAML
  // is incomplete (missing responses, schemas, etc.). Flag it so the caller can try a
  // larger-capacity model instead of returning broken YAML.
  const truncated = candidate?.finishReason === 'MAX_TOKENS';

  return { text: sanitizeYaml(stripMarkdownFences(raw)), modelUsed: model.name, truncated };
}

export interface GenerateResult {
  yaml: string;
  modelUsed: string;
  validation: ValidationResult;
}

export async function generateYaml(
  apiKey: string,
  docs: string
): Promise<GenerateResult> {
  const userPrompt = `Convert the following Zoho API documentation into a complete, ZIA-agent-ready OpenAPI 3.0.1 YAML specification:\n\n${docs}`;
  const retryPrompt = `${userPrompt}${RETRY_PROMPT_SUFFIX}`;

  let lastError = 'All Gemini models are currently busy. Please wait a moment and try again.';
  let lastYaml = '';
  let triedCount = 0;

  for (const model of MODELS) {
    // Small delay between model attempts to avoid hammering the API
    if (triedCount > 0) await sleep(600);
    triedCount++;

    let result: { text: string; modelUsed: string } | null = null;
    try {
      result = await callModel(apiKey, model, userPrompt);
    } catch (err) {
      // Hard error (e.g. invalid API key) — stop immediately
      lastError = err instanceof Error ? err.message : String(err);
      break;
    }

    if (!result) continue; // Model unavailable — try next

    // Output hit the token ceiling and is incomplete — record it and try a bigger model.
    if (result.truncated) {
      lastYaml = result.text;
      lastError =
        'The generated spec exceeded the model output limit and was cut off. ' +
        'Try splitting the documentation into fewer endpoints per generation.';
      continue;
    }

    const validation = validateOpenApiYaml(result.text);
    if (validation.valid) {
      return { yaml: result.text, modelUsed: result.modelUsed, validation };
    }

    // Output was invalid YAML — retry once with a stricter prompt
    lastYaml = result.text;
    try {
      await sleep(400);
      const retry = await callModel(apiKey, model, retryPrompt);
      if (retry) {
        const rv = validateOpenApiYaml(retry.text);
        if (rv.valid) {
          return { yaml: retry.text, modelUsed: retry.modelUsed, validation: rv };
        }
        lastYaml = retry.text;
        lastError = `Validation failed: ${rv.errors.join('; ')}`;
      }
    } catch {
      /* ignore — move on */
    }
  }

  // All models tried — if we have any YAML output at all, return it with warnings
  if (lastYaml && lastYaml.includes('openapi')) {
    return { yaml: lastYaml, modelUsed: 'unknown', validation: validateOpenApiYaml(lastYaml) };
  }

  throw new Error(lastError);
}

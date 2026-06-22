import { SYSTEM_PROMPT, RETRY_PROMPT_SUFFIX } from './prompt';
import { validateOpenApiYaml, ValidationResult } from './validateYaml';

export const GEMINI_KEY_STORAGE = 'zia_yaml_gemini_key';

/**
 * Ordered list of Gemini models to try.
 * Falls through to next on 404 (model not found) or 429 (quota exceeded).
 */
const MODELS = [
  { version: 'v1beta', name: 'gemini-2.5-flash-lite' },
  { version: 'v1beta', name: 'gemini-2.5-flash' },
  { version: 'v1beta', name: 'gemini-2.0-flash-lite' },
  { version: 'v1beta', name: 'gemini-1.5-flash' },
  { version: 'v1beta', name: 'gemini-pro' },
  { version: 'v1',     name: 'gemini-1.5-flash' },
  { version: 'v1',     name: 'gemini-pro' },
];

function stripMarkdownFences(text: string): string {
  return text
    .replace(/^```ya?ml\s*/im, '')
    .replace(/^```\s*/im, '')
    .replace(/```\s*$/im, '')
    .trim();
}

async function callGeminiModel(
  apiKey: string,
  model: { version: string; name: string },
  userPrompt: string
): Promise<{ text: string; modelUsed: string } | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model.name}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\n${userPrompt}` }] }],
      generationConfig: { maxOutputTokens: 8192, temperature: 0.1 },
    }),
  });

  // Retry with next model on quota or not-found errors
  if (res.status === 404 || res.status === 429 || res.status === 400) {
    return null;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${res.status}`);
  }

  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) return null;

  return {
    text: stripMarkdownFences(raw),
    modelUsed: model.name,
  };
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

  let lastError = 'All Gemini models failed or returned no output.';
  let lastYaml = '';

  for (const model of MODELS) {
    let result: { text: string; modelUsed: string } | null = null;

    try {
      result = await callGeminiModel(apiKey, model, userPrompt);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      break; // Non-retryable error (bad API key, network etc.)
    }

    if (!result) continue; // Try next model

    const validation = validateOpenApiYaml(result.text);

    if (validation.valid) {
      return { yaml: result.text, modelUsed: result.modelUsed, validation };
    }

    // Invalid YAML — try once more with stricter prompt on same model
    lastYaml = result.text;
    try {
      const retry = await callGeminiModel(apiKey, model, retryPrompt);
      if (retry) {
        const retryValidation = validateOpenApiYaml(retry.text);
        if (retryValidation.valid) {
          return { yaml: retry.text, modelUsed: retry.modelUsed, validation: retryValidation };
        }
        lastYaml = retry.text;
        lastError = `Validation failed: ${retryValidation.errors.join(', ')}`;
      }
    } catch {
      // Ignore retry error, move to next model
    }
  }

  // If we have output but it failed validation, return it anyway with warnings
  if (lastYaml && lastYaml.includes('openapi')) {
    const validation = validateOpenApiYaml(lastYaml);
    return { yaml: lastYaml, modelUsed: 'unknown', validation };
  }

  throw new Error(lastError);
}

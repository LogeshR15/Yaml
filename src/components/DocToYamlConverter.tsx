import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wand2, Key, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface DocToYamlConverterProps {
  onYamlGenerated: (yaml: string) => void;
}

type AIProvider = 'gemini' | 'claude';

const STORAGE_KEYS = {
  gemini: 'yaml_studio_gemini_api_key',
  claude: 'yaml_studio_claude_api_key',
  provider: 'yaml_studio_ai_provider',
};

const SYSTEM_PROMPT = `You are an expert at reading API documentation and converting it into valid OpenAPI 3.0.0 YAML specifications.

Rules:
- Always output ONLY valid OpenAPI 3.0.0 YAML — no markdown fences, no explanation text, no triple backticks
- Infer path parameters from URL patterns like {id} or :id
- Use appropriate HTTP methods based on the documentation
- Map all request body fields to schema properties with correct types
- Include all response status codes mentioned
- Use descriptive operationId values (camelCase)
- If a base URL is mentioned, include it in servers
- For Zoho APIs, include OAuth2 security scheme if auth is mentioned
- If information is missing, use sensible defaults
- The output must start with "openapi: 3.0.0"`;

const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
  'gemini-1.5-flash-latest',
  'gemini-pro',
];

const callGemini = async (apiKey: string, docs: string): Promise<string> => {
  const prompt = `${SYSTEM_PROMPT}\n\nConvert the following API documentation into a complete OpenAPI 3.0.0 YAML specification:\n\n${docs}`;
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 4096, temperature: 0.1 },
  });

  let lastError = '';
  for (const model of GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      lastError = err?.error?.message || `HTTP ${response.status}`;
      // If model not found or quota exceeded, try next model
      if (response.status === 404 || response.status === 429) continue;
      throw new Error(lastError);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) { lastError = 'Empty response'; continue; }

    // Strip markdown fences if present
    return text.replace(/^```ya?ml\n?/i, '').replace(/```$/, '').trim();
  }

  throw new Error(`All Gemini models failed. Last error: ${lastError}`);
};

const callClaude = async (apiKey: string, docs: string): Promise<string> => {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Convert the following API documentation into a complete OpenAPI 3.0.0 YAML specification:\n\n${docs}` }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Claude API error: HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text?.trim() || '';
};

const DocToYamlConverter: React.FC<DocToYamlConverterProps> = ({ onYamlGenerated }) => {
  const [docs, setDocs] = useState('');
  const [provider, setProvider] = useState<AIProvider>(
    (localStorage.getItem(STORAGE_KEYS.provider) as AIProvider) || 'gemini'
  );
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem(STORAGE_KEYS.gemini) || '');
  const [claudeKey, setClaudeKey] = useState(() => localStorage.getItem(STORAGE_KEYS.claude) || '');
  const [loading, setLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(
    !localStorage.getItem(STORAGE_KEYS.gemini) && !localStorage.getItem(STORAGE_KEYS.claude)
  );

  const currentKey = provider === 'gemini' ? geminiKey : claudeKey;
  const hasSavedKey = !!localStorage.getItem(STORAGE_KEYS[provider]);

  const saveApiKey = () => {
    if (provider === 'gemini') {
      localStorage.setItem(STORAGE_KEYS.gemini, geminiKey);
    } else {
      localStorage.setItem(STORAGE_KEYS.claude, claudeKey);
    }
    localStorage.setItem(STORAGE_KEYS.provider, provider);
    setShowKeyInput(false);
    toast({ title: 'API key saved', description: `Your ${provider === 'gemini' ? 'Gemini' : 'Claude'} API key has been saved locally.` });
  };

  const handleProviderChange = (p: AIProvider) => {
    setProvider(p);
    localStorage.setItem(STORAGE_KEYS.provider, p);
    setShowKeyInput(!localStorage.getItem(STORAGE_KEYS[p]));
  };

  const convert = async () => {
    if (!docs.trim()) {
      toast({ title: 'No content', description: 'Please paste your API documentation first.', variant: 'destructive' });
      return;
    }
    const key = provider === 'gemini'
      ? (geminiKey || localStorage.getItem(STORAGE_KEYS.gemini))
      : (claudeKey || localStorage.getItem(STORAGE_KEYS.claude));

    if (!key) {
      setShowKeyInput(true);
      toast({ title: 'API key required', description: `Please enter your ${provider === 'gemini' ? 'Gemini' : 'Claude'} API key.`, variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const generatedYaml = provider === 'gemini'
        ? await callGemini(key, docs)
        : await callClaude(key, docs);

      if (!generatedYaml || !generatedYaml.startsWith('openapi:')) {
        throw new Error('AI did not return valid OpenAPI YAML. Try adding more detail to your docs.');
      }

      onYamlGenerated(generatedYaml);
      setDocs('');
      toast({ title: 'Done!', description: 'OpenAPI spec generated and imported into the editor.' });
    } catch (err) {
      toast({
        title: 'Conversion failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm border-l-4 border-l-purple-500">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-purple-600" />
          Convert API Docs to OpenAPI YAML
          <span className="ml-auto text-xs font-normal text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
            Powered by AI
          </span>
        </CardTitle>
        <p className="text-sm text-gray-500 mt-1">
          Paste any API documentation — Zoho docs, plain text, markdown — and AI will generate a complete OpenAPI spec for you.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Provider Toggle */}
        <div className="space-y-1">
          <Label className="text-xs text-gray-500">AI Provider</Label>
          <div className="flex gap-2">
            <button
              onClick={() => handleProviderChange('gemini')}
              className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                provider === 'gemini'
                  ? 'bg-blue-50 border-blue-400 text-blue-700'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              🔵 Google Gemini
              <span className="ml-1 text-xs text-green-600 font-normal">(Free tier)</span>
            </button>
            <button
              onClick={() => handleProviderChange('claude')}
              className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                provider === 'claude'
                  ? 'bg-purple-50 border-purple-400 text-purple-700'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              🟣 Claude (Anthropic)
            </button>
          </div>
          {provider === 'gemini' && (
            <p className="text-xs text-gray-400">
              Get a free key at{' '}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-blue-500 underline">
                aistudio.google.com
              </a>{' '}→ Sign in → Get API key
            </p>
          )}
        </div>

        {/* API Key Section */}
        <div>
          <button
            onClick={() => setShowKeyInput(!showKeyInput)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Key className="w-3 h-3" />
            {hasSavedKey
              ? `${provider === 'gemini' ? 'Gemini' : 'Claude'} API key saved ✓`
              : `Set ${provider === 'gemini' ? 'Gemini' : 'Claude'} API key`}
            {showKeyInput ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
          </button>
          {showKeyInput && (
            <div className="mt-2 flex gap-2">
              <div className="flex-1">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  placeholder={provider === 'gemini' ? 'AIza...' : 'sk-ant-...'}
                  value={currentKey}
                  onChange={(e) =>
                    provider === 'gemini' ? setGeminiKey(e.target.value) : setClaudeKey(e.target.value)
                  }
                  className="font-mono text-sm"
                />
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowApiKey(!showApiKey)} className="px-3">
                {showApiKey ? 'Hide' : 'Show'}
              </Button>
              <Button size="sm" onClick={saveApiKey} disabled={!currentKey.trim()}>
                Save
              </Button>
            </div>
          )}
        </div>

        {/* Docs Input */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">API Documentation</Label>
          <Textarea
            value={docs}
            onChange={(e) => setDocs(e.target.value)}
            placeholder={`Paste your API docs here. For example:\n\nGET /api/v1/workorders\nReturns a list of all work orders.\nQuery params: page (integer), status (string: open|closed)\nResponse 200: { data: WorkOrder[], total: integer }\n\nPOST /api/v1/workorders\nCreates a new work order.\nBody: { subject: string, priority: string, assignedTo: integer }\nResponse 201: { id, subject, createdTime }`}
            className="min-h-[180px] text-sm font-mono"
          />
        </div>

        <Button
          onClick={convert}
          disabled={loading || !docs.trim()}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Converting with {provider === 'gemini' ? 'Gemini' : 'Claude'}...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4 mr-2" />
              Convert to OpenAPI YAML
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default DocToYamlConverter;

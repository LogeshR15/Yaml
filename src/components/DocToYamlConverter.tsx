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

const CLAUDE_API_KEY_STORAGE = 'yaml_studio_claude_api_key';

const SYSTEM_PROMPT = `You are an expert at reading API documentation and converting it into valid OpenAPI 3.0.0 YAML specifications.

Rules:
- Always output ONLY valid OpenAPI 3.0.0 YAML — no markdown fences, no explanation text
- Infer path parameters from URL patterns like {id} or :id
- Use appropriate HTTP methods based on the documentation
- Map all request body fields to schema properties with correct types
- Include all response status codes mentioned
- Use descriptive operationId values (camelCase)
- If a base URL is mentioned, include it in servers
- For Zoho APIs, include OAuth2 security scheme if auth is mentioned
- If information is missing, use sensible defaults
- The output must start with "openapi: 3.0.0"`;

const DocToYamlConverter: React.FC<DocToYamlConverterProps> = ({ onYamlGenerated }) => {
  const [docs, setDocs] = useState('');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(CLAUDE_API_KEY_STORAGE) || '');
  const [loading, setLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(!localStorage.getItem(CLAUDE_API_KEY_STORAGE));

  const saveApiKey = () => {
    localStorage.setItem(CLAUDE_API_KEY_STORAGE, apiKey);
    setShowKeyInput(false);
    toast({ title: 'API key saved', description: 'Your Claude API key has been saved locally.' });
  };

  const convert = async () => {
    if (!docs.trim()) {
      toast({ title: 'No content', description: 'Please paste your API documentation first.', variant: 'destructive' });
      return;
    }
    const key = apiKey || localStorage.getItem(CLAUDE_API_KEY_STORAGE);
    if (!key) {
      setShowKeyInput(true);
      toast({ title: 'API key required', description: 'Please enter your Claude API key to use this feature.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: `Convert the following API documentation into a complete OpenAPI 3.0.0 YAML specification:\n\n${docs}`,
            },
          ],
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const generatedYaml = data.content?.[0]?.text?.trim();

      if (!generatedYaml || !generatedYaml.startsWith('openapi:')) {
        throw new Error('Claude did not return valid OpenAPI YAML. Try adding more detail to your docs.');
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
            Powered by Claude AI
          </span>
        </CardTitle>
        <p className="text-sm text-gray-500 mt-1">
          Paste any API documentation — Zoho docs, plain text, markdown — and Claude will generate a complete OpenAPI spec for you.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* API Key Section */}
        <div>
          <button
            onClick={() => setShowKeyInput(!showKeyInput)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Key className="w-3 h-3" />
            {localStorage.getItem(CLAUDE_API_KEY_STORAGE) ? 'Claude API key saved' : 'Set Claude API key'}
            {showKeyInput ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {showKeyInput && (
            <div className="mt-2 flex gap-2">
              <div className="flex-1">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="sk-ant-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowApiKey(!showApiKey)} className="px-3">
                {showApiKey ? 'Hide' : 'Show'}
              </Button>
              <Button size="sm" onClick={saveApiKey} disabled={!apiKey.trim()}>
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
              Converting with Claude...
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

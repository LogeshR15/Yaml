import React, { useEffect, useState } from 'react';
import { Wand2, BookOpen, ChevronRight, LogIn, LogOut } from 'lucide-react';
import KeySetup from '@/components/KeySetup';
import DocsInput from '@/components/DocsInput';
import YamlResult, { downloadYaml, slugifyToolName } from '@/components/YamlResult';
import LoginModal from '@/components/LoginModal';
import { generateYaml, GEMINI_KEY_STORAGE, type GenerateResult } from '@/utils/gemini';
import { ZOHO_PRODUCTS } from '@/utils/constants';
import { useAuth } from '@/utils/AuthContext';

/** sessionStorage key holding a generation pending download across the post-login reload. */
const PENDING_DOWNLOAD_KEY = 'ziaPendingDownload';

const Index: React.FC = () => {
  const { user, loading: authLoading, sdkAvailable, signOut } = useAuth();
  const [apiKey, setApiKey] = useState(localStorage.getItem(GEMINI_KEY_STORAGE) || '');
  const [toolName, setToolName] = useState('');
  const [docs, setDocs] = useState('');
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginOpen, setLoginOpen] = useState(false);

  // After the Catalyst sign-in reload, restore the saved generation and auto-download.
  useEffect(() => {
    if (authLoading || !user) return;
    const raw = sessionStorage.getItem(PENDING_DOWNLOAD_KEY);
    if (!raw) return;
    sessionStorage.removeItem(PENDING_DOWNLOAD_KEY);
    try {
      const pending = JSON.parse(raw) as { result: GenerateResult; toolName: string };
      setResult(pending.result);
      setToolName(pending.toolName);
      if (pending.result?.yaml) {
        downloadYaml(pending.result.yaml, slugifyToolName(pending.toolName));
      }
    } catch {
      // Corrupt payload — ignore; the user can regenerate.
    }
  }, [authLoading, user]);

  // Save the current generation and open the sign-in widget (called from the Download button).
  const handleRequireLogin = () => {
    if (result) {
      sessionStorage.setItem(PENDING_DOWNLOAD_KEY, JSON.stringify({ result, toolName }));
    }
    setLoginOpen(true);
  };

  const handleGenerate = async () => {
    const key = apiKey || localStorage.getItem(GEMINI_KEY_STORAGE);
    if (!key) {
      setError('Please save your Gemini API key first.');
      return;
    }
    if (!docs.trim()) {
      setError('Please paste your API documentation first.');
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const res = await generateYaml(key, docs);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = () => {
    setResult(null);
    handleGenerate();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">ZIA YAML Studio</h2>

          {!authLoading && sdkAvailable && (
            user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">
                  {user.first_name || user.email_id}
                </span>
                <button
                  onClick={signOut}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 border border-gray-300 hover:border-red-300 rounded-lg px-3 py-1.5 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setLoginOpen(true)}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 transition-colors"
              >
                <LogIn className="w-4 h-4" /> Sign in
              </button>
            )
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">

        {/* Hero */}
        <div className="text-center space-y-2 pb-2">
          <h1 className="text-3xl font-bold text-gray-900">
            Zoho API Docs → OpenAPI YAML
          </h1>
          <p className="text-gray-500 max-w-xl mx-auto text-sm">
            Copy any Zoho API documentation page, paste it below, and get a
            ZIA-agent-ready OpenAPI 3.0.1 YAML spec in seconds.
            No developer needed.
          </p>
        </div>

        {/* How it works */}
        <div className="grid grid-cols-3 gap-3 text-center text-xs text-gray-500">
          {[
            { step: '1', label: 'Copy API docs', desc: 'Select all text on a Zoho API docs page and copy' },
            { step: '2', label: 'Paste & Generate', desc: 'Paste here and click Generate — Gemini does the rest' },
            { step: '3', label: 'Use in ZIA Studio', desc: 'Download the YAML and upload it as a custom tool' },
          ].map(({ step, label, desc }) => (
            <div key={step} className="bg-white border border-gray-200 rounded-xl p-4 space-y-1">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mx-auto">
                {step}
              </div>
              <p className="font-semibold text-gray-700">{label}</p>
              <p>{desc}</p>
            </div>
          ))}
        </div>

        {/* API Key Setup */}
        <KeySetup onKeySet={setApiKey} />

        {/* Quick links to Zoho docs */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-semibold text-gray-700">Quick links — Zoho API Documentation</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {ZOHO_PRODUCTS.map(({ name, url }) => (
              <a
                key={name}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 px-3 py-1.5 rounded-full transition-colors"
              >
                {name} <ChevronRight className="w-3 h-3" />
              </a>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Open a page, select all (Ctrl+A / ⌘A), copy, then paste into the box below.
          </p>
        </div>

        {/* Main editor */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Input */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
            <div>
              <label htmlFor="toolName" className="block text-sm font-medium text-gray-700 mb-1">
                Tool Name
              </label>
              <input
                id="toolName"
                type="text"
                value={toolName}
                onChange={(e) => setToolName(e.target.value)}
                placeholder="e.g., zoho-desk-tickets"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-1">Used as the downloaded filename — <code className="bg-gray-100 px-1 rounded">{toolName ? toolName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '') || 'openapi-spec' : 'openapi-spec'}.yaml</code></p>
            </div>
            <DocsInput value={docs} onChange={setDocs} />

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={loading || !docs.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <Wand2 className="w-4 h-4" />
              {loading ? 'Generating...' : 'Generate OpenAPI YAML'}
            </button>
          </div>

          {/* Right: Output */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col">
            <YamlResult
              result={result}
              loading={loading}
              onRegenerate={handleRegenerate}
              toolName={toolName}
              isAuthenticated={!!user}
              sdkAvailable={sdkAvailable}
              onRequireLogin={handleRequireLogin}
            />
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-gray-400 pb-4">
          Generated YAML targets OpenAPI 3.0.1 · Compatible with ZIA Agent Studio custom tools ·
          Uses Google Gemini (your own API key, free tier)
        </p>
      </main>

      <LoginModal
        open={loginOpen}
        sdkAvailable={sdkAvailable}
        onClose={() => {
          setLoginOpen(false);
          sessionStorage.removeItem(PENDING_DOWNLOAD_KEY);
        }}
      />
    </div>
  );
};

export default Index;

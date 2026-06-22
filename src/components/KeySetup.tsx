import React, { useState } from 'react';
import { Key, CheckCircle, ExternalLink, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { GEMINI_KEY_STORAGE } from '@/utils/gemini';

interface KeySetupProps {
  onKeySet: (key: string) => void;
}

const KeySetup: React.FC<KeySetupProps> = ({ onKeySet }) => {
  const saved = localStorage.getItem(GEMINI_KEY_STORAGE) || '';
  const [key, setKey] = useState(saved);
  const [show, setShow] = useState(false);
  const [expanded, setExpanded] = useState(!saved);
  const [saved2, setSaved2] = useState(!!saved);

  const handleSave = () => {
    if (!key.trim()) return;
    localStorage.setItem(GEMINI_KEY_STORAGE, key.trim());
    setSaved2(true);
    setExpanded(false);
    onKeySet(key.trim());
  };

  const handleClear = () => {
    localStorage.removeItem(GEMINI_KEY_STORAGE);
    setKey('');
    setSaved2(false);
    setExpanded(true);
    onKeySet('');
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left"
      >
        {saved2 ? (
          <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
        ) : (
          <Key className="w-4 h-4 text-amber-500 shrink-0" />
        )}
        <span className="text-sm font-medium text-gray-700">
          {saved2 ? 'Gemini API key saved' : 'Set up Gemini API key (free)'}
        </span>
        {saved2 && (
          <span className="ml-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
            Ready
          </span>
        )}
        <ChevronDown
          className={`w-4 h-4 text-gray-400 ml-auto transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="mt-4 space-y-3">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800">
            <p className="font-medium mb-1">Get a free Gemini API key</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-700">
              <li>Go to{' '}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-medium inline-flex items-center gap-0.5"
                >
                  aistudio.google.com/apikey
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>Sign in with your Google account</li>
              <li>Click <strong>Create API key</strong> → copy the key</li>
            </ol>
            <p className="mt-2 text-xs text-blue-600">
              Free tier: 1,500 requests/day · No credit card needed
            </p>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={show ? 'text' : 'password'}
                placeholder="AIza..."
                value={key}
                onChange={(e) => setKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              onClick={handleSave}
              disabled={!key.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Save
            </button>
            {saved2 && (
              <button
                onClick={handleClear}
                className="px-3 py-2 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400">
            Key is stored only in your browser (localStorage) — never sent to our servers.
          </p>
        </div>
      )}
    </div>
  );
};

export default KeySetup;

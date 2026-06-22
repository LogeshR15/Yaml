import React from 'react';
import { ClipboardPaste, X } from 'lucide-react';

interface DocsInputProps {
  value: string;
  onChange: (v: string) => void;
}

const PLACEHOLDER = `Paste Zoho API documentation here.

Example — copy the text from a page like:
https://www.zoho.com/desk/developer/help/api/update-ticket.html

Include as much as you can:
• Endpoint URL and HTTP method
• Query parameters, headers, path parameters
• Request body fields with types and descriptions
• Response format and error codes
• Any OAuth scope names mentioned

The more detail you paste, the better the generated YAML.`;

const DocsInput: React.FC<DocsInputProps> = ({ value, onChange }) => {
  const charCount = value.length;
  const quality =
    charCount === 0 ? null :
    charCount < 200 ? { label: 'Very short — add more detail', color: 'text-red-500' } :
    charCount < 600 ? { label: 'Decent — more detail improves accuracy', color: 'text-amber-500' } :
    { label: 'Good amount of content', color: 'text-green-600' };

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardPaste className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-700">Paste API Documentation</span>
        </div>
        {value && (
          <button
            onClick={() => onChange('')}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={PLACEHOLDER}
        className="flex-1 w-full min-h-[320px] border border-gray-200 rounded-xl p-4 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 placeholder:text-gray-400 placeholder:font-sans"
      />

      <div className="flex items-center justify-between text-xs">
        {quality ? (
          <span className={quality.color}>{quality.label}</span>
        ) : (
          <span className="text-gray-400">Paste API docs from any Zoho developer page</span>
        )}
        <span className="text-gray-400">
          {charCount.toLocaleString()} characters
        </span>
      </div>
    </div>
  );
};

export default DocsInput;

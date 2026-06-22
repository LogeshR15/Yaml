import React from 'react';
import { Zap } from 'lucide-react';

const Navbar: React.FC = () => (
  <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
    <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div>
          <span className="font-bold text-gray-900 text-sm">ZIA YAML Studio</span>
          <span className="ml-2 text-xs text-gray-400 hidden sm:inline">
            API Docs → OpenAPI Spec for ZIA Agents
          </span>
        </div>
      </div>
      <a
        href="https://www.zoho.com/agents/"
        target="_blank"
        rel="noreferrer"
        className="text-xs text-blue-600 hover:underline hidden sm:block"
      >
        About ZIA Agents →
      </a>
    </div>
  </header>
);

export default Navbar;

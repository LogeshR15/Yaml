import React, { useState } from 'react';
import {
  Copy, Download, RefreshCw, CheckCheck,
  AlertTriangle, AlertCircle, Cpu, ExternalLink
} from 'lucide-react';
import type { GenerateResult } from '@/utils/gemini';

interface YamlResultProps {
  result: GenerateResult | null;
  loading: boolean;
  onRegenerate: () => void;
  toolName?: string;
  /** Whether the user is signed in (Catalyst/Zoho). */
  isAuthenticated: boolean;
  /** Whether the Catalyst SDK is present — false in local dev (download ungated). */
  sdkAvailable: boolean;
  /** Called instead of downloading when sign-in is required first. */
  onRequireLogin: (yaml: string, slug: string) => void;
}

/** Turn a tool name into a safe .yaml filename slug. */
export function slugifyToolName(toolName?: string): string {
  return (
    toolName?.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '') ||
    'openapi-spec'
  );
}

/** Trigger a browser download of YAML content as `<slug>.yaml`. */
export function downloadYaml(yaml: string, slug: string): void {
  const blob = new Blob([yaml], { type: 'text/yaml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug}.yaml`;
  a.click();
  URL.revokeObjectURL(url);
}

const YamlResult: React.FC<YamlResultProps> = ({
  result, loading, onRegenerate, toolName, isAuthenticated, sdkAvailable, onRequireLogin,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!result?.yaml) return;
    await navigator.clipboard.writeText(result.yaml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!result?.yaml) return;
    const slug = slugifyToolName(toolName);
    // Gate download behind sign-in, but only when the SDK is actually available
    // (i.e. on the deployed Slate site). In local dev, download is ungated.
    if (sdkAvailable && !isAuthenticated) {
      onRequireLogin(result.yaml, slug);
      return;
    }
    downloadYaml(result.yaml, slug);
  };

  const openInSwaggerEditor = () => {
    if (!result?.yaml) return;
    // Swagger editor can load YAML via URL-encoded content
    const encoded = encodeURIComponent(result.yaml);
    window.open(`https://editor.swagger.io/?url=data:text/yaml,${encoded}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[320px] gap-4 border border-gray-200 rounded-xl bg-gray-50">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
          <Cpu className="w-5 h-5 text-blue-600 absolute inset-0 m-auto" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">Generating OpenAPI spec...</p>
          <p className="text-xs text-gray-400 mt-1">Gemini is reading your API docs</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[320px] gap-3 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
        <div className="text-5xl">📄</div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-600">Your OpenAPI YAML will appear here</p>
          <p className="text-xs text-gray-400 mt-1">Paste API docs and click Generate</p>
        </div>
      </div>
    );
  }

  const { yaml, modelUsed, validation } = result;
  const hasErrors = validation.errors.length > 0;
  const hasWarnings = validation.warnings.length > 0;

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">Generated OpenAPI YAML</span>
          {!hasErrors && (
            <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
              ✓ Valid
            </span>
          )}
          {hasErrors && (
            <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              ⚠ Review suggested
            </span>
          )}
        </div>
        {modelUsed && (
          <span className="text-xs text-gray-400">via {modelUsed}</span>
        )}
      </div>

      {/* Validation issues — shown as soft warning, not a blocker */}
      {hasErrors && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-amber-700 text-xs font-semibold">
              <AlertCircle className="w-3.5 h-3.5" />
              Possible issues detected — YAML is shown below, you can still copy/download
            </div>
          </div>
          {validation.errors.slice(0, 2).map((e, i) => (
            <p key={i} className="text-xs text-amber-700 pl-5">• {e}</p>
          ))}
          <p className="text-xs text-amber-600 pl-5 pt-1">
            Try <strong>Regenerate</strong> for a cleaner output, or validate in{' '}
            <button onClick={openInSwaggerEditor} className="underline">Swagger Editor</button>.
          </p>
        </div>
      )}

      {/* Structural warnings */}
      {hasWarnings && !hasErrors && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-blue-700 text-xs font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            Suggestions for better ZIA compatibility
          </div>
          {validation.warnings.slice(0, 2).map((w, i) => (
            <p key={i} className="text-xs text-blue-700 pl-5">• {w}</p>
          ))}
        </div>
      )}

      {/* YAML Output — always visible */}
      <div className="relative flex-1 min-h-[260px]">
        <pre className="h-full overflow-auto bg-gray-900 text-gray-100 rounded-xl p-4 text-xs leading-relaxed font-mono whitespace-pre">
          {yaml}
        </pre>
      </div>

      {/* Actions — always available */}
      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {copied
            ? <><CheckCheck className="w-4 h-4 text-green-600" /> Copied!</>
            : <><Copy className="w-4 h-4" /> Copy YAML</>}
        </button>
        <button
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Download className="w-4 h-4" /> Download .yaml
        </button>
        <button
          onClick={openInSwaggerEditor}
          title="Validate in Swagger Editor"
          className="px-3 py-2.5 rounded-lg border border-gray-300 text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
        <button
          onClick={onRegenerate}
          title="Regenerate"
          className="px-3 py-2.5 rounded-lg border border-gray-300 text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default YamlResult;

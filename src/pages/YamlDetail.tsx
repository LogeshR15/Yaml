import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Copy, Download, CheckCheck, Calendar, User } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { getYaml, downloadYaml, type YamlSpecFull } from '@/utils/api';

const YamlDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [spec, setSpec] = useState<YamlSpecFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    getYaml(id)
      .then(res => setSpec(res.data))
      .catch(() => setError('Spec not found or unavailable.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleCopy = async () => {
    if (!spec?.yaml_content) return;
    await navigator.clipboard.writeText(spec.yaml_content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    if (!id || !spec) return;
    const res = await downloadYaml(id);
    const slug =
      spec.tool_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '') || 'openapi-spec';
    const blob = new Blob([res.data.yaml_content], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const date = spec
    ? new Date(spec.CREATEDTIME.replace(' ', 'T')).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-5">

        <Link
          to="/marketplace"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Marketplace
        </Link>

        {loading && (
          <div className="bg-white border border-gray-200 rounded-xl p-8 animate-pulse space-y-4">
            <div className="h-6 bg-gray-100 rounded w-1/2" />
            <div className="h-4 bg-gray-100 rounded w-1/4" />
            <div className="h-64 bg-gray-100 rounded" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {spec && (
          <>
            {/* Metadata card */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{spec.tool_name}</h1>
                  {spec.product_name && (
                    <span className="inline-block mt-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">
                      {spec.product_name}
                    </span>
                  )}
                </div>
                <div className="text-right text-xs text-gray-400 space-y-1 shrink-0">
                  <div className="flex items-center gap-1 justify-end">
                    <User className="w-3 h-3" /> {spec.creator_name}
                  </div>
                  <div className="flex items-center gap-1 justify-end">
                    <Calendar className="w-3 h-3" /> {date}
                  </div>
                  <div className="flex items-center gap-1 justify-end">
                    <Download className="w-3 h-3" /> {spec.download_count ?? 0} downloads
                  </div>
                </div>
              </div>

              {spec.description && (
                <p className="text-sm text-gray-600 leading-relaxed">{spec.description}</p>
              )}

              {spec.tags && (
                <div className="flex flex-wrap gap-1">
                  {spec.tags
                    .split(',')
                    .map(t => t.trim())
                    .filter(Boolean)
                    .map(tag => (
                      <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                </div>
              )}
            </div>

            {/* YAML preview */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">OpenAPI YAML</span>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {copied
                      ? <><CheckCheck className="w-3.5 h-3.5 text-green-600" /> Copied</>
                      : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Download .yaml
                  </button>
                </div>
              </div>
              <pre className="overflow-auto bg-gray-900 text-gray-100 rounded-xl p-4 text-xs leading-relaxed font-mono whitespace-pre max-h-[500px]">
                {spec.yaml_content}
              </pre>
            </div>
          </>
        )}

      </main>
    </div>
  );
};

export default YamlDetail;

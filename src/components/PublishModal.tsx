import React, { useState } from 'react';
import { X, Upload, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/utils/AuthContext';
import { publishYaml } from '@/utils/api';
import { PRODUCT_NAMES } from '@/utils/constants';

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  toolName: string;
  yamlContent: string;
}

const PublishModal: React.FC<PublishModalProps> = ({ isOpen, onClose, toolName, yamlContent }) => {
  const { user } = useAuth();
  const [form, setForm] = useState({
    tool_name: toolName,
    product_name: '',
    description: '',
    tags: '',
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const isTooBig = yamlContent.length > 60000;

  const update = (field: string, value: string) =>
    setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.tool_name.trim() || !yamlContent) return;
    setLoading(true);
    try {
      const result = await publishYaml({
        tool_name: form.tool_name.trim(),
        product_name: form.product_name,
        description: form.description.trim(),
        yaml_content: yamlContent,
        tags: form.tags.trim(),
      });
      toast.success('Published to marketplace!', {
        action: {
          label: 'View',
          onClick: () => window.open(`/marketplace/${result.data.ROWID}`, '_blank'),
        },
      });
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Publish failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">Publish to Marketplace</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!user ? (
          <div className="text-center py-8 space-y-3">
            <LogIn className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="text-sm text-gray-600">
              Sign in with your Zoho account to publish YAMLs to the marketplace.
            </p>
            <Link
              to="/login"
              onClick={onClose}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
            >
              Sign in with Zoho
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {isTooBig && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
                YAML is too large to publish ({yamlContent.length.toLocaleString()} chars).
                Marketplace limit is 60,000 characters.
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tool Name *</label>
              <input
                value={form.tool_name}
                onChange={e => update('tool_name', e.target.value)}
                placeholder="e.g., zoho-desk-tickets"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Zoho Product</label>
              <select
                value={form.product_name}
                onChange={e => update('product_name', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a product…</option>
                {PRODUCT_NAMES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={e => update('description', e.target.value)}
                placeholder="What does this YAML spec cover?"
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Tags <span className="text-gray-400 font-normal">(comma-separated)</span>
              </label>
              <input
                value={form.tags}
                onChange={e => update('tags', e.target.value)}
                placeholder="e.g., tickets, support, desk"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || isTooBig || !form.tool_name.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Upload className="w-4 h-4" />
                {loading ? 'Publishing…' : 'Publish'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default PublishModal;

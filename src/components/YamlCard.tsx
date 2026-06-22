import React from 'react';
import { Link } from 'react-router-dom';
import { Download, Calendar, User } from 'lucide-react';
import type { YamlSpec } from '@/utils/api';

interface YamlCardProps {
  spec: YamlSpec;
}

const YamlCard: React.FC<YamlCardProps> = ({ spec }) => {
  const date = new Date(spec.CREATEDTIME.replace(' ', 'T')).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-3 hover:border-blue-300 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm leading-tight">{spec.tool_name}</h3>
          {spec.product_name && (
            <span className="inline-block mt-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">
              {spec.product_name}
            </span>
          )}
        </div>
      </div>

      {spec.description && (
        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{spec.description}</p>
      )}

      {spec.tags && (
        <div className="flex flex-wrap gap-1">
          {spec.tags
            .split(',')
            .map(t => t.trim())
            .filter(Boolean)
            .slice(0, 4)
            .map(tag => (
              <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                {tag}
              </span>
            ))}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-400 mt-auto pt-2 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {spec.creator_name}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {date}
          </span>
        </div>
        <span className="flex items-center gap-1">
          <Download className="w-3 h-3" />
          {spec.download_count ?? 0}
        </span>
      </div>

      <Link
        to={`/marketplace/${spec.ROWID}`}
        className="block text-center py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        View & Download
      </Link>
    </div>
  );
};

export default YamlCard;

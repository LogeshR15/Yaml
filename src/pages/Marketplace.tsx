import React, { useState, useEffect, useCallback } from 'react';
import { Search, Store } from 'lucide-react';
import Navbar from '@/components/Navbar';
import YamlCard from '@/components/YamlCard';
import { listYamls, type YamlSpec } from '@/utils/api';
import { PRODUCT_NAMES } from '@/utils/constants';

const Marketplace: React.FC = () => {
  const [search, setSearch] = useState('');
  const [product, setProduct] = useState('');
  const [page, setPage] = useState(0);
  const [specs, setSpecs] = useState<YamlSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');

  const fetchSpecs = useCallback(async (q: string, prod: string, pg: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await listYamls({ search: q, product: prod, page: pg });
      if (pg === 0) setSpecs(res.data);
      else setSpecs(prev => [...prev, ...res.data]);
      setHasMore(res.data.length === res.pageSize);
    } catch {
      setError('Failed to load marketplace. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      fetchSpecs(search, product, 0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, product, fetchSpecs]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchSpecs(search, product, next);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">

        <div className="text-center space-y-2 pb-2">
          <h1 className="text-3xl font-bold text-gray-900">YAML Marketplace</h1>
          <p className="text-gray-500 max-w-xl mx-auto text-sm">
            Browse community-generated OpenAPI specs for Zoho APIs.
            Find, download, and use them directly in ZIA Agent Studio.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by tool name, description, or tags…"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          <select
            value={product}
            onChange={e => setProduct(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">All Products</option>
            {PRODUCT_NAMES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Skeleton placeholders while loading first page */}
        {loading && specs.length === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse space-y-3">
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/3" />
                <div className="h-8 bg-gray-100 rounded" />
                <div className="h-8 bg-gray-100 rounded mt-4" />
              </div>
            ))}
          </div>
        )}

        {!loading && specs.length === 0 && !error && (
          <div className="text-center py-16 space-y-3">
            <Store className="w-12 h-12 text-gray-300 mx-auto" />
            <p className="text-gray-500 font-medium">No specs found</p>
            <p className="text-sm text-gray-400">
              {search || product
                ? 'Try a different search or filter.'
                : 'Be the first to generate and publish a YAML spec!'}
            </p>
          </div>
        )}

        {specs.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {specs.map(spec => <YamlCard key={spec.ROWID} spec={spec} />)}
          </div>
        )}

        {hasMore && !loading && (
          <div className="text-center">
            <button
              onClick={loadMore}
              className="px-6 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Load more
            </button>
          </div>
        )}

        {loading && specs.length > 0 && (
          <div className="text-center text-sm text-gray-400 py-4">Loading…</div>
        )}

      </main>
    </div>
  );
};

export default Marketplace;

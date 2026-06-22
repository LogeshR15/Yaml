const BASE = (import.meta.env.VITE_API_BASE as string) || '/server/yaml_api';

export interface YamlSpec {
  ROWID: string;
  tool_name: string;
  product_name: string;
  description: string;
  creator_name: string;
  creator_id: string;
  download_count: number;
  tags: string;
  CREATEDTIME: string;
}

export interface YamlSpecFull extends YamlSpec {
  yaml_content: string;
}

export async function listYamls(params: {
  search?: string;
  product?: string;
  page?: number;
}): Promise<{ data: YamlSpec[]; page: number; pageSize: number }> {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.product) query.set('product', params.product);
  if (params.page !== undefined) query.set('page', String(params.page));
  const res = await fetch(`${BASE}/yamls?${query}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch specs');
  return res.json();
}

export async function getYaml(id: string): Promise<{ data: YamlSpecFull }> {
  const res = await fetch(`${BASE}/yamls/${id}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Spec not found');
  return res.json();
}

export async function publishYaml(payload: {
  tool_name: string;
  product_name: string;
  description: string;
  yaml_content: string;
  tags: string;
}): Promise<{ data: { ROWID: string } }> {
  const res = await fetch(`${BASE}/yamls`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Publish failed' }));
    throw new Error(err.error || 'Publish failed');
  }
  return res.json();
}

export async function downloadYaml(id: string): Promise<{ data: { yaml_content: string } }> {
  const res = await fetch(`${BASE}/yamls/${id}/download`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Download failed');
  return res.json();
}

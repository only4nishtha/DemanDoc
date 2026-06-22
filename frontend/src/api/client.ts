const BASE_URL = 'http://localhost:8000/api';

export async function fetchKpis(params: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE_URL}/kpis?${query}`);
  if (!res.ok) throw new Error('Failed to fetch KPIs');
  return res.json();
}

export async function fetchTrend(params: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE_URL}/sales/trend?${query}`);
  if (!res.ok) throw new Error('Failed to fetch sales trend');
  return res.json();
}

export async function fetchForecast(params: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE_URL}/forecast?${query}`);
  if (!res.ok) throw new Error('Failed to fetch forecast');
  return res.json();
}

export async function fetchPromotions(params: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE_URL}/promotions?${query}`);
  if (!res.ok) throw new Error('Failed to fetch promotions');
  return res.json();
}

export async function fetchRootCause(params: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE_URL}/root-cause?${query}`);
  if (!res.ok) throw new Error('Failed to fetch root cause');
  return res.json();
}

export async function fetchTopProducts(params: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE_URL}/top-products?${query}`);
  if (!res.ok) throw new Error('Failed to fetch top products');
  return res.json();
}

export async function fetchTreemap(params: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE_URL}/treemap?${query}`);
  if (!res.ok) throw new Error('Failed to fetch treemap');
  return res.json();
}

export async function fetchScenario(params: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE_URL}/scenario?${query}`);
  if (!res.ok) throw new Error('Failed to fetch scenario');
  return res.json();
}

export async function fetchGeo(params: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE_URL}/geo?${query}`);
  if (!res.ok) throw new Error('Failed to fetch geo');
  return res.json();
}

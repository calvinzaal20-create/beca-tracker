/**
 * API Client
 * Centraliseert alle HTTP-aanroepen naar de backend.
 */

const BASE_URL = process.env.REACT_APP_API_URL || '';
const SECRET = process.env.REACT_APP_DASHBOARD_SECRET || '';

async function apiFetch(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(SECRET ? { Authorization: `Bearer ${SECRET}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  getVisitors: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/api/dashboard/visitors?${qs}`);
  },

  getVisitor: (id) => apiFetch(`/api/dashboard/visitors/${id}`),

  getStats: (days = 30) => apiFetch(`/api/dashboard/stats?days=${days}`),

  getAlerts: (limit = 20) => apiFetch(`/api/dashboard/alerts?limit=${limit}`),
};

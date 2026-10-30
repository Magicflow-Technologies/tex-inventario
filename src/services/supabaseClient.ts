/**
 * Cliente REST nativo para Supabase Autoalojado (VPS)
 * URL: https://mqsupabase.dashbportal.com
 * Esquema PostgreSQL: ochotex_bd
 */

const DEFAULT_URL = 'https://mqsupabase.dashbportal.com';
const DEFAULT_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NzI4MzgyOTAsImV4cCI6MjA4ODE5ODI5MH0.8RNTAxEa4hkmAbXD5u01S2AbB0hMM144OW66fQQO8fM';
const DEFAULT_SCHEMA = 'ochotex_bd';

export const SUPABASE_CONFIG = {
  url:
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
    (typeof process !== 'undefined' && process.env?.SUPABASE_URL) ||
    DEFAULT_URL,
  key:
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_KEY) ||
    (typeof process !== 'undefined' && process.env?.SUPABASE_SERVICE_ROLE_KEY) ||
    DEFAULT_KEY,
  schema:
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_SCHEMA) ||
    (typeof process !== 'undefined' && process.env?.SUPABASE_SCHEMA) ||
    DEFAULT_SCHEMA,
};

function getHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    apikey: SUPABASE_CONFIG.key,
    Authorization: `Bearer ${SUPABASE_CONFIG.key}`,
    'Accept-Profile': SUPABASE_CONFIG.schema,
    'Content-Profile': SUPABASE_CONFIG.schema,
    'Content-Type': 'application/json',
    ...extra,
  };
}

export const supabaseRest = {
  async select<T>(table: string, query = 'select=*'): Promise<T[]> {
    const res = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/${table}?${query}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Error Supabase SELECT ${table}: ${res.status} ${errText}`);
    }
    return res.json();
  },

  async insert<T>(table: string, payload: unknown, upsert = false): Promise<T[]> {
    const prefer = upsert
      ? 'return=representation,resolution=merge-duplicates'
      : 'return=representation';
    const res = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/${table}`, {
      method: 'POST',
      headers: getHeaders({ Prefer: prefer }),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Error Supabase INSERT ${table}: ${res.status} ${errText}`);
    }
    return res.json();
  },

  async update<T>(table: string, filterQuery: string, payload: unknown): Promise<T[]> {
    const res = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/${table}?${filterQuery}`, {
      method: 'PATCH',
      headers: getHeaders({ Prefer: 'return=representation' }),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Error Supabase UPDATE ${table}: ${res.status} ${errText}`);
    }
    return res.json();
  },

  async remove(table: string, filterQuery: string): Promise<void> {
    const res = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/${table}?${filterQuery}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Error Supabase DELETE ${table}: ${res.status} ${errText}`);
    }
  },
};

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_PUBLIC_SUPABASE_URL) as string | undefined
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export class SupabaseNotConfiguredError extends Error {
  constructor() { super('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.') }
}

export async function supabaseRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new SupabaseNotConfiguredError()
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...init.headers,
    },
  })
  if (!response.ok) throw new Error(await response.text() || 'Supabase request failed')
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

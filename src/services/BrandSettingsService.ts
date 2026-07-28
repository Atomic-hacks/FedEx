import { supabaseRequest } from '../lib/supabase-rest'
import type { BrandSettings } from '../types/BrandSettings'

export const BrandSettingsService = {
  async get() { const rows = await supabaseRequest<BrandSettings[]>('brand_settings?select=*&limit=1'); return rows[0] ?? null },
  async save(settings: Partial<BrandSettings>) {
    const existing = await this.get()
    const rows = existing
      ? await supabaseRequest<BrandSettings[]>(`brand_settings?id=eq.${existing.id}`, { method: 'PATCH', body: JSON.stringify(settings) })
      : await supabaseRequest<BrandSettings[]>('brand_settings', { method: 'POST', body: JSON.stringify(settings) })
    return rows[0]
  },
}

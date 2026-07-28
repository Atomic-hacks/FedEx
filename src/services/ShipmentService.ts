import { supabaseRequest } from '../lib/supabase-rest'
import type { Shipment, ShipmentDetails, ShipmentItem, ShipmentStatus, TrackingEvent } from '../types/domain'

export const ShipmentService = {
  async list(filters: { status?: ShipmentStatus; destination?: string; search?: string } = {}) {
    const query = new URLSearchParams({ select: '*', order: 'updated_at.desc', is_archived: 'eq.false' })
    if (filters.status) query.set('status', `eq.${filters.status}`)
    if (filters.destination) query.set('destination_city', `ilike.*${filters.destination}*`)
    if (filters.search) query.set('tracking_number', `ilike.*${filters.search}*`)
    return supabaseRequest<Shipment[]>(`shipments?${query}`)
  },
  async create(shipment: Omit<Shipment, 'id' | 'created_at' | 'updated_at'>) {
    const records = await supabaseRequest<Shipment[]>('shipments', { method: 'POST', body: JSON.stringify(shipment) })
    return records[0]
  },
  async update(id: string, changes: Partial<Shipment>) {
    const records = await supabaseRequest<Shipment[]>(`shipments?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(changes) })
    return records[0]
  },
  delete(id: string) { return supabaseRequest<void>(`shipments?id=eq.${id}`, { method: 'DELETE' }) },
  archive(id: string) { return this.update(id, { is_archived: true }) },
  async addEvent(event: Omit<TrackingEvent, 'id' | 'created_at'>) {
    const records = await supabaseRequest<TrackingEvent[]>('tracking_events', { method: 'POST', body: JSON.stringify(event) })
    return records[0]
  },
  async addItems(items: Omit<ShipmentItem, 'id' | 'created_at'>[]) {
    if (!items.length) return []
    return supabaseRequest<ShipmentItem[]>('shipment_items', { method: 'POST', body: JSON.stringify(items) })
  },
  async byTrackingNumber(trackingNumber: string) {
    const result = await supabaseRequest<ShipmentDetails | null>('rpc/get_tracking_shipment', { method: 'POST', body: JSON.stringify({ input_tracking_number: trackingNumber }) })
    return result
  },
  async adminByTrackingNumber(trackingNumber: string) {
    const rows = await supabaseRequest<Shipment[]>(`shipments?select=*&tracking_number=eq.${encodeURIComponent(trackingNumber)}&limit=1`)
    return rows[0] ?? null
  },
}

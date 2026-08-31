-- Add ship_date and expected_delivery_date to shipments
alter table public.shipments add column if not exists ship_date timestamptz;
alter table public.shipments add column if not exists expected_delivery_date timestamptz;

-- Update RPC that builds shipment JSON (recreate function from schema.sql to include new fields if necessary)
create or replace function public.get_tracking_shipment(input_tracking_number text) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', s.id, 'tracking_number', s.tracking_number, 'status', s.status, 'current_location', s.current_location,
    'estimated_delivery', s.estimated_delivery, 'ship_date', s.ship_date, 'expected_delivery_date', s.expected_delivery_date, 'origin_city', s.origin_city, 'origin_country', s.origin_country,
    'destination_city', s.destination_city, 'destination_country', s.destination_country, 'shipment_type', s.shipment_type, 'carrier', s.carrier, 'reference_number', s.reference_number, 'notes', s.notes,
    'weight', s.weight, 'proof_image_url', s.proof_image_url, 'is_archived', s.is_archived,
    'created_at', s.created_at, 'updated_at', s.updated_at,
    'tracking_events', coalesce((select jsonb_agg(jsonb_build_object(
      'id', e.id, 'shipment_id', e.shipment_id, 'title', e.title, 'description', e.description,
      'city', e.city, 'country', e.country, 'occurred_at', e.occurred_at, 'created_at', e.created_at
    ) order by e.occurred_at desc) from public.tracking_events e where e.shipment_id = s.id), '[]'::jsonb),
    'shipment_items', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'shipment_id', i.shipment_id, 'name', i.name, 'quantity', i.quantity, 'created_at', i.created_at)) from public.shipment_items i where i.shipment_id = s.id), '[]'::jsonb)
  ) from public.shipments s where s.tracking_number = upper(trim(input_tracking_number)) and not s.is_archived limit 1;
$$;
grant execute on function public.get_tracking_shipment(text) to anon, authenticated;

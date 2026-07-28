-- Allows a customer using the existing secure support token to read their conversation,
-- including replies posted from the admin inbox.
create or replace function public.get_public_messages(input_tracking_number text, input_token uuid) returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at asc), '[]'::jsonb)
  from public.messages m
  join public.conversations c on c.id = m.conversation_id
  join public.shipments s on s.id = c.shipment_id
  where s.tracking_number = upper(trim(input_tracking_number)) and c.public_token = input_token;
$$;
grant execute on function public.get_public_messages(text, uuid) to anon, authenticated;

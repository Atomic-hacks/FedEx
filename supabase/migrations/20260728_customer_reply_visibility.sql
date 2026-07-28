-- Lets a customer read only the messages in the conversation identified by
-- their tracking number and private support token. This includes admin replies.
create or replace function public.get_public_conversation(input_tracking_number text, input_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', c.id,
    'shipment_id', c.shipment_id,
    'visitor_name', c.visitor_name,
    'visitor_email', c.visitor_email,
    'public_token', c.public_token,
    'last_message_at', c.last_message_at,
    'admin_unread_count', c.admin_unread_count,
    'created_at', c.created_at
  )
  from public.conversations c
  join public.shipments s on s.id = c.shipment_id
  where s.tracking_number = upper(trim(input_tracking_number))
    and c.public_token = input_token
  limit 1;
$$;

create or replace function public.get_public_messages(input_tracking_number text, input_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at asc), '[]'::jsonb)
  from public.messages m
  join public.conversations c on c.id = m.conversation_id
  join public.shipments s on s.id = c.shipment_id
  where s.tracking_number = upper(trim(input_tracking_number))
    and c.public_token = input_token;
$$;

grant execute on function public.get_public_conversation(text, uuid) to anon, authenticated;
grant execute on function public.get_public_messages(text, uuid) to anon, authenticated;

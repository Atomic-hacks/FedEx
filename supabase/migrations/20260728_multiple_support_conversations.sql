-- Allow each customer contact to create its own secure support conversation for a shipment.
alter table public.conversations drop constraint if exists conversations_shipment_id_key;
create index if not exists conversations_shipment_idx on public.conversations(shipment_id);

create or replace function public.start_support_conversation(input_tracking_number text, input_visitor_name text, input_visitor_email text, input_body text) returns jsonb language plpgsql security definer set search_path = public as $$
declare shipment_uuid uuid; conversation_uuid uuid; conversation_token uuid;
begin
  select id into shipment_uuid from public.shipments where tracking_number = upper(trim(input_tracking_number)) and not is_archived;
  if shipment_uuid is null then raise exception 'Tracking number not found'; end if;
  insert into public.conversations (shipment_id, visitor_name, visitor_email)
  values (shipment_uuid, trim(input_visitor_name), lower(trim(input_visitor_email)))
  returning id, public_token into conversation_uuid, conversation_token;
  insert into public.messages (conversation_id, body, sender_type) values (conversation_uuid, trim(input_body), 'customer');
  return jsonb_build_object('id', conversation_uuid, 'public_token', conversation_token);
end;
$$;
grant execute on function public.start_support_conversation(text, text, text, text) to anon, authenticated;

-- Run in the Supabase SQL editor. Keep service-role-only actions in your server/API layer.
create extension if not exists pgcrypto;
create type public.shipment_status as enum ('created', 'picked_up', 'in_transit', 'at_facility', 'out_for_delivery', 'delivered', 'delayed', 'exception');
create type public.message_sender as enum ('customer', 'admin');

create table public.admins (id uuid primary key references auth.users(id) on delete cascade, full_name text, created_at timestamptz not null default now());
create table public.shipments (
  id uuid primary key default gen_random_uuid(), tracking_number text not null unique,
  customer_name text, customer_email text, status public.shipment_status not null default 'created', current_location text,
  estimated_delivery timestamptz, origin_city text not null, origin_country text not null, destination_city text not null,
  destination_country text not null, shipment_type text not null, carrier text, reference_number text, notes text, weight numeric, proof_image_url text,
  is_archived boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.tracking_events (
  id uuid primary key default gen_random_uuid(), shipment_id uuid not null references public.shipments(id) on delete cascade,
  title text not null, description text, city text not null, country text not null, occurred_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create table public.shipment_items (
  id uuid primary key default gen_random_uuid(), shipment_id uuid not null references public.shipments(id) on delete cascade,
  name text not null, quantity integer not null default 1 check (quantity > 0), created_at timestamptz not null default now()
);
create table public.conversations (
  id uuid primary key default gen_random_uuid(), shipment_id uuid not null references public.shipments(id) on delete cascade,
  visitor_name text not null, visitor_email text not null, public_token uuid not null unique default gen_random_uuid(),
  last_message_at timestamptz not null default now(), admin_unread_count integer not null default 0, created_at timestamptz not null default now()
);
create table public.messages (
  id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.conversations(id) on delete cascade,
  body text not null check (char_length(body) <= 5000), sender_type public.message_sender not null, read_at timestamptz, created_at timestamptz not null default now()
);
create table public.brand_settings (
  id uuid primary key default gen_random_uuid(), company_name text not null default 'FedEx Express', logo_url text,
  header_banner_url text, primary_color text not null default '#4d148c', secondary_color text not null default '#ff6200',
  footer_background_color text not null default '#30105a', support_email text, company_address text, company_phone text,
  website_url text, facebook_url text, instagram_url text, twitter_url text, footer_copyright text, updated_at timestamptz not null default now()
);

create index shipments_tracking_number_idx on public.shipments(tracking_number);
create index tracking_events_shipment_time_idx on public.tracking_events(shipment_id, occurred_at desc);
create index shipment_items_shipment_idx on public.shipment_items(shipment_id);
create index conversations_shipment_idx on public.conversations(shipment_id);
create index messages_conversation_time_idx on public.messages(conversation_id, created_at);

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where id = auth.uid());
$$;
create or replace function public.get_tracking_shipment(input_tracking_number text) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', s.id, 'tracking_number', s.tracking_number, 'status', s.status, 'current_location', s.current_location,
    'estimated_delivery', s.estimated_delivery, 'origin_city', s.origin_city, 'origin_country', s.origin_country,
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
create or replace function public.verify_tracking_email(input_tracking_number text, input_email text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.shipments where tracking_number = upper(trim(input_tracking_number)) and lower(customer_email) = lower(trim(input_email)) and not is_archived);
$$;
grant execute on function public.verify_tracking_email(text, text) to anon, authenticated;
create or replace function public.start_support_conversation(input_tracking_number text, input_visitor_name text, input_visitor_email text, input_body text) returns jsonb language plpgsql security definer set search_path = public as $$
declare shipment_uuid uuid; conversation_uuid uuid; conversation_token uuid;
begin
  select id into shipment_uuid from public.shipments where tracking_number = upper(trim(input_tracking_number)) and not is_archived;
  if shipment_uuid is null then raise exception 'Tracking number not found'; end if;
  insert into public.conversations (shipment_id, visitor_name, visitor_email) values (shipment_uuid, trim(input_visitor_name), lower(trim(input_visitor_email))) returning id, public_token into conversation_uuid, conversation_token;
  insert into public.messages (conversation_id, body, sender_type) values (conversation_uuid, trim(input_body), 'customer');
  return jsonb_build_object('id', conversation_uuid, 'public_token', conversation_token);
end;
$$;
grant execute on function public.start_support_conversation(text, text, text, text) to anon, authenticated;
create or replace function public.get_public_conversation(input_tracking_number text, input_token uuid) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', c.id, 'shipment_id', c.shipment_id, 'visitor_name', c.visitor_name, 'visitor_email', c.visitor_email, 'public_token', c.public_token, 'last_message_at', c.last_message_at, 'admin_unread_count', c.admin_unread_count, 'created_at', c.created_at)
  from public.conversations c join public.shipments s on s.id = c.shipment_id
  where s.tracking_number = upper(trim(input_tracking_number)) and c.public_token = input_token limit 1;
$$;
create or replace function public.get_public_messages(input_tracking_number text, input_token uuid) returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at asc), '[]'::jsonb)
  from public.messages m
  join public.conversations c on c.id = m.conversation_id
  join public.shipments s on s.id = c.shipment_id
  where s.tracking_number = upper(trim(input_tracking_number)) and c.public_token = input_token;
$$;
create or replace function public.send_public_message(input_tracking_number text, input_token uuid, input_body text) returns jsonb language plpgsql security definer set search_path = public as $$
declare conversation_uuid uuid; result jsonb;
begin
  select c.id into conversation_uuid from public.conversations c join public.shipments s on s.id = c.shipment_id where s.tracking_number = upper(trim(input_tracking_number)) and c.public_token = input_token;
  if conversation_uuid is null then raise exception 'Invalid support link'; end if;
  insert into public.messages (conversation_id, body, sender_type) values (conversation_uuid, trim(input_body), 'customer') returning to_jsonb(messages.*) into result;
  update public.conversations set last_message_at = now(), admin_unread_count = admin_unread_count + 1 where id = conversation_uuid;
  return result;
end;
$$;
grant execute on function public.get_public_conversation(text, uuid) to anon, authenticated;
grant execute on function public.get_public_messages(text, uuid) to anon, authenticated;
grant execute on function public.send_public_message(text, uuid, text) to anon, authenticated;
create or replace function public.touch_shipment() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create trigger shipments_touch before update on public.shipments for each row execute function public.touch_shipment();

alter publication supabase_realtime add table public.shipments, public.shipment_items, public.tracking_events, public.conversations, public.messages;

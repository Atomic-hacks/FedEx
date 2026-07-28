# FedEx-style shipment tracking portal

A React/Vite customer tracking portal with a FedEx-inspired visual language. It includes a public tracking experience, token-ready support route, and an admin portal shell. Shipment reads use typed Supabase REST services; no shipment records are bundled in the client.

## Setup

1. Copy `.env.example` to `.env` and enter your Supabase URL and anon key.
2. Run [supabase/schema.sql](supabase/schema.sql) in the Supabase SQL editor.

For an existing project that previously used email updates, run [the email-service removal migration](supabase/migrations/20260728_remove_email_service.sql). It preserves historic rows but removes them from public tracking responses.

The SQL schema enables Realtime for shipments, tracking events, conversations, and messages. Public support messages should go through a token-validating RPC or Edge Function, so a tracking number never grants access to another customer’s conversation.

## Admin shipment flow

Use `/admin/shipments/new` to create a shipment, then `/admin/shipments` to open its workspace. “Publish visible update” adds an event to that shipment’s public tracking timeline.

Customer conversations are handled at `/admin/messages`. Run [the support inbox migration](supabase/migrations/20260728_support_inbox.sql) to allow customers using their secure support link to read admin replies.
Run [the multiple-conversations migration](supabase/migrations/20260728_multiple_support_conversations.sql) to let a shipment receive more than one independent customer conversation.

If you ran an earlier schema version and receive a row-level-security error while creating a shipment, run [supabase/disable-rls.sql](supabase/disable-rls.sql) once in the SQL editor.

> Security: the supplied `disable-rls.sql` deliberately leaves the hidden `/admin` client route unauthenticated. Restrict access at your hosting layer or add Supabase Auth/RLS before exposing this portal publicly.

## Source layout

- `src/services` — shipment, tracking, message, and email business services
- `src/lib` — low-level Supabase REST client
- `src/types` — shared domain types
- `supabase/schema.sql` — schema, RLS baseline, indexes, and realtime publication
# FedEx

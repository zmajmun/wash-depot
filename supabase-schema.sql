-- Wash Depot — Supabase schema
-- Single shared app state, server-mediated via Next.js API routes.
-- Service role key bypasses RLS, so the API enforces auth via Clerk.

create table if not exists app_state (
  id text primary key default 'global',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text
);

insert into app_state (id, data)
values ('global', '{}'::jsonb)
on conflict (id) do nothing;

-- Audit log of writes (handy for "who changed what")
create table if not exists app_state_history (
  id bigserial primary key,
  data jsonb not null,
  written_at timestamptz not null default now(),
  written_by text
);

create index if not exists app_state_history_written_at_idx on app_state_history(written_at desc);

-- Lock the table from anonymous/public access. The API uses the service role key.
alter table app_state enable row level security;
alter table app_state_history enable row level security;

-- collab-docs schema
-- run inside Supabase SQL editor (or via supabase db push if you use the CLI)

create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  title text not null default 'Untitled',
  content_json jsonb not null default '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists documents_owner_idx on documents(owner_id);
create index if not exists documents_updated_idx on documents(updated_at desc);

create table if not exists shares (
  document_id uuid not null references documents(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('viewer','editor')),
  created_at timestamptz not null default now(),
  primary key (document_id, user_id)
);

create index if not exists shares_user_idx on shares(user_id);

-- updated_at trigger
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists documents_set_updated_at on documents;
create trigger documents_set_updated_at
before update on documents
for each row execute function set_updated_at();

-- Explicit grants in case default privileges weren't applied to
-- SQL-Editor-created tables. service_role bypasses RLS but still needs
-- Postgres table privileges, which is the most common "permission denied"
-- cause for this kind of setup.
grant usage on schema public to service_role, anon, authenticated;
grant all on table profiles to service_role;
grant all on table documents to service_role;
grant all on table shares to service_role;

-- NOTE: Row Level Security is intentionally NOT enabled here.
-- Access control is enforced in the API layer (src/lib/permissions.ts) using
-- a server-side service-role Supabase client and a cookie-identified user.
-- The service-role key MUST stay server-side. See ARCHITECTURE.md.

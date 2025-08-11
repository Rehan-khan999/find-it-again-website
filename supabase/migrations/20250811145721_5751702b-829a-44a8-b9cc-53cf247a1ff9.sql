-- Create table for guest submissions with email verification
create extension if not exists pgcrypto;

create table if not exists public.guest_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'pending', -- pending | verified | published | failed
  email text not null,
  token text not null unique,
  item_type text not null check (item_type in ('lost','found')),
  title text not null,
  description text not null,
  category text not null,
  date_lost_found date,
  location text not null,
  latitude double precision,
  longitude double precision,
  contact_name text,
  contact_phone text,
  contact_email text,
  reward text,
  additional_info text,
  photos text[] default '{}',
  verification_questions text[] default '{}',
  published_item_id uuid
);

-- Enable RLS and restrict direct access; only service role functions will operate on it
alter table public.guest_submissions enable row level security;

-- No broad select; if needed later, create specific policies. For now, deny all to public
-- Minimal policy to allow no one by default
create policy "deny all on guest_submissions" on public.guest_submissions for all to public using (false) with check (false);

-- Indexes
create index if not exists idx_guest_submissions_status on public.guest_submissions (status);
create index if not exists idx_guest_submissions_token on public.guest_submissions (token);

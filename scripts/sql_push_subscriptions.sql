-- Chạy trong Supabase SQL Editor (một lần)
-- Lưu subscription Web Push theo member trong space

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_subscriptions_endpoint_key unique (endpoint)
);

create index if not exists push_subscriptions_member_id_idx
  on public.push_subscriptions (member_id);

create index if not exists push_subscriptions_space_id_idx
  on public.push_subscriptions (space_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_select on public.push_subscriptions;
create policy push_subscriptions_select on public.push_subscriptions
  for select to authenticated
  using (space_id in (select public.my_space_ids()));

drop policy if exists push_subscriptions_insert on public.push_subscriptions;
create policy push_subscriptions_insert on public.push_subscriptions
  for insert to authenticated
  with check (
    space_id in (select public.my_space_ids())
    and member_id in (select id from public.members where auth_user_id = auth.uid())
  );

drop policy if exists push_subscriptions_update on public.push_subscriptions;
create policy push_subscriptions_update on public.push_subscriptions
  for update to authenticated
  using (
    member_id in (select id from public.members where auth_user_id = auth.uid())
  );

drop policy if exists push_subscriptions_delete on public.push_subscriptions;
create policy push_subscriptions_delete on public.push_subscriptions
  for delete to authenticated
  using (
    member_id in (select id from public.members where auth_user_id = auth.uid())
    or space_id in (select public.my_space_ids())
  );

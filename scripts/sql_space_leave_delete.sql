-- =============================================================================
-- CHẠY TOÀN BỘ FILE NÀY trong Supabase → SQL Editor (Run)
-- Đây là bản đúng: tạo RPC delete_my_space / leave_my_space
-- KHÔNG chỉ chạy đoạn drop/create policy ngắn!
-- =============================================================================

-- 0) Bảng push (nếu chưa có) — trước khi function xóa tham chiếu tới nó
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

create or replace function public.is_space_creator(p_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members
    where space_id = p_space_id
      and auth_user_id = auth.uid()
      and role = 'user_1'
  );
$$;

create or replace function public.is_sole_space_member(p_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members
    where space_id = p_space_id
      and auth_user_id = auth.uid()
  )
  and (
    select count(*)::int
    from public.members
    where space_id = p_space_id
  ) = 1;
$$;

-- Xóa toàn bộ Space (chỉ creator / user_1)
create or replace function public.delete_my_space(p_space_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_space_creator(p_space_id) then
    raise exception 'Only user_1 (creator) can delete this space';
  end if;

  delete from public.push_subscriptions where space_id = p_space_id;
  delete from public.spaces where id = p_space_id;
end;
$$;

-- Rời Space
create or replace function public.leave_my_space(p_space_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid;
  v_count int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select id into v_member_id
  from public.members
  where space_id = p_space_id
    and auth_user_id = auth.uid();

  if v_member_id is null then
    raise exception 'You are not a member of this space';
  end if;

  select count(*)::int into v_count
  from public.members
  where space_id = p_space_id;

  if v_count <= 1 then
    delete from public.push_subscriptions where space_id = p_space_id;
    delete from public.spaces where id = p_space_id;
  else
    delete from public.push_subscriptions where member_id = v_member_id;
    delete from public.members where id = v_member_id;
  end if;
end;
$$;

grant execute on function public.is_space_creator(uuid) to authenticated;
grant execute on function public.is_sole_space_member(uuid) to authenticated;
grant execute on function public.delete_my_space(uuid) to authenticated;
grant execute on function public.leave_my_space(uuid) to authenticated;

drop policy if exists members_delete on public.members;
create policy members_delete on public.members
  for delete to authenticated
  using (auth_user_id = auth.uid());

drop policy if exists spaces_delete on public.spaces;
drop policy if exists spaces_delete_last_member on public.spaces;
create policy spaces_delete on public.spaces
  for delete to authenticated
  using (
    public.is_space_creator(id)
    or public.is_sole_space_member(id)
  );

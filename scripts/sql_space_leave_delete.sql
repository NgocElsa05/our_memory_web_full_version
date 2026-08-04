-- Chạy trong Supabase → SQL Editor (một lần / chạy lại được)
-- Cho phép: rời Space (xóa membership) + xóa Space (user_1 / người cuối)

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

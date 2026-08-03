-- RLS: cho phép rời Space (xóa membership của chính mình)
-- và xóa toàn bộ Space (chỉ user_1 / creator)

drop policy if exists members_delete on public.members;
create policy members_delete on public.members
  for delete to authenticated
  using (auth_user_id = auth.uid());

-- Xóa Space: creator (user_1), hoặc còn đúng 1 thành viên (đang rời khi một mình)
drop policy if exists spaces_delete on public.spaces;
create policy spaces_delete on public.spaces
  for delete to authenticated
  using (
    id in (select public.my_space_ids())
    and (
      exists (
        select 1
        from public.members m
        where m.space_id = spaces.id
          and m.auth_user_id = auth.uid()
          and m.role = 'user_1'
      )
      or (
        select count(*)::int
        from public.members m2
        where m2.space_id = spaces.id
      ) = 1
    )
  );

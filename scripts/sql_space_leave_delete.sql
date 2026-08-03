-- RLS: rời Space / xóa Space
-- Chạy lại script này nếu xóa Space "không xảy ra gì" (RLS nuốt lỗi → 0 hàng)

drop policy if exists members_delete on public.members;
create policy members_delete on public.members
  for delete to authenticated
  using (auth_user_id = auth.uid());

-- Chỉ creator (user_1) được xóa Space — không phụ thuộc my_space_ids()
drop policy if exists spaces_delete on public.spaces;
create policy spaces_delete on public.spaces
  for delete to authenticated
  using (
    exists (
      select 1
      from public.members m
      where m.space_id = spaces.id
        and m.auth_user_id = auth.uid()
        and m.role = 'user_1'
    )
  );

-- Người cuối cùng trong space cũng được xóa space (khi rời và còn 1 mình)
drop policy if exists spaces_delete_last_member on public.spaces;
create policy spaces_delete_last_member on public.spaces
  for delete to authenticated
  using (
    exists (
      select 1
      from public.members m
      where m.space_id = spaces.id
        and m.auth_user_id = auth.uid()
    )
    and (
      select count(*)::int
      from public.members m2
      where m2.space_id = spaces.id
    ) = 1
  );

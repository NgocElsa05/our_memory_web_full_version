-- Cho phép ai có link mời cũng xem được Space theo invite_code
-- (cần cho trang /invite/... trước khi join — cả anon lẫn authenticated)

drop policy if exists spaces_select_by_invite on public.spaces;
create policy spaces_select_by_invite on public.spaces
  for select to anon, authenticated
  using (invite_code is not null);

-- Đếm member khi chưa join (để biết space đã đủ 2 người chưa)
-- Cho phép đọc row members của space đang mở public bằng invite — cách đơn giản:
-- authenticated/anon select members nếu space có invite_code (chỉ cần cho đếm)
drop policy if exists members_select_by_invite_space on public.members;
create policy members_select_by_invite_space on public.members
  for select to anon, authenticated
  using (
    space_id in (
      select id from public.spaces where invite_code is not null
    )
  );

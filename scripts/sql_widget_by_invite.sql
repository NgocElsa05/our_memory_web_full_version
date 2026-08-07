-- Widget Scriptable: đọc snapshot công khai theo invite_code (chỉ field cần cho widget)
-- Chạy 1 lần trên Supabase SQL Editor.

create or replace function public.get_widget_by_invite(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_code text := upper(trim(coalesce(p_code, '')));
  v_space public.spaces%rowtype;
  v_m1 public.members%rowtype;
  v_m2 public.members%rowtype;
  v_p1 public.profiles%rowtype;
  v_p2 public.profiles%rowtype;
  v_days int;
begin
  if v_code = '' then
    return jsonb_build_object('ok', false, 'error', 'missing_code');
  end if;

  select * into v_space
  from public.spaces
  where upper(invite_code) = v_code
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select * into v_m1 from public.members where space_id = v_space.id and role = 'user_1' limit 1;
  select * into v_m2 from public.members where space_id = v_space.id and role = 'user_2' limit 1;

  if v_m1.id is not null then
    select * into v_p1 from public.profiles where id = v_m1.id limit 1;
  end if;
  if v_m2.id is not null then
    select * into v_p2 from public.profiles where id = v_m2.id limit 1;
  end if;

  if v_space.together_since is not null then
    v_days := (current_date - v_space.together_since) + 1;
    if v_days < 0 then v_days := 0; end if;
  else
    v_days := 0;
  end if;

  return jsonb_build_object(
    'ok', true,
    'spaceName', v_space.name,
    'togetherSince', v_space.together_since,
    'days', v_days,
    'user1', jsonb_build_object(
      'nickname', coalesce(nullif(trim(v_p1.nickname), ''), nullif(trim(v_m1.nickname), ''), 'User 1'),
      'avatarUrl', v_p1.avatar_url
    ),
    'user2', jsonb_build_object(
      'nickname', coalesce(nullif(trim(v_p2.nickname), ''), nullif(trim(v_m2.nickname), ''), 'User 2'),
      'avatarUrl', v_p2.avatar_url
    )
  );
end;
$$;

revoke all on function public.get_widget_by_invite(text) from public;
grant execute on function public.get_widget_by_invite(text) to anon, authenticated;

create or replace function public.delete_user_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Ensure only the authenticated user can delete themselves
  if auth.uid() is null then
    raise exception 'must be logged in';
  end if;

  -- Delete dependent data
  delete from sport_rating_history where user_id = auth.uid();
  delete from sport_ratings where user_id = auth.uid();
  delete from friend_requests where from_user = auth.uid() or to_user = auth.uid();
  delete from friends where user_a = auth.uid() or user_b = auth.uid();
  delete from match_confirmations where user_id = auth.uid();
  delete from match_players where user_id = auth.uid();
  -- Optional: anonymize or keep matches; here we leave match rows.

  delete from profiles where id = auth.uid();

  -- Delete from auth.users using Supabase helper
  perform auth.delete_user(auth.uid());

end;
$$;

grant execute on function public.delete_user_account() to authenticated;

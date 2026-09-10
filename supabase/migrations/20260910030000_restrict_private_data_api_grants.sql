revoke all on table public.users from anon;
revoke all on table public.portfolio_holdings from anon;
revoke all on table public.alerts from anon;
revoke all on table public.notifications from anon;
revoke all on table public.ai_suggestions from anon;

grant select, insert, update, delete on table public.users to authenticated;
grant select, insert, update, delete on table public.portfolio_holdings to authenticated;
grant select, insert, update, delete on table public.alerts to authenticated;
grant select, insert, update, delete on table public.notifications to authenticated;
grant select, insert, update, delete on table public.ai_suggestions to authenticated;

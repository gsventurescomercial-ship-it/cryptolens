create index if not exists idx_notifications_alert_id on public.notifications(alert_id);

drop policy if exists users_select_own on public.users;
drop policy if exists users_insert_own on public.users;
drop policy if exists users_update_own on public.users;
drop policy if exists users_delete_own on public.users;
create policy users_select_own on public.users for select to authenticated using ((select auth.uid()) = id);
create policy users_insert_own on public.users for insert to authenticated with check ((select auth.uid()) = id);
create policy users_update_own on public.users for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy users_delete_own on public.users for delete to authenticated using ((select auth.uid()) = id);

drop policy if exists portfolio_holdings_select_own on public.portfolio_holdings;
drop policy if exists portfolio_holdings_insert_own on public.portfolio_holdings;
drop policy if exists portfolio_holdings_update_own on public.portfolio_holdings;
drop policy if exists portfolio_holdings_delete_own on public.portfolio_holdings;
create policy portfolio_holdings_select_own on public.portfolio_holdings for select to authenticated using ((select auth.uid()) = user_id);
create policy portfolio_holdings_insert_own on public.portfolio_holdings for insert to authenticated with check ((select auth.uid()) = user_id);
create policy portfolio_holdings_update_own on public.portfolio_holdings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy portfolio_holdings_delete_own on public.portfolio_holdings for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists alerts_select_own on public.alerts;
drop policy if exists alerts_insert_own on public.alerts;
drop policy if exists alerts_update_own on public.alerts;
drop policy if exists alerts_delete_own on public.alerts;
create policy alerts_select_own on public.alerts for select to authenticated using ((select auth.uid()) = user_id);
create policy alerts_insert_own on public.alerts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy alerts_update_own on public.alerts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy alerts_delete_own on public.alerts for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists notifications_select_own on public.notifications;
drop policy if exists notifications_insert_own on public.notifications;
drop policy if exists notifications_update_own on public.notifications;
drop policy if exists notifications_delete_own on public.notifications;
create policy notifications_select_own on public.notifications for select to authenticated using ((select auth.uid()) = user_id);
create policy notifications_insert_own on public.notifications for insert to authenticated with check ((select auth.uid()) = user_id);
create policy notifications_update_own on public.notifications for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy notifications_delete_own on public.notifications for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists ai_suggestions_select_own on public.ai_suggestions;
drop policy if exists ai_suggestions_insert_own on public.ai_suggestions;
drop policy if exists ai_suggestions_update_own on public.ai_suggestions;
drop policy if exists ai_suggestions_delete_own on public.ai_suggestions;
create policy ai_suggestions_select_own on public.ai_suggestions for select to authenticated using ((select auth.uid()) = user_id);
create policy ai_suggestions_insert_own on public.ai_suggestions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy ai_suggestions_update_own on public.ai_suggestions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy ai_suggestions_delete_own on public.ai_suggestions for delete to authenticated using ((select auth.uid()) = user_id);

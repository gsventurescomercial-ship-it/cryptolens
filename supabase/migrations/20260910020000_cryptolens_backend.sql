-- CryptoLens backend schema (Supabase/PostgreSQL)
create extension if not exists pgcrypto;
create extension if not exists http with schema extensions;
create extension if not exists pg_cron;

do $$ begin
  create type public.alert_condition as enum (
    'price_above',
    'price_below',
    'percent_change_up',
    'percent_change_down'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.alert_status as enum ('active', 'triggered', 'disabled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.notification_channel as enum ('push', 'email', 'in_app');
exception when duplicate_object then null;
end $$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.portfolio_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  quantity numeric(38,18) not null check (quantity >= 0),
  avg_buy_price numeric(38,18),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  condition_type public.alert_condition not null,
  target_value numeric(38,18) not null,
  status public.alert_status not null default 'active',
  triggered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  alert_id uuid references public.alerts(id) on delete set null,
  channel public.notification_channel not null default 'in_app',
  message text not null,
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  portfolio_snapshot jsonb not null,
  market_context jsonb,
  suggestion_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_portfolio_holdings_user_id on public.portfolio_holdings(user_id);
create index if not exists idx_alerts_user_status on public.alerts(user_id, status);
create index if not exists idx_notifications_user_created_at on public.notifications(user_id, created_at desc);
create index if not exists idx_ai_suggestions_user_created_at on public.ai_suggestions(user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists portfolio_holdings_set_updated_at on public.portfolio_holdings;
create trigger portfolio_holdings_set_updated_at before update on public.portfolio_holdings
for each row execute function public.set_updated_at();

drop trigger if exists alerts_set_updated_at on public.alerts;
create trigger alerts_set_updated_at before update on public.alerts
for each row execute function public.set_updated_at();

drop trigger if exists notifications_set_updated_at on public.notifications;
create trigger notifications_set_updated_at before update on public.notifications
for each row execute function public.set_updated_at();

drop trigger if exists ai_suggestions_set_updated_at on public.ai_suggestions;
create trigger ai_suggestions_set_updated_at before update on public.ai_suggestions
for each row execute function public.set_updated_at();

create or replace function public.handle_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name, created_at, updated_at)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name'),
    coalesce(new.created_at, now()),
    now()
  )
  on conflict (id) do update
    set email = excluded.email,
        name = coalesce(excluded.name, public.users.name),
        updated_at = now();
  return new;
end;
$$;

revoke all on function public.handle_auth_user_profile() from public, anon, authenticated;
grant execute on function public.handle_auth_user_profile() to supabase_auth_admin;

drop trigger if exists on_auth_user_profile_sync on auth.users;
create trigger on_auth_user_profile_sync
after insert or update of email, raw_user_meta_data on auth.users
for each row execute function public.handle_auth_user_profile();

insert into public.users (id, email, name, created_at, updated_at)
select id,
       coalesce(email, ''),
       coalesce(raw_user_meta_data->>'name', raw_user_meta_data->>'full_name'),
       coalesce(created_at, now()),
       now()
from auth.users
on conflict (id) do nothing;

alter table public.users enable row level security;
alter table public.portfolio_holdings enable row level security;
alter table public.alerts enable row level security;
alter table public.notifications enable row level security;
alter table public.ai_suggestions enable row level security;

drop policy if exists users_select_own on public.users;
drop policy if exists users_insert_own on public.users;
drop policy if exists users_update_own on public.users;
drop policy if exists users_delete_own on public.users;
create policy users_select_own on public.users for select using (auth.uid() = id);
create policy users_insert_own on public.users for insert with check (auth.uid() = id);
create policy users_update_own on public.users for update using (auth.uid() = id) with check (auth.uid() = id);
create policy users_delete_own on public.users for delete using (auth.uid() = id);

drop policy if exists portfolio_holdings_select_own on public.portfolio_holdings;
drop policy if exists portfolio_holdings_insert_own on public.portfolio_holdings;
drop policy if exists portfolio_holdings_update_own on public.portfolio_holdings;
drop policy if exists portfolio_holdings_delete_own on public.portfolio_holdings;
create policy portfolio_holdings_select_own on public.portfolio_holdings for select using (auth.uid() = user_id);
create policy portfolio_holdings_insert_own on public.portfolio_holdings for insert with check (auth.uid() = user_id);
create policy portfolio_holdings_update_own on public.portfolio_holdings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy portfolio_holdings_delete_own on public.portfolio_holdings for delete using (auth.uid() = user_id);

drop policy if exists alerts_select_own on public.alerts;
drop policy if exists alerts_insert_own on public.alerts;
drop policy if exists alerts_update_own on public.alerts;
drop policy if exists alerts_delete_own on public.alerts;
create policy alerts_select_own on public.alerts for select using (auth.uid() = user_id);
create policy alerts_insert_own on public.alerts for insert with check (auth.uid() = user_id);
create policy alerts_update_own on public.alerts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy alerts_delete_own on public.alerts for delete using (auth.uid() = user_id);

drop policy if exists notifications_select_own on public.notifications;
drop policy if exists notifications_insert_own on public.notifications;
drop policy if exists notifications_update_own on public.notifications;
drop policy if exists notifications_delete_own on public.notifications;
create policy notifications_select_own on public.notifications for select using (auth.uid() = user_id);
create policy notifications_insert_own on public.notifications for insert with check (auth.uid() = user_id);
create policy notifications_update_own on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy notifications_delete_own on public.notifications for delete using (auth.uid() = user_id);

drop policy if exists ai_suggestions_select_own on public.ai_suggestions;
drop policy if exists ai_suggestions_insert_own on public.ai_suggestions;
drop policy if exists ai_suggestions_update_own on public.ai_suggestions;
drop policy if exists ai_suggestions_delete_own on public.ai_suggestions;
create policy ai_suggestions_select_own on public.ai_suggestions for select using (auth.uid() = user_id);
create policy ai_suggestions_insert_own on public.ai_suggestions for insert with check (auth.uid() = user_id);
create policy ai_suggestions_update_own on public.ai_suggestions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy ai_suggestions_delete_own on public.ai_suggestions for delete using (auth.uid() = user_id);

create or replace function public.process_active_price_alerts()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  asset_symbol text;
  ticker jsonb;
  current_price numeric;
  change_24h numeric;
  rule record;
  condition_met boolean;
begin
  for asset_symbol in
    select distinct upper(symbol) from public.alerts where status = 'active'
  loop
    begin
      select content::jsonb
      into ticker
      from extensions.http_get(
        'https://api.binance.com/api/v3/ticker/24hr?symbol=' || asset_symbol || 'USDT'
      );

      current_price := nullif(ticker->>'lastPrice', '')::numeric;
      change_24h := nullif(ticker->>'priceChangePercent', '')::numeric;

      for rule in
        select * from public.alerts
        where status = 'active' and upper(symbol) = asset_symbol
        for update skip locked
      loop
        condition_met := case rule.condition_type::text
          when 'price_above' then current_price is not null and current_price >= rule.target_value
          when 'price_below' then current_price is not null and current_price <= rule.target_value
          when 'percent_change_up' then change_24h is not null and change_24h >= rule.target_value
          when 'percent_change_down' then change_24h is not null and change_24h <= rule.target_value
          else false
        end;

        if condition_met then
          update public.alerts
          set status = 'triggered', triggered_at = now(), updated_at = now()
          where id = rule.id and status = 'active';

          if found then
            insert into public.notifications (user_id, alert_id, channel, message, sent_at, created_at, updated_at)
            values (
              rule.user_id,
              rule.id,
              'in_app',
              case rule.condition_type::text
                when 'price_above' then asset_symbol || ' atingiu ou ultrapassou US$ ' || rule.target_value::text || '. Preço atual: US$ ' || current_price::text || '.'
                when 'price_below' then asset_symbol || ' atingiu ou caiu abaixo de US$ ' || rule.target_value::text || '. Preço atual: US$ ' || current_price::text || '.'
                when 'percent_change_up' then asset_symbol || ' atingiu variação de 24h acima de ' || rule.target_value::text || '%. Atual: ' || change_24h::text || '%.'
                when 'percent_change_down' then asset_symbol || ' atingiu variação de 24h abaixo de ' || rule.target_value::text || '%. Atual: ' || change_24h::text || '%.'
              end,
              now(), now(), now()
            );
          end if;
        end if;
      end loop;
    exception when others then
      raise warning 'CryptoLens alert job failed for symbol %: %', asset_symbol, sqlerrm;
    end;
  end loop;
end;
$$;

revoke all on function public.process_active_price_alerts() from public, anon, authenticated;

select cron.unschedule(jobid)
from cron.job
where jobname = 'cryptolens-price-alerts';

select cron.schedule(
  'cryptolens-price-alerts',
  '*/5 * * * *',
  $$select public.process_active_price_alerts();$$
);

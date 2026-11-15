-- StoneCraft: durable key-value store on Supabase/Postgres (staging/preview, or production without Upstash).
-- src/lib/store.ts uses these RPCs through PostgREST with the server-only service-role key when
-- SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set and Upstash is not. Values are JSON strings.
-- Server-only: RLS on, no policies, no anon/authenticated grants; functions execute as service_role only.
create table if not exists public.kv_store (key text primary key, value text not null, expires_at timestamptz);
create index if not exists kv_store_expires_idx on public.kv_store (expires_at) where expires_at is not null;
create table if not exists public.kv_list (id bigserial primary key, key text not null, value text not null, created_at timestamptz not null default now());
create index if not exists kv_list_key_idx on public.kv_list (key, id desc);
alter table public.kv_store enable row level security;
alter table public.kv_list enable row level security;
revoke all on public.kv_store, public.kv_list from anon, authenticated;
revoke all on sequence public.kv_list_id_seq from anon, authenticated;

create or replace function public.kv_get(p_key text) returns text language sql stable set search_path = '' as $$
  select value from public.kv_store where key = p_key and (expires_at is null or expires_at > now())
$$;

create or replace function public.kv_set(p_key text, p_value text, p_ttl integer default null) returns void language plpgsql set search_path = '' as $$
begin
  insert into public.kv_store (key, value, expires_at)
  values (p_key, p_value, case when p_ttl is null or p_ttl <= 0 then null else now() + make_interval(secs => p_ttl) end)
  on conflict (key) do update set value = excluded.value, expires_at = excluded.expires_at;
  if random() < 0.02 then delete from public.kv_store where expires_at < now() - interval '1 minute'; end if;
end $$;

create or replace function public.kv_setnx(p_key text, p_value text, p_ttl integer) returns boolean language plpgsql set search_path = '' as $$
declare created boolean;
begin
  insert into public.kv_store as s (key, value, expires_at) values (p_key, p_value, now() + make_interval(secs => p_ttl))
  on conflict (key) do update set value = excluded.value, expires_at = excluded.expires_at
    where s.expires_at is not null and s.expires_at <= now()
  returning true into created;
  return coalesce(created, false);
end $$;

create or replace function public.kv_incr(p_key text, p_ttl integer) returns bigint language plpgsql set search_path = '' as $$
declare n bigint;
begin
  insert into public.kv_store as s (key, value, expires_at) values (p_key, '1', now() + make_interval(secs => p_ttl))
  on conflict (key) do update set
    value = case when s.expires_at is not null and s.expires_at <= now() then '1' else ((s.value)::bigint + 1)::text end,
    expires_at = case when s.expires_at is not null and s.expires_at <= now() then now() + make_interval(secs => p_ttl) else s.expires_at end
  returning (value)::bigint into n;
  return n;
end $$;

create or replace function public.kv_del(p_key text) returns void language sql set search_path = '' as $$
  delete from public.kv_store where key = p_key;
  delete from public.kv_list where key = p_key;
$$;

create or replace function public.kv_lpush(p_key text, p_value text, p_max integer default 5000) returns void language plpgsql set search_path = '' as $$
begin
  insert into public.kv_list (key, value) values (p_key, p_value);
  delete from public.kv_list where key = p_key and id in (select id from public.kv_list where key = p_key order by id desc offset greatest(p_max, 1));
end $$;

create or replace function public.kv_lrange(p_key text, p_start integer default 0, p_stop integer default 999) returns setof text language sql stable set search_path = '' as $$
  select value from public.kv_list where key = p_key order by id desc offset greatest(p_start, 0) limit greatest(p_stop - greatest(p_start, 0) + 1, 0)
$$;

do $$ declare f text; begin
  foreach f in array array['kv_get(text)','kv_set(text,text,integer)','kv_setnx(text,text,integer)','kv_incr(text,integer)','kv_del(text)','kv_lpush(text,text,integer)','kv_lrange(text,integer,integer)'] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;
grant select, insert, update, delete on public.kv_store, public.kv_list to service_role;
grant usage on sequence public.kv_list_id_seq to service_role;

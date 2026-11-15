drop function if exists public.kv_get(text), public.kv_set(text,text,integer), public.kv_setnx(text,text,integer), public.kv_incr(text,integer), public.kv_del(text), public.kv_lpush(text,text,integer), public.kv_lrange(text,integer,integer);
drop table if exists public.kv_list;
drop table if exists public.kv_store;

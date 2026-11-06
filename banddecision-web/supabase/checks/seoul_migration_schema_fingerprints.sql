-- Read-only content and permission fingerprints for comparison between projects.
select 'functions' as category,count(*) as objects,
 md5(string_agg(pg_get_functiondef(p.oid)||coalesce((select string_agg(x::text,',' order by x::text) from unnest(p.proacl) x),''),E'\n' order by n.nspname,p.proname,pg_get_function_identity_arguments(p.oid))) as fingerprint
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname in ('public','private') and p.prokind='f';

select 'policies' as category,count(*) as objects,
 md5(string_agg(to_jsonb(p)::text,E'\n' order by schemaname,tablename,policyname)) as fingerprint
from pg_policies p where schemaname in ('public','private');

select 'table_permissions' as category,count(*) as objects,
 md5(string_agg(n.nspname||'.'||c.relname||c.relrowsecurity::text||c.relforcerowsecurity::text||coalesce((select string_agg(x::text,',' order by x::text) from unnest(coalesce(c.relacl,acldefault('r',c.relowner))) x),''),E'\n' order by n.nspname,c.relname)) as fingerprint
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname in ('public','private') and c.relkind='r';

select 'triggers' as category,count(*) as objects,
 md5(string_agg(pg_get_triggerdef(t.oid)||':'||t.tgenabled::text,E'\n' order by n.nspname,c.relname,t.tgname)) as fingerprint
from pg_trigger t join pg_class c on c.oid=t.tgrelid
join pg_namespace n on n.oid=c.relnamespace
join pg_proc p on p.oid=t.tgfoid join pg_namespace pn on pn.oid=p.pronamespace
where not t.tgisinternal and (n.nspname in ('public','private') or(n.nspname='auth' and pn.nspname not in ('auth','storage')));

select 'realtime' as category,count(*) as objects,
 md5(string_agg(to_jsonb(p)::text,E'\n' order by schemaname,tablename)) as fingerprint
from pg_publication_tables p where pubname='supabase_realtime' and schemaname='public';

select 'default_permissions' as category,count(*) as objects,
 md5(string_agg(pg_get_userbyid(d.defaclrole)||'|'||n.nspname||'|'||d.defaclobjtype::text||'|'||coalesce((select string_agg(x::text,',' order by x::text) from unnest(d.defaclacl) x),''),E'\n' order by n.nspname,d.defaclobjtype)) as fingerprint
from pg_default_acl d join pg_namespace n on n.oid=d.defaclnamespace
where n.nspname in ('public','private') and pg_get_userbyid(d.defaclrole)='postgres';

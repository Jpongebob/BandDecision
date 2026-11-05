create role anon nologin;
create role authenticated nologin;
create schema auth;
create schema extensions;
grant usage on schema auth, extensions to anon, authenticated;
grant usage on schema public to anon, authenticated;
create table auth.users (
 id uuid primary key, aud text, role text, email text, encrypted_password text,
 email_confirmed_at timestamptz, raw_app_meta_data jsonb default '{}',
 raw_user_meta_data jsonb default '{}', created_at timestamptz default now(),
 updated_at timestamptz default now(), is_anonymous boolean not null default false
);
create function auth.uid() returns uuid language sql stable as $$
 select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
 nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'sub')::uuid
$$;
create function auth.jwt() returns jsonb language sql stable as $$
 select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
$$;
create extension pgcrypto with schema extensions;
create extension pgtap with schema extensions;
set search_path = public, extensions;

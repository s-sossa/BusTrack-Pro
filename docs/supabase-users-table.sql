-- ==============================================================================
-- BusTrack Pro — Public Users Schema & RLS Security Policies for Supabase
-- Single Source of Truth for User Accounts
-- ==============================================================================

create table if not exists public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text unique not null,
  full_name     text,
  role          text not null default 'passenger' check (role in ('admin','passenger')),
  auth_provider text not null default 'email',
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Ver propio perfil" on public.users for select to authenticated
  using (auth.uid() = id);

create policy "Actualizar propio perfil" on public.users for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id and role = (select u.role from public.users u where u.id = auth.uid()));

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;

create trigger users_set_updated_at before update on public.users
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.users (id, email, full_name, avatar_url, auth_provider)
  values (new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_app_meta_data->>'provider','email'))
  on conflict (id) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.users (id, email, full_name, auth_provider)
select id, email,
  coalesce(raw_user_meta_data->>'full_name', split_part(email,'@',1)),
  coalesce(raw_app_meta_data->>'provider','email')
from auth.users on conflict (id) do nothing;

-- ⛔ Para otorgar rol de administrador, hacerlo SIEMPRE manualmente desde el SQL Editor:
-- update public.users set role = 'admin' where email = 'correo@dominio.com';

-- Revocación de permisos de ejecución para roles públicos/anónimos
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

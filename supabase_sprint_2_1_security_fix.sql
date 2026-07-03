-- =======================================================
-- SCRIPT DE CORRECCION DE SEGURIDAD - SPRINT 2.1
-- MITIGACION DE ESCALACION DE ROLES Y RECURSION RLS
-- =======================================================

-- Este script corrige dos problemas que bloquean el login:
-- 1. El rol authenticated no tenia permisos SQL sobre public.profiles.
-- 2. Faltaba public.get_my_role(), usada por politicas y pruebas.

alter table public.profiles enable row level security;

-- 1. Permisos base para que RLS pueda evaluar las politicas.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;

do $$
begin
    if to_regclass('public.product_categories') is not null then
        execute 'grant select, insert, update, delete on public.product_categories to authenticated';
    end if;

    if to_regclass('public.products') is not null then
        execute 'grant select, insert, update, delete on public.products to authenticated';
    end if;

    if to_regclass('public.product_batches') is not null then
        execute 'grant select, insert, update, delete on public.product_batches to authenticated';
    end if;

    if to_regclass('public.stock_movements') is not null then
        execute 'grant select, insert on public.stock_movements to authenticated';
    end if;

    if to_regclass('public.product_stock_summary') is not null then
        execute 'grant select on public.product_stock_summary to authenticated';
    end if;
end $$;

-- 2. Funcion segura para leer el rol del usuario actual sin recursividad RLS.
create or replace function public.get_my_role()
returns text as $$
declare
    current_role text;
begin
    select role::text
      into current_role
      from public.profiles
     where id = auth.uid();

    return current_role;
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function public.get_my_role() from public;
grant execute on function public.get_my_role() to authenticated;

-- 3. Funcion auxiliar para politicas que reciben un user_id explicito.
create or replace function public.is_admin(user_id uuid)
returns boolean as $$
begin
    return exists (
        select 1
          from public.profiles
         where id = user_id
           and role::text = 'admin'
    );
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;

-- 4. Reemplazar politicas antiguas o recursivas en profiles.
drop policy if exists "Cualquier usuario autenticado puede leer perfiles" on public.profiles;
drop policy if exists "Los usuarios pueden actualizar su propio perfil (excepto rol)" on public.profiles;
drop policy if exists "Solo administradores pueden modificar perfiles completamente" on public.profiles;
drop policy if exists "Usuarios pueden leer su propio perfil o admin todos" on public.profiles;
drop policy if exists "Solo administradores pueden actualizar cualquier perfil" on public.profiles;
drop policy if exists "Usuarios pueden actualizar su propio perfil sin cambiar rol" on public.profiles;
drop policy if exists "Profiles SELECT policy" on public.profiles;
drop policy if exists "Profiles UPDATE Admin policy" on public.profiles;
drop policy if exists "Profiles UPDATE Employee policy" on public.profiles;
drop policy if exists "Profiles DELETE policy" on public.profiles;

create policy "Profiles SELECT policy"
    on public.profiles for select
    to authenticated
    using (auth.uid() = id or public.get_my_role() = 'admin');

create policy "Profiles UPDATE Admin policy"
    on public.profiles for update
    to authenticated
    using (public.get_my_role() = 'admin')
    with check (public.get_my_role() = 'admin');

create policy "Profiles UPDATE Employee policy"
    on public.profiles for update
    to authenticated
    using (auth.uid() = id and public.get_my_role() = 'employee')
    with check (auth.uid() = id and public.get_my_role() = 'employee');

create policy "Profiles DELETE policy"
    on public.profiles for delete
    to authenticated
    using (public.get_my_role() = 'admin');

-- 5. Evitar que un usuario no admin cambie su rol o el rol de otros.
create or replace function public.check_profile_role_update()
returns trigger as $$
begin
    if new.role is distinct from old.role then
        if public.get_my_role() is distinct from 'admin' then
            raise exception 'No tienes permisos para modificar el rol de usuario.';
        end if;
    end if;

    return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_profile_role_update on public.profiles;
drop trigger if exists enforce_profile_role_update on public.profiles;

create trigger enforce_profile_role_update
    before update on public.profiles
    for each row execute procedure public.check_profile_role_update();

notify pgrst, 'reload schema';

-- =======================================================
-- SCRIPT DE CORRECCIÓN DE SEGURIDAD - SPRINT 2.1
-- MITIGACIÓN DE ESCALACIÓN DE ROLES Y RECURSIÓN RLS
-- =======================================================

-- 1. Crear función auxiliar con SECURITY DEFINER para verificar si el usuario es administrador.
-- Esto previene la recursión infinita en las políticas RLS de profiles.
create or replace function public.is_admin(user_id uuid)
returns boolean as $$
begin
    return exists (
        select 1 from public.profiles
        where id = user_id and role = 'admin'
    );
end;
$$ language plpgsql security definer;

-- 2. Eliminar la antigua política que causaba recursión infinita y crear la nueva.
drop policy if exists "Solo administradores pueden modificar perfiles completamente" on public.profiles;
create policy "Solo administradores pueden modificar perfiles completamente"
    on public.profiles for all
    to authenticated
    using (public.is_admin(auth.uid()));

-- 3. Crear función de validación para el trigger de actualización de perfiles.
-- Evita que cualquier usuario sin rol 'admin' pueda modificarse a sí mismo u a otros el campo 'role'.
create or replace function public.check_profile_role_update()
returns trigger as $$
begin
    -- Si el rol está cambiando, validar que el usuario que ejecuta la consulta sea administrador.
    if new.role <> old.role then
        if not public.is_admin(auth.uid()) then
            raise exception 'No tienes permisos para modificar el rol de usuario.';
        end if;
    end if;
    return new;
end;
$$ language plpgsql security definer;

-- 4. Crear el trigger BEFORE UPDATE en profiles.
drop trigger if exists on_profile_role_update on public.profiles;
create trigger on_profile_role_update
    before update on public.profiles
    for each row execute procedure public.check_profile_role_update();

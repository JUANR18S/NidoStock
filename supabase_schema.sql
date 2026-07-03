-- ==========================================
-- ESTRUCTURA DE BASE DE DATOS - SPRINT 1
-- NIDOSTOCK
-- ==========================================

-- Habilitar extensión UUID
create extension if not exists "uuid-ossp";

-- 1. TABLA: profiles
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text not null,
    role text not null default 'employee' check (role in ('admin', 'employee')),
    updated_at timestamp with time zone default now()
);

-- Habilitar RLS en profiles
alter table public.profiles enable row level security;

-- Función auxiliar para verificar rol de administrador de forma segura (evita recursión RLS)
create or replace function public.is_admin(user_id uuid)
returns boolean as $$
begin
    return exists (
        select 1 from public.profiles
        where id = user_id and role = 'admin'
    );
end;
$$ language plpgsql security definer;

-- Políticas de RLS para profiles
drop policy if exists "Cualquier usuario autenticado puede leer perfiles" on public.profiles;
create policy "Cualquier usuario autenticado puede leer perfiles"
    on public.profiles for select
    to authenticated
    using (true);

drop policy if exists "Los usuarios pueden actualizar su propio perfil (excepto rol)" on public.profiles;
create policy "Los usuarios pueden actualizar su propio perfil (excepto rol)"
    on public.profiles for update
    to authenticated
    using (auth.uid() = id)
    with check (auth.uid() = id);

drop policy if exists "Solo administradores pueden modificar perfiles completamente" on public.profiles;
create policy "Solo administradores pueden modificar perfiles completamente"
    on public.profiles for all
    to authenticated
    using (public.is_admin(auth.uid()));

-- Función de validación para evitar que usuarios no-administradores cambien el rol
create or replace function public.check_profile_role_update()
returns trigger as $$
begin
    if new.role <> old.role then
        if not public.is_admin(auth.uid()) then
            raise exception 'No tienes permisos para modificar el rol de usuario.';
        end if;
    end if;
    return new;
end;
$$ language plpgsql security definer;

-- Trigger para validar cambios de rol en actualizaciones de perfiles
drop trigger if exists on_profile_role_update on public.profiles;
create trigger on_profile_role_update
    before update on public.profiles
    for each row execute procedure public.check_profile_role_update();


-- 2. TABLA: product_categories
create table if not exists public.product_categories (
    id uuid primary key default gen_random_uuid(),
    name text unique not null,
    created_at timestamp with time zone default now()
);

-- Habilitar RLS en product_categories
alter table public.product_categories enable row level security;

-- Políticas de RLS para product_categories
drop policy if exists "Cualquier usuario autenticado puede leer categorías" on public.product_categories;
create policy "Cualquier usuario autenticado puede leer categorías"
    on public.product_categories for select
    to authenticated
    using (true);

drop policy if exists "Solo administradores pueden gestionar categorías" on public.product_categories;
create policy "Solo administradores pueden gestionar categorías"
    on public.product_categories for all
    to authenticated
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'admin'
        )
    );

-- 3. SEMILLA DE CATEGORÍAS (PRODUCT_CATEGORIES)
insert into public.product_categories (name) values
    ('Facial'),
    ('Corporal'),
    ('Capilar'),
    ('Desechables'),
    ('Cabina'),
    ('Venta al público')
on conflict (name) do nothing;

-- 4. DISPARADOR (TRIGGER) PARA CREAR PERFIL AUTOMÁTICAMENTE
-- Se ejecuta cuando un usuario se registra en Supabase Auth.
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, email, role)
    values (new.id, new.email, 'employee');
    return new;
end;
$$ language plpgsql security definer;

-- Crear el trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

-- Nota: Para hacer que el primer usuario registrado sea 'admin',
-- puedes cambiar manualmente su rol en la tabla public.profiles de Supabase
-- con la siguiente consulta SQL reemplazando con el email correspondiente:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'tu_email@admin.com';

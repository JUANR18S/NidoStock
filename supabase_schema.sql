-- ==========================================
-- ESTRUCTURA DE BASE DE DATOS - SPRINT 1
-- STOCK COSMETOLÓGICO
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

-- Políticas de RLS para profiles
create policy "Cualquier usuario autenticado puede leer perfiles"
    on public.profiles for select
    to authenticated
    using (true);

create policy "Los usuarios pueden actualizar su propio perfil (excepto rol)"
    on public.profiles for update
    to authenticated
    using (auth.uid() = id)
    with check (auth.uid() = id);

create policy "Solo administradores pueden modificar perfiles completamente"
    on public.profiles for all
    to authenticated
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'admin'
        )
    );

-- 2. TABLA: product_categories
create table if not exists public.product_categories (
    id uuid primary key default gen_random_uuid(),
    name text unique not null,
    created_at timestamp with time zone default now()
);

-- Habilitar RLS en product_categories
alter table public.product_categories enable row level security;

-- Políticas de RLS para product_categories
create policy "Cualquier usuario autenticado puede leer categorías"
    on public.product_categories for select
    to authenticated
    using (true);

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

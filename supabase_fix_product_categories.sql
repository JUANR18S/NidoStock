-- =======================================================
-- HOTFIX: permisos y RLS para categorias de productos
-- =======================================================
-- Ejecuta este archivo en el SQL Editor de Supabase si el formulario
-- "Nuevo Producto" muestra que no puede cargar categorias.

create extension if not exists "pgcrypto";

alter table public.product_categories enable row level security;

grant usage on schema public to authenticated;
grant select on public.product_categories to authenticated;
grant insert, update, delete on public.product_categories to authenticated;
grant select on public.profiles to authenticated;

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

do $$
declare
    existing_policy record;
begin
    for existing_policy in
        select policyname
          from pg_policies
         where schemaname = 'public'
           and tablename = 'product_categories'
    loop
        execute format(
            'drop policy if exists %I on public.product_categories',
            existing_policy.policyname
        );
    end loop;
end $$;

create policy "Categories SELECT policy"
    on public.product_categories for select
    to authenticated
    using (true);

create policy "Categories INSERT policy"
    on public.product_categories for insert
    to authenticated
    with check (public.get_my_role() = 'admin');

create policy "Categories UPDATE policy"
    on public.product_categories for update
    to authenticated
    using (public.get_my_role() = 'admin')
    with check (public.get_my_role() = 'admin');

create policy "Categories DELETE policy"
    on public.product_categories for delete
    to authenticated
    using (public.get_my_role() = 'admin');

insert into public.product_categories (name) values
    ('Facial'),
    ('Corporal'),
    ('Capilar'),
    ('Desechables'),
    ('Cabina'),
    (U&'Venta al p\00FAblico')
on conflict (name) do nothing;

notify pgrst, 'reload schema';

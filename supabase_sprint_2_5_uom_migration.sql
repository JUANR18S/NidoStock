-- =======================================================
-- MIGRACIÓN DE BD - SPRINT 2.5 (UNIDADES DE MEDIDA Y KARDEX)
-- =======================================================

-- 1. AGREGAR COLUMNAS DE UNIDADES DE MEDIDA A LA TABLA PRODUCTS
alter table public.products
add column if not exists base_unit text not null default 'unidad',
add column if not exists presentation_unit text not null default 'unidad',
add column if not exists conversion_factor integer not null default 1 check (conversion_factor >= 1);

-- 2. ACTUALIZAR LA VISTA DE RESUMEN DE STOCK
-- Se añaden las nuevas columnas de unidades de medida para que el frontend pueda leerlas
create or replace view public.product_stock_summary as
select 
    p.id,
    p.category_id,
    c.name as category_name,
    p.name,
    p.description,
    p.sku,
    p.sale_price,
    p.active,
    p.base_unit,
    p.presentation_unit,
    p.conversion_factor,
    p.created_at,
    p.updated_at,
    coalesce(sum(b.current_quantity), 0)::integer as total_stock,
    min(case when b.current_quantity > 0 then b.expiration_date else null end) as next_expiration
from public.products p
left join public.product_categories c on p.category_id = c.id
left join public.product_batches b on p.id = b.product_id
group by p.id, c.name, p.base_unit, p.presentation_unit, p.conversion_factor;

-- 3. CREAR TABLA DE KARDEX: stock_movements
create table if not exists public.stock_movements (
    id uuid primary key default gen_random_uuid(),
    batch_id uuid not null references public.product_batches(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete restrict,
    type text not null check (type in ('input', 'output', 'adjustment_in', 'adjustment_out')),
    quantity integer not null check (quantity > 0),
    description text,
    created_at timestamp with time zone default now()
);

-- Habilitar RLS en stock_movements
alter table public.stock_movements enable row level security;

-- Políticas de RLS para stock_movements
drop policy if exists "Cualquier usuario autenticado puede leer movimientos de stock" on public.stock_movements;
create policy "Cualquier usuario autenticado puede leer movimientos de stock"
    on public.stock_movements for select
    to authenticated
    using (true);

drop policy if exists "Los usuarios autenticados pueden registrar movimientos con su propio ID" on public.stock_movements;
create policy "Los usuarios autenticados pueden registrar movimientos con su propio ID"
    on public.stock_movements for insert
    to authenticated
    with check (auth.uid() = user_id);

-- 4. FUNCIÓN Y TRIGGER PARA AUTO-ACTUALIZAR STOCK EN LOTES
create or replace function public.update_batch_stock_on_movement()
returns trigger as $$
begin
    if new.type in ('input', 'adjustment_in') then
        update public.product_batches
        set current_quantity = current_quantity + new.quantity
        where id = new.batch_id;
    elsif new.type in ('output', 'adjustment_out') then
        -- Verificar si hay suficiente stock disponible
        if (select current_quantity from public.product_batches where id = new.batch_id) < new.quantity then
            raise exception 'Stock insuficiente en el lote especificado.';
        end if;

        update public.product_batches
        set current_quantity = current_quantity - new.quantity
        where id = new.batch_id;
    end if;
    return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_stock_movement_inserted on public.stock_movements;
create trigger on_stock_movement_inserted
    after insert on public.stock_movements
    for each row execute procedure public.update_batch_stock_on_movement();

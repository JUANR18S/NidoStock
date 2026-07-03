-- ==========================================
-- ESTRUCTURA DE BASE DE DATOS - SPRINT 2
-- GESTIÓN DE PRODUCTOS, LOTES Y STOCK
-- ==========================================

-- 1. TABLA: products
create table if not exists public.products (
    id uuid primary key default gen_random_uuid(),
    category_id uuid not null references public.product_categories(id) on delete restrict,
    name text not null,
    description text,
    sku text unique not null,
    sale_price numeric(10, 2) not null check (sale_price >= 0),
    active boolean not null default true,
    base_unit text not null default 'unidad',
    presentation_unit text not null default 'unidad',
    conversion_factor integer not null default 1 check (conversion_factor >= 1),
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Habilitar RLS en products
alter table public.products enable row level security;

-- Políticas de RLS para products
create policy "Cualquier usuario autenticado puede leer productos"
    on public.products for select
    to authenticated
    using (true);

create policy "Solo administradores pueden insertar productos"
    on public.products for insert
    to authenticated
    with check (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'admin'
        )
    );

create policy "Solo administradores pueden actualizar productos"
    on public.products for update
    to authenticated
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'admin'
        )
    )
    with check (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'admin'
        )
    );

create policy "Solo administradores pueden eliminar productos"
    on public.products for delete
    to authenticated
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'admin'
        )
    );

-- Trigger para updated_at en products
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists on_product_updated on public.products;
create trigger on_product_updated
    before update on public.products
    for each row execute procedure public.handle_updated_at();


-- 2. TABLA: product_batches
create table if not exists public.product_batches (
    id uuid primary key default gen_random_uuid(),
    product_id uuid not null references public.products(id) on delete cascade,
    batch_code text not null,
    expiration_date date not null,
    initial_quantity integer not null check (initial_quantity >= 0),
    current_quantity integer not null check (current_quantity >= 0),
    purchase_price numeric(10, 2) not null check (purchase_price >= 0),
    created_at timestamp with time zone default now(),
    constraint check_quantities check (current_quantity <= initial_quantity),
    constraint unique_product_batch unique (product_id, batch_code)
);

-- Habilitar RLS en product_batches
alter table public.product_batches enable row level security;

-- Políticas de RLS para product_batches
create policy "Cualquier usuario autenticado puede leer lotes"
    on public.product_batches for select
    to authenticated
    using (true);

create policy "Solo administradores pueden insertar lotes"
    on public.product_batches for insert
    to authenticated
    with check (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'admin'
        )
    );

create policy "Solo administradores pueden actualizar lotes"
    on public.product_batches for update
    to authenticated
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'admin'
        )
    )
    with check (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'admin'
        )
    );

create policy "Solo administradores pueden eliminar lotes"
    on public.product_batches for delete
    to authenticated
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'admin'
        )
    );


-- 3. VISTA: product_stock_summary
-- Agrupa el stock de lotes activos y saca la fecha de vencimiento más próxima por producto
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


-- 4. SEMILLA DE DATOS (OPCIONAL - PARA PRUEBAS)
-- Agregamos un par de productos y lotes de prueba vinculados a las categorías del Sprint 1
do $$
declare
    cat_facial uuid;
    cat_corporal uuid;
    prod_crema uuid;
    prod_exfoliante uuid;
begin
    -- Obtener IDs de categorías
    select id into cat_facial from public.product_categories where name = 'Facial' limit 1;
    select id into cat_corporal from public.product_categories where name = 'Corporal' limit 1;

    if cat_facial is not null then
        -- Insertar Producto 1
        insert into public.products (category_id, name, description, sku, sale_price, active)
        values (cat_facial, 'Crema Hidratante Facial Ácido Hialurónico', 'Crema de hidratación profunda de 50ml.', 'FAC-CRE-001', 35.50, true)
        on conflict (sku) do update set name = excluded.name
        returning id into prod_crema;

        -- Insertar Lotes del Producto 1
        if prod_crema is not null then
            insert into public.product_batches (product_id, batch_code, expiration_date, initial_quantity, current_quantity, purchase_price)
            values 
                (prod_crema, 'LOTE-FAC-01', current_date + interval '6 months', 50, 32, 15.00),
                (prod_crema, 'LOTE-FAC-02', current_date + interval '12 months', 100, 100, 14.50)
            on conflict do nothing;
        end if;
    end if;

    if cat_corporal is not null then
        -- Insertar Producto 2
        insert into public.products (category_id, name, description, sku, sale_price, active)
        values (cat_corporal, 'Exfoliante Corporal de Café y Coco', 'Exfoliante revitalizante corporal de 200g.', 'COR-EXF-002', 22.00, true)
        on conflict (sku) do update set name = excluded.name
        returning id into prod_exfoliante;

        -- Insertar Lote del Producto 2
        if prod_exfoliante is not null then
            insert into public.product_batches (product_id, batch_code, expiration_date, initial_quantity, current_quantity, purchase_price)
            values 
                (prod_exfoliante, 'LOTE-COR-01', current_date + interval '2 months', 30, 8, 9.20)
            on conflict do nothing;
        end if;
    end if;
end $$;

-- 5. TABLA DE MOVIMIENTOS DE STOCK (KARDEX)
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
create policy "Cualquier usuario autenticado puede leer movimientos de stock"
    on public.stock_movements for select
    to authenticated
    using (true);

create policy "Los usuarios autenticados pueden registrar movimientos con su propio ID"
    on public.stock_movements for insert
    to authenticated
    with check (auth.uid() = user_id);

-- Función y trigger para actualizar el stock en lotes
create or replace function public.update_batch_stock_on_movement()
returns trigger as $$
begin
    if new.type in ('input', 'adjustment_in') then
        update public.product_batches
        set current_quantity = current_quantity + new.quantity
        where id = new.batch_id;
    elsif new.type in ('output', 'adjustment_out') then
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

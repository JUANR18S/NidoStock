-- =======================================================
-- MIGRACIÓN DE BD - SPRINT 2.2
-- RESTRICCIÓN DE UNICIDAD PARA LOTES DE PRODUCTO
-- =======================================================

-- Agregar constraint de unicidad compuesto en product_batches
alter table public.product_batches
drop constraint if exists unique_product_batch;

alter table public.product_batches
add constraint unique_product_batch unique (product_id, batch_code);

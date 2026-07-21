BEGIN;

-- ==========================================================
-- SCRIPT DE BASE DE DATOS - SPRINT 3
-- NIDOSTOCK / COSMESTOCK: REVERSIÓN DE VENTAS (ROLLBACK NO DESTRUCTIVO)
-- ==========================================================

-- 1. RETIRAR FUNCIONES RPC
DROP FUNCTION IF EXISTS public.cancel_sale(uuid, text);
DROP FUNCTION IF EXISTS public.register_sale(uuid, text, jsonb);

-- 2. RETIRAR ÍNDICES ÚNICOS EN stock_movements
DROP INDEX IF EXISTS public.unique_sale_batch_movement;
DROP INDEX IF EXISTS public.unique_sale_cancellation_batch_movement;

-- 3. RETIRAR ÍNDICES DE RENDIMIENTO Y BÚSQUEDA
DROP INDEX IF EXISTS public.idx_sales_created_at;
DROP INDEX IF EXISTS public.idx_sales_status;
DROP INDEX IF EXISTS public.idx_sales_customer_id;
DROP INDEX IF EXISTS public.idx_sales_user_id;
DROP INDEX IF EXISTS public.idx_sale_items_sale_id;
DROP INDEX IF EXISTS public.idx_sale_items_product_id;
DROP INDEX IF EXISTS public.idx_sale_items_batch_id;

-- NOTA IMPORTANTE:
-- Para no romper la consistencia de los datos históricos de inventario:
-- * La restricción de 'reason' ('stock_movements_reason_check') se mantiene intacta para permitir 
--   valores 'sale' y 'sale_cancellation' ya almacenados en stock_movements.
-- * Se conservan las tablas 'customers', 'sales' y 'sale_items' con sus respectivos permisos 
--   de SELECT para que el personal pueda seguir consultando el historial de facturación de forma pasiva.
-- * Se conservan las políticas de RLS de SELECT en las nuevas tablas.


-- ==========================================================
-- SECCIÓN DE ELIMINACIÓN DE DATOS E HISTÓRICOS (DESTRUCTIVA)
-- ==========================================================
-- ADVERTENCIA: Ejecutar las siguientes líneas eliminará de forma permanente
-- todas las ventas, detalles y clientes registrados. Por defecto están comentadas
-- para salvaguardar la integridad de los datos históricos.
-- Descomenta bajo tu propia responsabilidad si necesitas una limpieza total y desinstalación completa.
--
-- DROP TABLE IF EXISTS public.sale_items CASCADE;
-- DROP TABLE IF EXISTS public.sales CASCADE;
-- DROP TABLE IF EXISTS public.customers CASCADE;
-- DROP SEQUENCE IF EXISTS public.sales_number_seq CASCADE;
-- ALTER TABLE public.product_batches DROP COLUMN IF EXISTS active;
--
-- DO $$
-- DECLARE
--     r RECORD;
-- BEGIN
--     FOR r IN 
--         SELECT conname 
--         FROM pg_constraint 
--         WHERE conrelid = 'public.stock_movements'::regclass 
--           AND contype = 'c' 
--           AND array_to_string(conkey, ',') = (
--               SELECT attnum::text 
--               FROM pg_attribute 
--               WHERE attrelid = 'public.stock_movements'::regclass 
--                 AND attname = 'reason'
--           )
--     LOOP
--         EXECUTE 'ALTER TABLE public.stock_movements DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
--     END LOOP;
-- END $$;
--
-- ALTER TABLE public.stock_movements ADD CONSTRAINT stock_movements_reason_check CHECK (
--     reason IN ('sale', 'purchase', 'expiration', 'damage', 'return', 'internal_consumption', 'physical_count', 'adjustment')
-- );

COMMIT;

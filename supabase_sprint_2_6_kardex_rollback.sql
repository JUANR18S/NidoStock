BEGIN;

-- ==========================================================
-- SCRIPT DE BASE DE DATOS - SPRINT 2.6 ROLLBACK
-- NIDOSTOCK: REVERSIÓN DE CAMBIOS DE KARDEX (STOCK_MOVEMENTS)
-- ==========================================================

-- 1. RETIRAR TRIGGERS Y FUNCIONES NUEVOS DE PRODUCT_BATCHES
DROP TRIGGER IF EXISTS on_batch_created ON public.product_batches;
DROP FUNCTION IF EXISTS public.register_initial_batch_movement();

-- 2. REVERTIR LA FUNCIÓN Y TRIGGER EN STOCK_MOVEMENTS AL ESTADO PREVIO (SPRINT 2.5)
-- Recuperado literalmente de public.update_batch_stock_on_movement() en supabase_sprint_2_5_uom_migration.sql
DROP TRIGGER IF EXISTS on_stock_movement_inserted ON public.stock_movements;

CREATE OR REPLACE FUNCTION public.update_batch_stock_on_movement()
RETURNS trigger AS $$
BEGIN
    IF new.type IN ('input', 'adjustment_in') THEN
        UPDATE public.product_batches
        SET current_quantity = current_quantity + new.quantity
        WHERE id = new.batch_id;
    ELSIF new.type IN ('output', 'adjustment_out') THEN
        -- Verificar si hay suficiente stock disponible
        IF (SELECT current_quantity FROM public.product_batches WHERE id = new.batch_id) < new.quantity THEN
            RAISE EXCEPTION 'Stock insuficiente en el lote especificado.';
        END IF;

        UPDATE public.product_batches
        SET current_quantity = current_quantity - new.quantity
        WHERE id = new.batch_id;
    END IF;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recrear el trigger original en modo AFTER INSERT
CREATE TRIGGER on_stock_movement_inserted
    AFTER INSERT ON public.stock_movements
    FOR EACH ROW EXECUTE PROCEDURE public.update_batch_stock_on_movement();

-- 3. RETIRAR LA CLAVE FORÁNEA AGREGADA HACIA PROFILES
ALTER TABLE public.stock_movements
    DROP CONSTRAINT IF EXISTS stock_movements_user_id_profiles_fkey;

-- 4. RESTAURAR PERMISOS PREVIOS
-- Nota de limitación: Las políticas se restauran basándose en las definiciones literales 
-- de la migración de UOM anterior y los permisos de Sprint 2.1.
REVOKE ALL ON public.stock_movements FROM authenticated;
GRANT SELECT, INSERT ON public.stock_movements TO authenticated;

-- 5. ADVERTENCIA DE ELIMINACIÓN DE COLUMNAS NUEVAS
-- ADVERTENCIA: Ejecutar los siguientes ALTER TABLE DROP COLUMN eliminará de forma 
-- permanente la información histórica de stock previo, stock posterior, motivos y referencias.
-- Descomenta las siguientes líneas bajo tu propio riesgo si requieres un rollback absoluto del esquema.
--
-- ALTER TABLE public.stock_movements DROP COLUMN IF EXISTS previous_stock;
-- ALTER TABLE public.stock_movements DROP COLUMN IF EXISTS new_stock;
-- ALTER TABLE public.stock_movements DROP COLUMN IF EXISTS reason;
-- ALTER TABLE public.stock_movements DROP COLUMN IF EXISTS reference_type;
-- ALTER TABLE public.stock_movements DROP COLUMN IF EXISTS reference_id;

COMMIT;

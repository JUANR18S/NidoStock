BEGIN;

-- ==========================================================
-- SCRIPT DE BASE DE DATOS - SPRINT 2.6 (CORREGIDO)
-- NIDOSTOCK: FORTALECIMIENTO DE KARDEX (STOCK_MOVEMENTS)
-- PARCHE CORRECTIVO FINAL EN TRANSACCIÓN ATÓMICA
-- ==========================================================

-- 1. AGREGAR COLUMNAS PARA TRAZABILIDAD EN stock_movements
ALTER TABLE public.stock_movements
    ADD COLUMN IF NOT EXISTS previous_stock integer CHECK (previous_stock >= 0),
    ADD COLUMN IF NOT EXISTS new_stock integer CHECK (new_stock >= 0),
    ADD COLUMN IF NOT EXISTS reason text CHECK (reason in ('sale', 'purchase', 'expiration', 'damage', 'return', 'internal_consumption', 'physical_count', 'adjustment')),
    ADD COLUMN IF NOT EXISTS reference_type text CHECK (reference_type in ('sale', 'batch_creation', 'adjustment_sheet', 'purchase_order', 'return_ticket', 'stock_movement')),
    ADD COLUMN IF NOT EXISTS reference_id uuid;

-- Establecer valor por defecto para 'reason' en inserciones futuras
ALTER TABLE public.stock_movements 
    ALTER COLUMN reason SET DEFAULT 'adjustment';

-- Actualizar filas existentes si las hubiera para que no tengan nulos en campos obligatorios
UPDATE public.stock_movements
SET reason = 'adjustment'
WHERE reason IS NULL;

-- Hacer 'reason' NOT NULL ahora que tiene valores
ALTER TABLE public.stock_movements 
    ALTER COLUMN reason SET NOT NULL;

-- 2. VALIDAR INTEGRIDAD DE DATOS ANTES DE CREAR LA CLAVE FORÁNEA
DO $$
DECLARE
    v_orphans_count integer;
BEGIN
    SELECT count(1) INTO v_orphans_count
    FROM public.stock_movements sm
    LEFT JOIN public.profiles p ON sm.user_id = p.id
    WHERE p.id IS NULL;

    IF v_orphans_count > 0 THEN
        RAISE EXCEPTION 'La migración no se puede realizar: se encontraron % registros en stock_movements con un user_id que no tiene un perfil asociado en public.profiles.', v_orphans_count;
    END IF;
END $$;

-- 3. CREAR LA CLAVE FORÁNEA SI NO EXISTE EN LA TABLA stock_movements
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'stock_movements_user_id_profiles_fkey'
          AND conrelid = 'public.stock_movements'::regclass
    ) THEN
        ALTER TABLE public.stock_movements
            ADD CONSTRAINT stock_movements_user_id_profiles_fkey 
            FOREIGN KEY (user_id) REFERENCES public.profiles(id) 
            ON DELETE RESTRICT;
    END IF;
END $$;

-- 4. RECONSTRUIR FUNCIÓN PARA ACTUALIZAR STOCK Y REGISTRAR SALDOS PREVIO/POSTERIOR (CON BLOQUEO DE CONCURRENCIA)
-- Se ejecuta BEFORE INSERT para calcular y asignar 'previous_stock' y 'new_stock' atómicamente.
CREATE OR REPLACE FUNCTION public.update_batch_stock_on_movement()
RETURNS trigger AS $$
DECLARE
    v_current_stock integer;
    v_new_stock integer;
    v_initial_qty integer;
BEGIN
    -- A. Si el movimiento proviene de la creación del lote, no actualizamos la tabla product_batches
    --    ya que product_batches ya fue insertado con sus valores correctos.
    IF new.reference_type = 'batch_creation' THEN
        SELECT initial_quantity, current_quantity 
        INTO v_initial_qty, v_current_stock
        FROM public.product_batches
        WHERE id = new.batch_id;

        IF new.type = 'input' THEN
            new.previous_stock := 0;
            new.new_stock := new.quantity;
        ELSIF new.type = 'adjustment_out' THEN
            new.previous_stock := v_initial_qty;
            new.new_stock := v_current_stock;
        ELSIF new.type = 'adjustment_in' THEN
            new.previous_stock := v_initial_qty;
            new.new_stock := v_current_stock;
        END IF;
        
        RETURN new;
    END IF;

    -- B. Flujo estándar para movimientos post-creación:
    --    Se bloquea la fila del lote con FOR UPDATE para prevenir Lost Updates concurrentes.
    SELECT current_quantity INTO v_current_stock
    FROM public.product_batches
    WHERE id = new.batch_id
    FOR UPDATE;

    IF v_current_stock IS NULL THEN
        RAISE EXCEPTION 'El lote especificado no existe.';
    END IF;

    -- Asignar el stock previo
    new.previous_stock := v_current_stock;

    -- Calcular el nuevo stock e intentar actualizar el lote
    IF new.type IN ('input', 'adjustment_in') THEN
        v_new_stock := v_current_stock + new.quantity;
        
        UPDATE public.product_batches
        SET current_quantity = v_new_stock
        WHERE id = new.batch_id;
    ELSIF new.type IN ('output', 'adjustment_out') THEN
        IF v_current_stock < new.quantity THEN
            RAISE EXCEPTION 'Stock insuficiente en el lote especificado.';
        END IF;
        v_new_stock := v_current_stock - new.quantity;

        UPDATE public.product_batches
        SET current_quantity = v_new_stock
        WHERE id = new.batch_id;
    ELSE
        RAISE EXCEPTION 'Tipo de movimiento no válido.';
    END IF;

    -- Asignar el nuevo stock al registro del movimiento
    new.new_stock := v_new_stock;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recrear trigger en stock_movements como BEFORE INSERT
DROP TRIGGER IF EXISTS on_stock_movement_inserted ON public.stock_movements;
CREATE TRIGGER on_stock_movement_inserted
    BEFORE INSERT ON public.stock_movements
    FOR EACH ROW EXECUTE PROCEDURE public.update_batch_stock_on_movement();

-- 5. AUTOMATIZAR LA CREACIÓN DE MOVIMIENTO DE ENTRADA AL CREAR UN LOTE (ATRIBUCIÓN ROBUSTA)
-- Trigger AFTER INSERT en product_batches para insertar el movimiento inicial de entrada
CREATE OR REPLACE FUNCTION public.register_initial_batch_movement()
RETURNS trigger AS $$
DECLARE
    v_user_id uuid;
BEGIN
    v_user_id := auth.uid();
    
    -- Si no hay usuario autenticado (seeding, scripts directos de base de datos, migraciones, etc.)
    -- intentamos atribuir el movimiento a un administrador o cualquier perfil existente
    IF v_user_id IS NULL THEN
        SELECT id INTO v_user_id FROM public.profiles WHERE role = 'admin' ORDER BY created_at LIMIT 1;
        IF v_user_id IS NULL THEN
            SELECT id INTO v_user_id FROM public.profiles ORDER BY created_at LIMIT 1;
        END IF;
    END IF;

    -- Si no hay ningún usuario en la tabla profiles (por ejemplo, en un seed inicial limpio),
    -- simplemente retornamos 'new' sin registrar movimiento para evitar fallar debido al constraint NOT NULL
    IF v_user_id IS NULL THEN
        RETURN new;
    END IF;

    -- 1. Registrar movimiento de entrada por la cantidad inicial recibida
    IF new.initial_quantity > 0 THEN
        INSERT INTO public.stock_movements (
            batch_id,
            user_id,
            type,
            quantity,
            description,
            reason,
            reference_type,
            reference_id
        ) VALUES (
            new.id,
            v_user_id,
            'input',
            new.initial_quantity,
            'Ingreso inicial al registrar lote',
            'purchase',
            'batch_creation',
            new.id
        );
    END IF;

    -- 2. Si la cantidad disponible es menor que la inicial, registramos una salida por la diferencia (Ajuste Out)
    IF new.initial_quantity > new.current_quantity THEN
        INSERT INTO public.stock_movements (
            batch_id,
            user_id,
            type,
            quantity,
            description,
            reason,
            reference_type,
            reference_id
        ) VALUES (
            new.id,
            v_user_id,
            'adjustment_out',
            (new.initial_quantity - new.current_quantity),
            'Ajuste automático: diferencia entre recibido y disponible al registrar lote',
            'adjustment',
            'batch_creation',
            new.id
        );
    -- 3. Si la cantidad disponible es mayor que la inicial, registramos una entrada por la diferencia (Ajuste In)
    ELSIF new.current_quantity > new.initial_quantity THEN
        INSERT INTO public.stock_movements (
            batch_id,
            user_id,
            type,
            quantity,
            description,
            reason,
            reference_type,
            reference_id
        ) VALUES (
            new.id,
            v_user_id,
            'adjustment_in',
            (new.current_quantity - new.initial_quantity),
            'Ajuste automático: stock disponible supera al recibido al registrar lote',
            'adjustment',
            'batch_creation',
            new.id
        );
    END IF;
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_batch_created ON public.product_batches;
CREATE TRIGGER on_batch_created
    AFTER INSERT ON public.product_batches
    FOR EACH ROW EXECUTE PROCEDURE public.register_initial_batch_movement();

-- 6. POLÍTICAS DE SEGURIDAD RLS PARA STOCK_MOVEMENTS
-- Bloqueo de UPDATE y DELETE en stock_movements para todos
DROP POLICY IF EXISTS "Cualquier usuario autenticado puede leer movimientos de stock" ON public.stock_movements;
CREATE POLICY "Cualquier usuario autenticado puede leer movimientos de stock"
    ON public.stock_movements FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Los usuarios autenticados pueden registrar movimientos con su propio ID" ON public.stock_movements;
CREATE POLICY "Los usuarios autenticados pueden registrar movimientos con su propio ID"
    ON public.stock_movements FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Otorga permisos explícitos de SELECT e INSERT, bloqueando UPDATE y DELETE
REVOKE ALL ON public.stock_movements FROM authenticated;
GRANT SELECT, INSERT ON public.stock_movements TO authenticated;

COMMIT;

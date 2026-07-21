BEGIN;

-- ==========================================================
-- SCRIPT DE BASE DE DATOS - SPRINT 3
-- NIDOSTOCK / COSMESTOCK: MÓDULO DE VENTAS (POS) MIGRACIÓN
-- ==========================================================

-- 1. SECUENCIA PARA CONSECUTIVOS DE VENTAS
CREATE SEQUENCE IF NOT EXISTS public.sales_number_seq START WITH 1 INCREMENT BY 1;

-- 2. ASEGURAR COLUMNA active EN LA TABLA EXISTENTE product_batches
ALTER TABLE public.product_batches ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- 3. TABLA: customers (Clientes)
CREATE TABLE IF NOT EXISTS public.customers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name text NOT NULL CHECK (length(trim(full_name)) > 0),
    document_number text UNIQUE,
    phone text,
    email text,
    active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS en customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para customers
DROP POLICY IF EXISTS "Cualquier usuario autenticado puede leer clientes" ON public.customers;
CREATE POLICY "Cualquier usuario autenticado puede leer clientes"
    ON public.customers FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden registrar clientes" ON public.customers;
CREATE POLICY "Usuarios autenticados pueden registrar clientes"
    ON public.customers FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Solo administradores pueden actualizar clientes" ON public.customers;
CREATE POLICY "Solo administradores pueden actualizar clientes"
    ON public.customers FOR UPDATE
    TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));


-- 4. TABLA: sales (Cabecera de Ventas)
CREATE TABLE IF NOT EXISTS public.sales (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_number text NOT NULL UNIQUE,
    customer_id uuid REFERENCES public.customers(id) ON DELETE RESTRICT,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    subtotal numeric(12, 2) NOT NULL CHECK (subtotal >= 0),
    total numeric(12, 2) NOT NULL CHECK (total >= 0),
    payment_method text NOT NULL CHECK (payment_method IN ('efectivo', 'tarjeta', 'transferencia', 'otro')),
    status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled')),
    cancellation_reason text CHECK (length(cancellation_reason) <= 500),
    cancelled_by uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
    cancelled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS en sales
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para sales (Lectura para autenticados, escritura por RPC)
DROP POLICY IF EXISTS "Cualquier usuario autenticado puede leer ventas" ON public.sales;
CREATE POLICY "Cualquier usuario autenticado puede leer ventas"
    ON public.sales FOR SELECT
    TO authenticated
    USING (true);


-- 5. TABLA: sale_items (Detalles de Venta)
CREATE TABLE IF NOT EXISTS public.sale_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE RESTRICT, -- Relación RESTRICT
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    batch_id uuid NOT NULL REFERENCES public.product_batches(id) ON DELETE RESTRICT,
    quantity integer NOT NULL CHECK (quantity > 0), -- Entero compatible con inventario real
    unit_price numeric(10, 2) NOT NULL CHECK (unit_price >= 0),
    subtotal numeric(12, 2) NOT NULL CHECK (subtotal >= 0),
    created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS en sale_items
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para sale_items
DROP POLICY IF EXISTS "Cualquier usuario autenticado puede leer detalles de venta" ON public.sale_items;
CREATE POLICY "Cualquier usuario autenticado puede leer detalles de venta"
    ON public.sale_items FOR SELECT
    TO authenticated
    USING (true);


-- 6. MODIFICAR RESTRICCIÓN DE 'reason' EN stock_movements DE FORMA SEGURA
ALTER TABLE public.stock_movements DROP CONSTRAINT IF EXISTS stock_movements_reason_check;
ALTER TABLE public.stock_movements ADD CONSTRAINT stock_movements_reason_check CHECK (
    reason IN ('sale', 'purchase', 'expiration', 'damage', 'return', 'internal_consumption', 'physical_count', 'adjustment', 'sale_cancellation')
);


-- 7. ÍNDICES DE RENDIMIENTO Y BÚSQUEDA (document_number de clientes omitido por UNIQUE implícito)
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_status ON public.sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON public.sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON public.sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON public.sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_batch_id ON public.sale_items(batch_id);


-- 8. ÍNDICES ÚNICOS PARCIALES EN stock_movements PARA EVITAR DUPLICACIONES
CREATE UNIQUE INDEX IF NOT EXISTS unique_sale_batch_movement 
ON public.stock_movements (reference_id, batch_id) 
WHERE reference_type = 'sale';

CREATE UNIQUE INDEX IF NOT EXISTS unique_sale_cancellation_batch_movement 
ON public.stock_movements (reference_id, batch_id) 
WHERE reference_type = 'sale_cancellation';


-- 9. RPC: register_sale (Registrar venta y calcular FEFO con bloqueos)
CREATE OR REPLACE FUNCTION public.register_sale(
    p_customer_id uuid,
    p_payment_method text,
    p_items jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id uuid;
    v_user_active boolean;
    v_user_role text;
    v_customer_active boolean;
    v_sale_id uuid;
    v_sale_number text;
    
    -- Variables del ciclo de ítems
    v_item jsonb;
    v_product_id uuid;
    v_qty_needed integer;
    v_qty_remaining integer;
    v_product_active boolean;
    v_product_price numeric(10, 2);
    
    -- Variables de lote
    v_batch RECORD;
    v_qty_taken integer;
    v_item_subtotal numeric(12, 2);
    
    -- Totales
    v_subtotal numeric(12, 2) := 0.00;
    v_total numeric(12, 2) := 0.00;
    
    -- Respuesta estructurada
    v_response jsonb;
    v_response_items jsonb := '[]'::jsonb;
BEGIN
    -- A. Validar usuario autenticado
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado.';
    END IF;
    
    SELECT active, role INTO v_user_active, v_user_role
    FROM public.profiles
    WHERE id = v_user_id;
    
    IF v_user_active IS NOT TRUE THEN
        RAISE EXCEPTION 'El usuario no está activo.';
    END IF;
    
    IF v_user_role NOT IN ('admin', 'employee') THEN
        RAISE EXCEPTION 'El usuario no tiene un rol autorizado.';
    END IF;
    
    -- B. Validar método de pago (incluyendo verificación de nulo)
    IF p_payment_method IS NULL OR p_payment_method NOT IN ('efectivo', 'tarjeta', 'transferencia', 'otro') THEN
        RAISE EXCEPTION 'Método de pago no válido.';
    END IF;
    
    -- C. Validar cliente mediante SELECT ... INTO y FOUND
    IF p_customer_id IS NOT NULL THEN
        SELECT active INTO v_customer_active
        FROM public.customers
        WHERE id = p_customer_id;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Cliente no disponible.';
        END IF;
        
        IF v_customer_active IS NOT TRUE THEN
            RAISE EXCEPTION 'Cliente no disponible.';
        END IF;
    END IF;
    
    -- D. Validar p_items completamente antes de cualquier operación
    IF p_items IS NULL OR jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'El carrito de ventas está vacío o tiene formato inválido.';
    END IF;
    
    -- E. Crear tabla temporal para pre-agrupar y validar ítems
    CREATE TEMP TABLE temp_sale_items (
        product_id uuid PRIMARY KEY,
        quantity integer
    ) ON COMMIT DROP;
    
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        -- Validar presencia de propiedades
        IF NOT (v_item ? 'product_id' AND v_item ? 'quantity') THEN
            RAISE EXCEPTION 'Formato de ítem inválido. Debe contener product_id y quantity.';
        END IF;
        
        -- Validar formato de UUID mediante expresión regular
        IF NOT ((v_item->>'product_id') ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') THEN
            RAISE EXCEPTION 'ID de producto inválido.';
        END IF;
        
        -- Validar tipo numérico
        IF jsonb_typeof(v_item->'quantity') IS DISTINCT FROM 'number' THEN
            RAISE EXCEPTION 'Cantidad debe ser un número.';
        END IF;
        
        -- Rechazar cantidades decimales comprobando que el valor numérico sea igual a su truncado
        IF (v_item->'quantity')::numeric != trunc((v_item->'quantity')::numeric) THEN
            RAISE EXCEPTION 'Cantidad no puede ser decimal.';
        END IF;
        
        v_product_id := (v_item->>'product_id')::uuid;
        v_qty_needed := (v_item->>'quantity')::integer;
        
        IF v_qty_needed IS NULL OR v_qty_needed <= 0 THEN
            RAISE EXCEPTION 'Cantidad inválida.';
        END IF;
        
        INSERT INTO temp_sale_items (product_id, quantity)
        VALUES (v_product_id, v_qty_needed)
        ON CONFLICT (product_id) DO UPDATE
        SET quantity = temp_sale_items.quantity + EXCLUDED.quantity;
    END LOOP;
    
    -- F. Crear tabla temporal para almacenar los lotes procesados antes de escribir en base de datos
    CREATE TEMP TABLE temp_processed_items (
        product_id uuid,
        batch_id uuid,
        quantity integer,
        unit_price numeric(10, 2),
        subtotal numeric(12, 2)
    ) ON COMMIT DROP;
    
    -- G. Procesar en orden determinista por product_id para evitar deadlocks
    FOR v_product_id, v_qty_needed IN 
        SELECT product_id, quantity 
        FROM temp_sale_items 
        ORDER BY product_id
    LOOP
        -- Validar producto existente, activo y con precio válido
        SELECT active, sale_price INTO v_product_active, v_product_price
        FROM public.products
        WHERE id = v_product_id;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Producto no disponible.';
        END IF;
        
        IF v_product_active IS NOT TRUE THEN
            RAISE EXCEPTION 'Producto no disponible.';
        END IF;
        
        IF v_product_price IS NULL OR v_product_price < 0 THEN
            RAISE EXCEPTION 'Precio de producto inválido.';
        END IF;
        
        v_qty_remaining := v_qty_needed;
        
        -- Recorrer lotes disponibles aplicando FEFO con bloqueo FOR UPDATE
        FOR v_batch IN 
            SELECT b.id, b.current_quantity, b.batch_code
            FROM public.product_batches b
            JOIN public.products p ON b.product_id = p.id
            WHERE b.product_id = v_product_id
              AND p.active = true
              AND b.active = true -- Lote activo
              AND b.current_quantity > 0
              -- Regla de vencimiento: si vence hoy se puede vender (expiration_date >= CURRENT_DATE). Si no tiene vencimiento, se permite.
              AND (b.expiration_date >= CURRENT_DATE OR b.expiration_date IS NULL)
            ORDER BY b.expiration_date ASC NULLS LAST, b.created_at ASC
            FOR UPDATE
        LOOP
            IF v_qty_remaining <= 0 THEN
                EXIT;
            END IF;
            
            IF v_batch.current_quantity >= v_qty_remaining THEN
                v_qty_taken := v_qty_remaining;
            ELSE
                v_qty_taken := v_batch.current_quantity;
            END IF;
            
            v_qty_remaining := v_qty_remaining - v_qty_taken;
            v_item_subtotal := v_qty_taken * v_product_price;
            
            INSERT INTO temp_processed_items (product_id, batch_id, quantity, unit_price, subtotal)
            VALUES (v_product_id, v_batch.id, v_qty_taken, v_product_price, v_item_subtotal);
            
            v_subtotal := v_subtotal + v_item_subtotal;
            
            v_response_items := v_response_items || jsonb_build_object(
                'batch_code', v_batch.batch_code,
                'quantity', v_qty_taken,
                'price', v_product_price
            );
        END LOOP;
        
        IF v_qty_remaining > 0 THEN
            RAISE EXCEPTION 'Stock insuficiente para completar la venta.';
        END IF;
    END LOOP;
    
    -- H. Realizar la inserción real
    v_sale_id := gen_random_uuid();
    v_sale_number := 'V-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || lpad(nextval('public.sales_number_seq')::text, 6, '0');
    v_total := v_subtotal;
    
    -- Registrar cabecera
    INSERT INTO public.sales (
        id,
        sale_number,
        customer_id,
        user_id,
        subtotal,
        total,
        payment_method,
        status
    ) VALUES (
        v_sale_id,
        v_sale_number,
        p_customer_id,
        v_user_id,
        v_subtotal,
        v_total,
        p_payment_method,
        'completed'
    );
    
    -- Registrar detalles de venta
    INSERT INTO public.sale_items (
        sale_id,
        product_id,
        batch_id,
        quantity,
        unit_price,
        subtotal
    )
    SELECT v_sale_id, product_id, batch_id, quantity, unit_price, subtotal
    FROM temp_processed_items;
    
    -- Registrar movimientos de stock (Esto disparará el trigger que resta el stock real de los lotes)
    FOR v_batch IN SELECT * FROM temp_processed_items LOOP
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
            v_batch.batch_id,
            v_user_id,
            'output',
            v_batch.quantity,
            'Venta de producto consecutivo ' || v_sale_number,
            'sale',
            'sale',
            v_sale_id
        );
    END LOOP;
    
    -- I. Retornar respuesta
    v_response := jsonb_build_object(
        'sale_id', v_sale_id,
        'sale_number', v_sale_number,
        'total', v_total,
        'created_at', now(),
        'items_count', jsonb_array_length(v_response_items)
    );
    
    RETURN v_response;
END;
$$;

REVOKE ALL ON FUNCTION public.register_sale(uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_sale(uuid, text, jsonb) TO authenticated;


-- 10. RPC: cancel_sale (Anulación de venta por Administrador con retorno al mismo lote)
CREATE OR REPLACE FUNCTION public.cancel_sale(
    p_sale_id uuid,
    p_reason text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id uuid;
    v_user_active boolean;
    v_user_role text;
    v_sale RECORD;
    v_item RECORD;
BEGIN
    -- A. Validar usuario autenticado, activo y con rol administrador
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado.';
    END IF;
    
    SELECT active, role INTO v_user_active, v_user_role
    FROM public.profiles
    WHERE id = v_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No tienes autorización para anular esta venta.';
    END IF;
    
    IF v_user_active IS NOT TRUE THEN
        RAISE EXCEPTION 'El usuario administrador no está activo.';
    END IF;
    
    IF v_user_role IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION 'No tienes autorización para anular esta venta.';
    END IF;
    
    -- B. Validar motivo no vacío y longitud máxima
    IF p_reason IS NULL OR trim(p_reason) = '' THEN
        RAISE EXCEPTION 'El motivo de anulación es obligatorio.';
    END IF;
    
    IF length(p_reason) > 500 THEN
        RAISE EXCEPTION 'El motivo de anulación es demasiado largo (máximo 500 caracteres).';
    END IF;
    
    -- C. Obtener y bloquear venta con FOR UPDATE
    SELECT * INTO v_sale
    FROM public.sales
    WHERE id = p_sale_id
    FOR UPDATE;
    
    IF v_sale.id IS NULL THEN
        RAISE EXCEPTION 'Venta inexistente.';
    END IF;
    
    -- D. Validar que no esté anulada
    IF v_sale.status = 'cancelled' THEN
        RAISE EXCEPTION 'La venta ya fue anulada.';
    END IF;
    
    -- E. Recorrer ítems de la venta en orden determinista de batch_id
    FOR v_item IN 
        SELECT id, batch_id, quantity
        FROM public.sale_items
        WHERE sale_id = p_sale_id
        ORDER BY batch_id
    LOOP
        -- Bloquear fila del lote con FOR UPDATE
        PERFORM 1 
        FROM public.product_batches
        WHERE id = v_item.batch_id
        FOR UPDATE;
        
        -- Insertar devolución en stock_movements (Dispara trigger que suma de vuelta a product_batches)
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
            v_item.batch_id,
            v_user_id,
            'adjustment_in',
            v_item.quantity,
            'Retorno de unidades por anulación de venta ' || v_sale.sale_number,
            'sale_cancellation',
            'sale_cancellation',
            p_sale_id
        );
    END LOOP;
    
    -- F. Marcar cabecera como anulada
    UPDATE public.sales
    SET status = 'cancelled',
        cancellation_reason = p_reason,
        cancelled_by = v_user_id,
        cancelled_at = now()
    WHERE id = p_sale_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_sale(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_sale(uuid, text) TO authenticated;


-- 11. AJUSTES DE PERMISOS MÍNIMOS DE ACCESO (GRANTS)
GRANT SELECT ON public.sales TO authenticated;
GRANT SELECT ON public.sale_items TO authenticated;
GRANT SELECT, INSERT ON public.customers TO authenticated;

COMMIT;

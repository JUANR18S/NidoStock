-- ==========================================
-- SCRIPT SQL - SPRINT 2.1
-- SEGURIDAD, ESTABILIDAD Y CONSISTENCIA
-- ==========================================
-- Ejecutar en: Supabase → SQL Editor
-- Orden de ejecución: después de supabase_schema.sql y supabase_sprint_2.sql
-- ==========================================


-- =====================================================================
-- FIX 1: FUNCIÓN HELPER SECURITY DEFINER PARA OBTENER EL ROL DEL USUARIO
-- =====================================================================
-- Problema: las políticas RLS de profiles que usan subconsultas sobre
-- la misma tabla profiles generan recursión infinita.
-- Solución: una función SECURITY DEFINER omite RLS al ejecutarse,
-- rompiendo el ciclo de recursión. Todas las políticas que necesiten
-- verificar el rol del usuario en sesión usarán esta función.

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;


-- =====================================================================
-- FIX 2: REESCRITURA COMPLETA DE POLÍTICAS RLS EN profiles
-- =====================================================================
-- Problema 1: la política FOR ALL "Solo administradores..." incluye SELECT
--             y provoca recursión al evaluar cualquier SELECT sobre profiles.
-- Problema 2: la política FOR UPDATE "Los usuarios pueden actualizar..."
--             no restringe el campo role, permitiendo escalamiento de privilegios.

-- Eliminar todas las políticas anteriores de profiles
DROP POLICY IF EXISTS "Cualquier usuario autenticado puede leer perfiles"
    ON public.profiles;
DROP POLICY IF EXISTS "Los usuarios pueden actualizar su propio perfil (excepto rol)"
    ON public.profiles;
DROP POLICY IF EXISTS "Solo administradores pueden modificar perfiles completamente"
    ON public.profiles;

-- SELECT: cualquier usuario autenticado puede leer todos los perfiles.
-- (Sin subconsulta recursiva — usando la función helper)
CREATE POLICY "profiles_select_authenticated"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

-- INSERT: solo administradores pueden crear perfiles manualmente.
-- (El trigger handle_new_user se ejecuta como SECURITY DEFINER y no necesita política)
CREATE POLICY "profiles_insert_admin_only"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (public.get_my_role() = 'admin');

-- UPDATE: cada usuario puede actualizar SU PROPIO perfil,
-- pero el campo role queda bloqueado: el WITH CHECK garantiza que el
-- nuevo valor de role sea idéntico al valor actual almacenado.
CREATE POLICY "profiles_update_own_no_role_change"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id
        AND role = public.get_my_role()
    );

-- UPDATE (admin override): los administradores pueden actualizar cualquier perfil,
-- incluyendo cambiar el campo role. Se evalúa junto con la política anterior (OR).
CREATE POLICY "profiles_update_admin_full"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (public.get_my_role() = 'admin')
    WITH CHECK (public.get_my_role() = 'admin');

-- DELETE: solo administradores pueden eliminar perfiles.
CREATE POLICY "profiles_delete_admin_only"
    ON public.profiles FOR DELETE
    TO authenticated
    USING (public.get_my_role() = 'admin');


-- =====================================================================
-- FIX 3: REESCRITURA DE POLÍTICAS RLS EN products y product_categories
--         PARA USAR LA FUNCIÓN HELPER Y ELIMINAR SUBCONSULTAS RECURSIVAS
-- =====================================================================

-- product_categories
DROP POLICY IF EXISTS "Solo administradores pueden gestionar categorías"
    ON public.product_categories;

CREATE POLICY "categories_insert_admin_only"
    ON public.product_categories FOR INSERT
    TO authenticated
    WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "categories_update_admin_only"
    ON public.product_categories FOR UPDATE
    TO authenticated
    USING (public.get_my_role() = 'admin')
    WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "categories_delete_admin_only"
    ON public.product_categories FOR DELETE
    TO authenticated
    USING (public.get_my_role() = 'admin');

-- products
DROP POLICY IF EXISTS "Solo administradores pueden insertar productos"
    ON public.products;
DROP POLICY IF EXISTS "Solo administradores pueden actualizar productos"
    ON public.products;
DROP POLICY IF EXISTS "Solo administradores pueden eliminar productos"
    ON public.products;

CREATE POLICY "products_insert_admin_only"
    ON public.products FOR INSERT
    TO authenticated
    WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "products_update_admin_only"
    ON public.products FOR UPDATE
    TO authenticated
    USING (public.get_my_role() = 'admin')
    WITH CHECK (public.get_my_role() = 'admin');

-- DELETE en products: se mantiene bloqueado para forzar uso del campo active.
-- No se recrea la política de DELETE — si no existe política, la operación
-- es denegada por defecto cuando RLS está habilitado.
-- (El soft-delete via active=false sigue siendo la única vía para "eliminar")

-- product_batches
DROP POLICY IF EXISTS "Solo administradores pueden insertar lotes"
    ON public.product_batches;
DROP POLICY IF EXISTS "Solo administradores pueden actualizar lotes"
    ON public.product_batches;
DROP POLICY IF EXISTS "Solo administradores pueden eliminar lotes"
    ON public.product_batches;

CREATE POLICY "batches_insert_admin_only"
    ON public.product_batches FOR INSERT
    TO authenticated
    WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "batches_update_admin_only"
    ON public.product_batches FOR UPDATE
    TO authenticated
    USING (public.get_my_role() = 'admin')
    WITH CHECK (public.get_my_role() = 'admin');

-- DELETE en lotes: no se recrea. Se protege con soft-delete (columna active).
-- Ver Fix 4 a continuación.


-- =====================================================================
-- FIX 4: SOFT DELETE EN product_batches (columna active)
-- =====================================================================
-- Problema: los lotes solo soportaban borrado físico. Eliminar un lote
-- destruye el historial de trazabilidad y caducidad irreversiblemente.
-- Solución: agregar columna active (igual que products). El borrado físico
-- queda sin política RLS (bloqueado). La desactivación vía UPDATE es la
-- única vía para los administradores.

ALTER TABLE public.product_batches
    ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- Actualizar la vista product_stock_summary para filtrar solo lotes activos
-- y con stock > 0 al calcular próximo vencimiento.
CREATE OR REPLACE VIEW public.product_stock_summary AS
SELECT
    p.id,
    p.category_id,
    c.name AS category_name,
    p.name,
    p.description,
    p.sku,
    p.sale_price,
    p.active,
    p.created_at,
    p.updated_at,
    COALESCE(SUM(CASE WHEN b.active THEN b.current_quantity ELSE 0 END), 0)::integer AS total_stock,
    MIN(
        CASE WHEN b.active AND b.current_quantity > 0
             THEN b.expiration_date
             ELSE NULL
        END
    ) AS next_expiration
FROM public.products p
LEFT JOIN public.product_categories c ON p.category_id = c.id
LEFT JOIN public.product_batches b ON p.id = b.product_id
GROUP BY p.id, c.name;


-- =====================================================================
-- FIX 5: RESTRICCIÓN UNIQUE(product_id, batch_code) EN product_batches
-- =====================================================================
-- Problema: sin esta restricción se pueden registrar dos lotes con el
-- mismo código para el mismo producto, duplicando el conteo de stock.

ALTER TABLE public.product_batches
    DROP CONSTRAINT IF EXISTS uq_product_batch_code;

ALTER TABLE public.product_batches
    ADD CONSTRAINT uq_product_batch_code
    UNIQUE (product_id, batch_code);

-- =======================================================
-- SCRIPT DE CONCESIÓN DE PERMISOS SQL (GRANTS)
-- NIDOSTOCK - SPRINT 2.1 / 2.2
-- =======================================================

-- 1. Asegurar uso del esquema público
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- 2. Conceder permisos de lectura y escritura en tablas principales al rol authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_batches TO authenticated;

-- 3. Conceder permisos en movimientos de stock (Kardex) - Nota: delete bloqueado por políticas RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_movements TO authenticated;

-- 4. Conceder permisos de lectura en la vista de resumen de stock
GRANT SELECT ON public.product_stock_summary TO authenticated;

-- 5. Conceder permisos de ejecución en funciones de seguridad
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

-- 6. Recargar esquema en PostgREST
NOTIFY pgrst, 'reload schema';

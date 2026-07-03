-- =======================================================
-- SCRIPT DE CORRECCIÓN DEFINITIVA DE SEGURIDAD
-- =======================================================

-- 1. Crear función auxiliar con SECURITY DEFINER para verificar si el usuario es administrador.
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = user_id AND role::text = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Crear función get_my_role para RLS (soporta role enum o text)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text AS $$
DECLARE
    u_role text;
BEGIN
    SELECT role::text INTO u_role FROM public.profiles WHERE id = auth.uid();
    RETURN u_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.get_my_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

-- 3. POLÍTICAS DE RLS PARA profiles
DROP POLICY IF EXISTS "Usuarios pueden leer su propio perfil o admin todos" ON public.profiles;
DROP POLICY IF EXISTS "Solo administradores pueden actualizar cualquier perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil sin cambiar rol" ON public.profiles;
DROP POLICY IF EXISTS "Cualquier usuario autenticado puede leer perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Los usuarios pueden actualizar su propio perfil (excepto rol)" ON public.profiles;
DROP POLICY IF EXISTS "Solo administradores pueden modificar perfiles completamente" ON public.profiles;
DROP POLICY IF EXISTS "Profiles SELECT policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles UPDATE Admin policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles UPDATE Employee policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles DELETE policy" ON public.profiles;

CREATE POLICY "Profiles SELECT policy"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id OR public.get_my_role() = 'admin');

CREATE POLICY "Profiles UPDATE Admin policy"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (public.get_my_role() = 'admin')
    WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "Profiles UPDATE Employee policy"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id AND public.get_my_role() = 'employee')
    WITH CHECK (auth.uid() = id AND public.get_my_role() = 'employee');

CREATE POLICY "Profiles DELETE policy"
    ON public.profiles FOR DELETE
    TO authenticated
    USING (public.get_my_role() = 'admin');

-- 4. TRIGGER PARA EVITAR ESCALAMIENTO DE ROL
CREATE OR REPLACE FUNCTION public.check_profile_role_update()
RETURNS trigger AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        IF public.get_my_role() IS DISTINCT FROM 'admin' THEN
            RAISE EXCEPTION 'No tienes permisos para modificar el rol de usuario.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_profile_role_update ON public.profiles;
DROP TRIGGER IF EXISTS enforce_profile_role_update ON public.profiles;
CREATE TRIGGER enforce_profile_role_update
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE PROCEDURE public.check_profile_role_update();

-- 5. PERMISOS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_batches TO authenticated;

-- Forzar recarga de cache
NOTIFY pgrst, 'reload schema';

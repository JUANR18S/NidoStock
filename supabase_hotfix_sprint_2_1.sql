-- ==========================================================
-- SCRIPT DE BASE DE DATOS - SPRINT 2.1 & 2.2 (HOTFIX & USUARIOS)
-- NIDOSTOCK: SEGURIDAD, REGISTRO SEGURO Y AUDITORÍA
-- ==========================================================

-- 1. FUNCIÓN SEGURA PARA VERIFICAR SI UN USUARIO ES ADMINISTRADOR
-- Se define con SECURITY DEFINER para evitar recursiones en RLS sobre la tabla profiles.
-- Se asegura el search_path para evitar riesgos de inyección en el esquema.
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = user_id AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 2. AMPLIAR TABLA public.profiles CON COLUMNAS ADICIONALES
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS full_name text,
    ADD COLUMN IF NOT EXISTS active boolean not null default true,
    ADD COLUMN IF NOT EXISTS created_at timestamp with time zone default now();


-- 3. ACTUALIZACIÓN DEL DISPARADOR (TRIGGER) PARA CREAR PERFIL
-- Se ejecuta automáticamente cuando un usuario se registra en Supabase Auth.
-- Extrae de forma segura el nombre completo (full_name) desde raw_user_meta_data.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role, full_name, active)
    VALUES (
        new.id, 
        new.email, 
        'employee', 
        coalesce(new.raw_user_meta_data->>'full_name', ''),
        true
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recrear el trigger en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 4. CORRECCIÓN DE RLS PARA LA TABLA public.profiles
-- Dropear políticas previas
DROP POLICY IF EXISTS "Cualquier usuario autenticado puede leer perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Los usuarios pueden actualizar su propio perfil (excepto rol)" ON public.profiles;
DROP POLICY IF EXISTS "Solo administradores pueden modificar perfiles completamente" ON public.profiles;
DROP POLICY IF EXISTS "Solo administradores pueden actualizar cualquier perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil sin cambiar rol" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios pueden leer su propio perfil o admin todos" ON public.profiles;

-- Política de lectura: Un usuario solo lee su propio perfil, los administradores leen todos
CREATE POLICY "Usuarios pueden leer su propio perfil o admin todos"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id OR public.is_admin(auth.uid()));

-- Política de actualización para administradores: Pueden modificar cualquier campo
CREATE POLICY "Solo administradores pueden actualizar cualquier perfil"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- Política de actualización para usuarios comunes: Solo pueden modificar su propio perfil sin alterar el rol
CREATE POLICY "Usuarios pueden actualizar su propio perfil sin cambiar rol"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id AND role = 'employee');

-- Trigger de validación a nivel de base de datos para bloquear cambios en el rol
CREATE OR REPLACE FUNCTION public.check_profile_role_update()
RETURNS trigger AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'No tienes permisos para modificar el rol de usuario.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS enforce_profile_role_update ON public.profiles;
CREATE TRIGGER enforce_profile_role_update
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE PROCEDURE public.check_profile_role_update();


-- 5. CORRECCIÓN DE RLS PARA LA TABLA public.product_categories
DROP POLICY IF EXISTS "Solo administradores pueden gestionar categorías" ON public.product_categories;

CREATE POLICY "Solo administradores pueden gestionar categorías"
    ON public.product_categories FOR ALL
    TO authenticated
    USING (public.is_admin(auth.uid()));


-- 6. CORRECCIÓN DE RLS PARA LA TABLA public.products (BLOQUEO DE DELETE FÍSICO)
DROP POLICY IF EXISTS "Solo administradores pueden insertar productos" ON public.products;
DROP POLICY IF EXISTS "Solo administradores pueden actualizar productos" ON public.products;
DROP POLICY IF EXISTS "Solo administradores pueden eliminar productos" ON public.products;

CREATE POLICY "Solo administradores pueden insertar productos"
    ON public.products FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Solo administradores pueden actualizar productos"
    ON public.products FOR UPDATE
    TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- Nota: No se define ninguna política de DELETE para products, bloqueando por completo la eliminación física.


-- 7. CORRECCIÓN DE RLS Y MEJORAS EN LA TABLA public.product_batches (BLOQUEO DE DELETE FÍSICO, UNICIDAD Y AUDITORÍA)
DROP POLICY IF EXISTS "Solo administradores pueden insertar lotes" ON public.product_batches;
DROP POLICY IF EXISTS "Solo administradores pueden actualizar lotes" ON public.product_batches;
DROP POLICY IF EXISTS "Solo administradores pueden eliminar lotes" ON public.product_batches;

CREATE POLICY "Solo administradores pueden insertar lotes"
    ON public.product_batches FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Solo administradores pueden actualizar lotes"
    ON public.product_batches FOR UPDATE
    TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- Restricción UNIQUE para evitar duplicidad de lotes por producto
ALTER TABLE public.product_batches 
    DROP CONSTRAINT IF EXISTS product_batches_product_id_batch_code_key;
ALTER TABLE public.product_batches
    ADD CONSTRAINT product_batches_product_id_batch_code_key UNIQUE(product_id, batch_code);

-- Columna de auditoría updated_at
ALTER TABLE public.product_batches
    ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone default now();

-- Trigger para updated_at en product_batches
DROP TRIGGER IF EXISTS on_product_batch_updated ON public.product_batches;
CREATE TRIGGER on_product_batch_updated
    BEFORE UPDATE ON public.product_batches
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

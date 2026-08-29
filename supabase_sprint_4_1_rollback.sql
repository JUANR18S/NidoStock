BEGIN;

-- ============================================================================
-- SCRIPT DE REVERSIÓN - SPRINT 4.1
-- NIDOSTOCK / COSMESTOCK
-- 
-- Descripción: Eliminación ordenada y segura de las tablas public.organization_members
-- y public.organizations sin utilizar sentencias CASCADE.
-- ============================================================================

-- 1. COMPROBAR EXISTENCIA Y DETENER SI CONTIENEN DATOS
DO $$
DECLARE
    v_members_count integer := 0;
    v_orgs_count integer := 0;
BEGIN
    -- Verificar si existe public.organization_members y contar registros
    IF EXISTS (
        SELECT 1 
        FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE n.nspname = 'public' AND c.relname = 'organization_members'
    ) THEN
        SELECT count(1) INTO v_members_count FROM public.organization_members;
    END IF;

    -- Verificar si existe public.organizations y contar registros
    IF EXISTS (
        SELECT 1 
        FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE n.nspname = 'public' AND c.relname = 'organizations'
    ) THEN
        SELECT count(1) INTO v_orgs_count FROM public.organizations;
    END IF;

    -- Si alguna tabla contiene datos, abortar la reversión para prevenir pérdida accidental de información
    IF v_members_count > 0 OR v_orgs_count > 0 THEN
        RAISE EXCEPTION 'Cancelando reversión del Sprint 4.1: Se detectaron registros en organization_members (% filas) u organizations (% filas). Realice un análisis manual antes de continuar.', v_members_count, v_orgs_count;
    END IF;
END $$;

-- 2. ELIMINAR TABLA DEPENDIENTE (MIEMBROS DE ORGANIZACIÓN)
DROP TABLE IF EXISTS public.organization_members;

-- 3. ELIMINAR TABLA PRINCIPAL (ORGANIZACIONES)
DROP TABLE IF EXISTS public.organizations;

COMMIT;

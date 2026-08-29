BEGIN;

-- ============================================================================
-- MIGRACIÓN BASE DE MULTITENENCIA - SPRINT 4.1
-- NIDOSTOCK / COSMESTOCK
-- 
-- Descripción: Creación de las tablas maestras public.organizations y
-- public.organization_members con RLS (Row Level Security o seguridad a nivel
-- de fila) habilitado en modo de acceso denegado por defecto.
-- ============================================================================

-- 1. VERIFICACIÓN INICIAL DE COLISIONES EN EL CATÁLOGO PG_CLASS
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' 
          AND c.relname IN ('organizations', 'organization_members')
    ) THEN
        RAISE EXCEPTION 'Imposible aplicar la migración del Sprint 4.1: Ya existen objetos con el nombre organizations u organization_members en el esquema public.';
    END IF;
END $$;

-- 2. CREACIÓN DE LA TABLA DE ORGANIZACIONES (ORGANIZATIONS)
CREATE TABLE public.organizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL CHECK (length(trim(name)) > 0),
    slug text UNIQUE NOT NULL,
    timezone text NOT NULL DEFAULT 'America/Bogota',
    active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS (Row Level Security o seguridad a nivel de fila)
-- Nota: Al no crear políticas permisivas, la tabla queda en denegación por defecto para la API externa
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 3. CREACIÓN DE LA TABLA DE MIEMBROS DE ORGANIZACIÓN (ORGANIZATION_MEMBERS)
CREATE TABLE public.organization_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    role text NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
    active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT unique_user_organization UNIQUE (organization_id, user_id)
);

-- Habilitar RLS (Row Level Security o seguridad a nivel de fila)
-- Nota: Al no crear políticas permisivas, la tabla queda en denegación por defecto para la API externa
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

COMMIT;

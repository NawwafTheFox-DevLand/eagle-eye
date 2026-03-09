-- ============================================================
-- Eagle Eye — NUKE OLD SCHEMA
-- Run this FIRST in Supabase SQL Editor before new migrations
-- This drops ALL tables, types, sequences, and functions
-- from the previous build
-- ============================================================

-- Drop all tables in public schema
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;

-- Drop all custom enum types
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT typname FROM pg_type t 
              JOIN pg_namespace n ON t.typnamespace = n.oid 
              WHERE n.nspname = 'public' AND t.typtype = 'e') LOOP
        EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
    END LOOP;
END $$;

-- Drop all sequences
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT sequencename FROM pg_sequences WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP SEQUENCE IF EXISTS public.' || quote_ident(r.sequencename) || ' CASCADE';
    END LOOP;
END $$;

-- Drop all custom functions in public schema
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT p.oid::regprocedure::text as func_signature
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public'
    ) LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_signature || ' CASCADE';
    END LOOP;
END $$;

-- Verify everything is clean
SELECT 'Tables remaining:' as check_type, count(*) as count 
FROM pg_tables WHERE schemaname = 'public'
UNION ALL
SELECT 'Types remaining:', count(*) 
FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid 
WHERE n.nspname = 'public' AND t.typtype = 'e'
UNION ALL
SELECT 'Sequences remaining:', count(*) 
FROM pg_sequences WHERE schemaname = 'public';

-- All counts should be 0

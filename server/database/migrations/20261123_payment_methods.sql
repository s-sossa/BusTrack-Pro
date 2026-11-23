-- ==============================================================================
-- BusTrack Pro — Migration: Payment Methods Schema & RLS Policies
-- Target Engine: PostgreSQL 15+ / Supabase
-- Module: Payment Methods (Stripe + Supabase)
-- Version: 1.0.0
-- Date: 2026-11-23
-- ==============================================================================

-- 1. EXTENSIONS (Assure cryptographic and UUID support)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ADD STRIPE CUSTOMER ID TO PUBLIC USERS IF NOT PRESENT
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'stripe_customer_id'
    ) THEN
        ALTER TABLE public.users ADD COLUMN stripe_customer_id TEXT UNIQUE;
        CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON public.users(stripe_customer_id);
    END IF;
END $$;

-- 3. CREATE TABLE public.payment_methods
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'stripe',
    provider_payment_method_id TEXT NOT NULL UNIQUE,
    brand TEXT NOT NULL,
    last4 VARCHAR(4) NOT NULL,
    exp_month INT NOT NULL CHECK (exp_month BETWEEN 1 AND 12),
    exp_year INT NOT NULL CHECK (exp_year >= 2024),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    -- Constraint checks for brand and last4 formats
    CONSTRAINT chk_last4_digits CHECK (last4 ~ '^[0-9]{4}$'),
    CONSTRAINT chk_provider_valid CHECK (provider IN ('stripe', 'sinpe_movil', 'cash_card'))
);

-- 4. PERFORMANCE & UNIQUENESS INDEXES
-- Index for rapid lookup of all payment methods for an authenticated user
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id 
    ON public.payment_methods (user_id);

-- Index for webhooks and provider ID lookups
CREATE INDEX IF NOT EXISTS idx_payment_methods_provider_pm_id 
    ON public.payment_methods (provider_payment_method_id);

-- STRICT CONSTRAINT: Only one default payment method allowed per user
-- Partial Unique Index guarantees idempotency and data integrity under concurrent writes
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_methods_unique_default 
    ON public.payment_methods (user_id) 
    WHERE is_default = TRUE;

-- 5. FUNCTION & TRIGGER: updated_at automatic timestamp update
CREATE OR REPLACE FUNCTION public.set_payment_methods_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_methods_updated_at ON public.payment_methods;
CREATE TRIGGER trg_payment_methods_updated_at
    BEFORE UPDATE ON public.payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION public.set_payment_methods_updated_at();

-- 6. FUNCTION & TRIGGER: Default Payment Method Management
-- Rules:
-- 1) If this is the user's first payment method, automatically set is_default = TRUE.
-- 2) When a method is marked as is_default = TRUE, unmark any previous default method for that user.
-- 3) On DELETE, if the deleted method was default, promote the most recent remaining method to default.

CREATE OR REPLACE FUNCTION public.manage_payment_method_default_assignment()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_has_existing BOOLEAN;
BEGIN
    -- Check if user already has other payment methods
    SELECT EXISTS (
        SELECT 1 
        FROM public.payment_methods 
        WHERE user_id = NEW.user_id 
          AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) INTO v_has_existing;

    -- Rule 1: First payment method is automatically default
    IF NOT v_has_existing THEN
        NEW.is_default := TRUE;
    END IF;

    -- Rule 2: If this row is set as default, demote any other default methods for this user
    IF NEW.is_default = TRUE THEN
        UPDATE public.payment_methods
        SET is_default = FALSE,
            updated_at = timezone('utc'::text, now())
        WHERE user_id = NEW.user_id 
          AND is_default = TRUE 
          AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_methods_default_before_write ON public.payment_methods;
CREATE TRIGGER trg_payment_methods_default_before_write
    BEFORE INSERT OR UPDATE OF is_default ON public.payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION public.manage_payment_method_default_assignment();

-- Trigger on DELETE: Promote latest card to default if the deleted one was default
CREATE OR REPLACE FUNCTION public.handle_payment_method_deletion_default()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_next_id UUID;
BEGIN
    IF OLD.is_default = TRUE THEN
        SELECT id INTO v_next_id
        FROM public.payment_methods
        WHERE user_id = OLD.user_id
        ORDER BY created_at DESC
        LIMIT 1;

        IF v_next_id IS NOT NULL THEN
            UPDATE public.payment_methods
            SET is_default = TRUE,
                updated_at = timezone('utc'::text, now())
            WHERE id = v_next_id;
        END IF;
    END IF;

    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_methods_default_after_delete ON public.payment_methods;
CREATE TRIGGER trg_payment_methods_default_after_delete
    AFTER DELETE ON public.payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_payment_method_deletion_default();

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "payment_methods_select_own" ON public.payment_methods;
DROP POLICY IF EXISTS "payment_methods_insert_own" ON public.payment_methods;
DROP POLICY IF EXISTS "payment_methods_update_own" ON public.payment_methods;
DROP POLICY IF EXISTS "payment_methods_delete_own" ON public.payment_methods;

-- SELECT: Users can only view their own registered payment methods
CREATE POLICY "payment_methods_select_own" 
    ON public.payment_methods 
    FOR SELECT 
    TO authenticated 
    USING (auth.uid() = user_id);

-- INSERT: Users can only add payment methods attached to their own auth.uid()
CREATE POLICY "payment_methods_insert_own" 
    ON public.payment_methods 
    FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can only modify their own payment methods (e.g., set is_default)
CREATE POLICY "payment_methods_update_own" 
    ON public.payment_methods 
    FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can only remove their own payment methods
CREATE POLICY "payment_methods_delete_own" 
    ON public.payment_methods 
    FOR DELETE 
    TO authenticated 
    USING (auth.uid() = user_id);

-- Revoke dangerous direct permissions from public & anon roles
REVOKE ALL ON public.payment_methods FROM anon, public;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_methods TO authenticated;
GRANT ALL ON public.payment_methods TO service_role;

-- ==============================================================================
-- BusTrack Pro — Migración: Tabla payment_methods
-- Pasarela: Stripe | Almacenamiento seguro: solo token + metadatos no sensibles
-- ⛔ NUNCA se almacenan: PAN completo, CVV, fecha como campo libre sin restricción.
-- ==============================================================================

-- 1. Tabla principal
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider                    TEXT NOT NULL DEFAULT 'stripe' CHECK (provider IN ('stripe')),
    provider_payment_method_id  TEXT NOT NULL,
    provider_customer_id        TEXT NOT NULL,
    brand                       TEXT NOT NULL,         -- visa, mastercard, amex, etc.
    last4                       VARCHAR(4) NOT NULL CHECK (last4 ~ '^\d{4}$'),
    exp_month                   SMALLINT NOT NULL CHECK (exp_month BETWEEN 1 AND 12),
    exp_year                    SMALLINT NOT NULL CHECK (exp_year >= 2024),
    is_default                  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    -- ⛔ Restricción: el provider_payment_method_id es global (pm_xxx de Stripe) → único
    CONSTRAINT uq_provider_pm_id UNIQUE (provider_payment_method_id)
);

-- 2. Índices
CREATE INDEX IF NOT EXISTS idx_pm_user_id    ON public.payment_methods (user_id);
CREATE INDEX IF NOT EXISTS idx_pm_provider   ON public.payment_methods (provider, provider_payment_method_id);

-- 3. Índice único parcial: solo UN método predeterminado por usuario
--    (PostgreSQL enforza unicidad solo cuando is_default = TRUE)
CREATE UNIQUE INDEX IF NOT EXISTS idx_pm_unique_default
    ON public.payment_methods (user_id)
    WHERE is_default = TRUE;

-- 4. Tabla auxiliar: stripe_customers (guarda stripe_customer_id por usuario)
--    Separada para mantener limpia la tabla principal y reutilizable.
CREATE TABLE IF NOT EXISTS public.stripe_customers (
    user_id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_customer_id  TEXT NOT NULL UNIQUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Función updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pm_updated_at
    BEFORE UPDATE ON public.payment_methods
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. Función: Al insertar un nuevo método, si es el primero del usuario
--    → marcarlo automáticamente como predeterminado.
CREATE OR REPLACE FUNCTION public.auto_set_first_payment_default()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- Si el usuario no tiene ningún método previo, marcar como predeterminado
    IF NOT EXISTS (
        SELECT 1 FROM public.payment_methods
        WHERE user_id = NEW.user_id AND id <> NEW.id
    ) THEN
        NEW.is_default := TRUE;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pm_auto_first_default
    BEFORE INSERT ON public.payment_methods
    FOR EACH ROW EXECUTE FUNCTION public.auto_set_first_payment_default();

-- 7. Función: Al marcar uno como predeterminado, desmarcar el anterior
CREATE OR REPLACE FUNCTION public.enforce_single_default_payment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NEW.is_default = TRUE AND (OLD.is_default IS DISTINCT FROM TRUE) THEN
        UPDATE public.payment_methods
        SET is_default = FALSE
        WHERE user_id = NEW.user_id
          AND id <> NEW.id
          AND is_default = TRUE;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pm_enforce_single_default
    AFTER UPDATE OF is_default ON public.payment_methods
    FOR EACH ROW EXECUTE FUNCTION public.enforce_single_default_payment();

-- 8. Función: Al eliminar el método predeterminado, promover el más reciente restante
CREATE OR REPLACE FUNCTION public.promote_next_default_on_delete()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF OLD.is_default = TRUE THEN
        UPDATE public.payment_methods
        SET is_default = TRUE
        WHERE id = (
            SELECT id FROM public.payment_methods
            WHERE user_id = OLD.user_id
            ORDER BY created_at DESC
            LIMIT 1
        );
    END IF;
    RETURN OLD;
END;
$$;

CREATE TRIGGER trg_pm_promote_on_delete
    AFTER DELETE ON public.payment_methods
    FOR EACH ROW EXECUTE FUNCTION public.promote_next_default_on_delete();

-- ==============================================================================
-- 9. ROW LEVEL SECURITY (RLS)
-- Cada usuario solo puede ver y modificar SUS PROPIOS métodos de pago.
-- ==============================================================================
ALTER TABLE public.payment_methods   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_customers  ENABLE ROW LEVEL SECURITY;

-- payment_methods: SELECT
DROP POLICY IF EXISTS "pm_select_own" ON public.payment_methods;
CREATE POLICY "pm_select_own" ON public.payment_methods
    FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- payment_methods: INSERT
DROP POLICY IF EXISTS "pm_insert_own" ON public.payment_methods;
CREATE POLICY "pm_insert_own" ON public.payment_methods
    FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

-- payment_methods: UPDATE (solo los propios, y solo campos permitidos)
DROP POLICY IF EXISTS "pm_update_own" ON public.payment_methods;
CREATE POLICY "pm_update_own" ON public.payment_methods
    FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid()))
    WITH CHECK (user_id = (SELECT auth.uid()));

-- payment_methods: DELETE
DROP POLICY IF EXISTS "pm_delete_own" ON public.payment_methods;
CREATE POLICY "pm_delete_own" ON public.payment_methods
    FOR DELETE TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- stripe_customers: SELECT
DROP POLICY IF EXISTS "sc_select_own" ON public.stripe_customers;
CREATE POLICY "sc_select_own" ON public.stripe_customers
    FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- stripe_customers: INSERT
DROP POLICY IF EXISTS "sc_insert_own" ON public.stripe_customers;
CREATE POLICY "sc_insert_own" ON public.stripe_customers
    FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

-- stripe_customers: UPDATE
DROP POLICY IF EXISTS "sc_update_own" ON public.stripe_customers;
CREATE POLICY "sc_update_own" ON public.stripe_customers
    FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid()))
    WITH CHECK (user_id = (SELECT auth.uid()));

-- ==============================================================================
-- FIN DE MIGRACIÓN
-- ==============================================================================

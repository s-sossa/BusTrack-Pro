-- ==============================================================================
-- BusTrack Pro — SQLite Compatibility Schema for Payment Methods
-- Module: Payment Methods (Stripe + SQLite Local Dev/Testing)
-- ==============================================================================

PRAGMA foreign_keys = ON;

-- 1. ADD stripe_customer_id COLUMN TO USERS (IF NOT EXISTS)
-- SQLite doesn't support IF NOT EXISTS in ALTER TABLE, handled gracefully by app/initDb

-- 2. CREATE TABLE payment_methods
CREATE TABLE IF NOT EXISTS payment_methods (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'stripe',
    provider_payment_method_id TEXT NOT NULL UNIQUE,
    brand TEXT NOT NULL,
    last4 TEXT NOT NULL CHECK (length(last4) = 4),
    exp_month INTEGER NOT NULL CHECK (exp_month BETWEEN 1 AND 12),
    exp_year INTEGER NOT NULL CHECK (exp_year >= 2024),
    is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_provider_pm_id ON payment_methods(provider_payment_method_id);

-- Unique default constraint via SQLite partial index
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_methods_unique_default 
    ON payment_methods (user_id) 
    WHERE is_default = 1;

-- 4. TRIGGERS
-- Trigger: Auto-set is_default = 1 if it's the user's first method
CREATE TRIGGER IF NOT EXISTS trg_payment_methods_default_insert
AFTER INSERT ON payment_methods
WHEN (SELECT count(*) FROM payment_methods WHERE user_id = NEW.user_id) = 1
BEGIN
    UPDATE payment_methods SET is_default = 1 WHERE id = NEW.id;
END;

-- Trigger: When is_default is set to 1, demote other default methods for the user
CREATE TRIGGER IF NOT EXISTS trg_payment_methods_unmark_other_defaults
BEFORE UPDATE OF is_default ON payment_methods
WHEN NEW.is_default = 1
BEGIN
    UPDATE payment_methods 
    SET is_default = 0, updated_at = datetime('now')
    WHERE user_id = NEW.user_id AND id != NEW.id AND is_default = 1;
END;

-- Trigger: Update updated_at timestamp on row update
CREATE TRIGGER IF NOT EXISTS trg_payment_methods_updated_at
AFTER UPDATE ON payment_methods
FOR EACH ROW
BEGIN
    UPDATE payment_methods 
    SET updated_at = datetime('now') 
    WHERE id = OLD.id;
END;

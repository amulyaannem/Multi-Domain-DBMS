-- Phase 5 backward-compatible schema reliability migration
-- Inspect live schema before applying. This migration only adds missing objects
-- and constraints; it does not reset or delete any existing records.

BEGIN;

CREATE TABLE IF NOT EXISTS app_user (
  user_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_app_user_email UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS business_member (
  membership_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
  business_id BIGINT NOT NULL REFERENCES business(business_id) ON DELETE CASCADE,
  member_role VARCHAR(20) NOT NULL DEFAULT 'owner'
    CHECK (member_role IN ('owner','manager','staff')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_business_member UNIQUE (business_id, user_id)
);

ALTER TABLE order_details
  ADD COLUMN IF NOT EXISTS variant_id BIGINT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'order_details_variant_fkey'
  ) THEN
    ALTER TABLE order_details
      ADD CONSTRAINT order_details_variant_fkey
      FOREIGN KEY (business_id, product_id, variant_id)
      REFERENCES product_variant(business_id, product_id, variant_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS order_stock_deduction (
  deduction_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  business_id BIGINT NOT NULL,
  order_id BIGINT NOT NULL,
  deducted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_order_stock_deduction UNIQUE (business_id, order_id),
  CONSTRAINT fk_stock_deduction_order
    FOREIGN KEY (business_id, order_id)
    REFERENCES orders(business_id, order_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS order_stock_restoration (
  restoration_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  business_id BIGINT NOT NULL,
  order_id BIGINT NOT NULL,
  restored_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_order_stock_restoration UNIQUE (business_id, order_id),
  CONSTRAINT fk_stock_restoration_order
    FOREIGN KEY (business_id, order_id)
    REFERENCES orders(business_id, order_id) ON DELETE RESTRICT
);

COMMIT;

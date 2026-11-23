-- Business Database Management System
-- PostgreSQL 15+
-- Shared-schema, multi-business design. Domain modules are enabled per business;
-- selecting a domain does not dynamically create or drop physical tables.

BEGIN;

-- 1. BUSINESS CONFIGURATION
CREATE TABLE business_type (
    business_type_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    type_name VARCHAR(80) NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE business (
    business_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    business_type_id BIGINT NOT NULL REFERENCES business_type(business_type_id),
    business_name VARCHAR(150) NOT NULL,
    currency_code CHAR(3) NOT NULL DEFAULT 'INR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (business_id, business_type_id)
);

CREATE TABLE module (
    module_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    module_name VARCHAR(80) NOT NULL UNIQUE,
    module_key VARCHAR(80) NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE business_type_module (
    business_type_id BIGINT NOT NULL REFERENCES business_type(business_type_id) ON DELETE CASCADE,
    module_id BIGINT NOT NULL REFERENCES module(module_id) ON DELETE RESTRICT,
    default_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (business_type_id, module_id)
);

CREATE TABLE business_module (
    business_id BIGINT NOT NULL REFERENCES business(business_id) ON DELETE CASCADE,
    module_id BIGINT NOT NULL REFERENCES module(module_id) ON DELETE RESTRICT,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    activated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (business_id, module_id)
);

-- 2. STAFF AND CUSTOMERS
CREATE TABLE role (
    role_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_name VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE employee (
    employee_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    business_id BIGINT NOT NULL REFERENCES business(business_id) ON DELETE CASCADE,
    role_id BIGINT REFERENCES role(role_id) ON DELETE SET NULL,
    full_name VARCHAR(120) NOT NULL,
    phone VARCHAR(25),
    email VARCHAR(254),
    address TEXT,
    hire_date DATE,
    salary NUMERIC(12,2) CHECK (salary IS NULL OR salary >= 0),
    UNIQUE (business_id, employee_id)
);

CREATE TABLE customer (
    customer_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    business_id BIGINT NOT NULL REFERENCES business(business_id) ON DELETE CASCADE,
    customer_name VARCHAR(120) NOT NULL,
    phone VARCHAR(25),
    email VARCHAR(254),
    address TEXT,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (business_id, customer_id)
);

CREATE TABLE app_user (
    user_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE business_member (
    membership_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
    business_id BIGINT NOT NULL REFERENCES business(business_id) ON DELETE CASCADE,
    member_role VARCHAR(20) NOT NULL DEFAULT 'owner'
        CHECK (member_role IN ('owner','manager','staff')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (business_id, user_id)
);

-- 3. PRODUCTS, INVENTORY AND SUPPLIERS
CREATE TABLE product (
    product_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    business_id BIGINT NOT NULL REFERENCES business(business_id) ON DELETE CASCADE,
    product_name VARCHAR(150) NOT NULL,
    category VARCHAR(80),
    description TEXT,
    unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    cost_price NUMERIC(12,2) CHECK (cost_price IS NULL OR cost_price >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (business_id, product_id)
);

CREATE TABLE inventory (
    inventory_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    business_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL UNIQUE,
    quantity NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    reorder_level NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id, product_id)
        REFERENCES product(business_id, product_id) ON DELETE CASCADE
);

CREATE TABLE supplier (
    supplier_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    business_id BIGINT NOT NULL REFERENCES business(business_id) ON DELETE CASCADE,
    supplier_name VARCHAR(150) NOT NULL,
    phone VARCHAR(25),
    email VARCHAR(254),
    address TEXT,
    UNIQUE (business_id, supplier_id)
);

CREATE TABLE product_supplier (
    business_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    supplier_id BIGINT NOT NULL,
    supplier_price NUMERIC(12,2) CHECK (supplier_price IS NULL OR supplier_price >= 0),
    PRIMARY KEY (product_id, supplier_id),
    FOREIGN KEY (business_id, product_id)
        REFERENCES product(business_id, product_id) ON DELETE CASCADE,
    FOREIGN KEY (business_id, supplier_id)
        REFERENCES supplier(business_id, supplier_id) ON DELETE CASCADE
);

-- 4. ORDERS AND ORDER LINES
-- customer_id is nullable for walk-in sales. Referenced customer/employee rows
-- cannot be deleted while used by orders, avoiding accidental loss of history.
CREATE TABLE orders (
    order_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    business_id BIGINT NOT NULL REFERENCES business(business_id) ON DELETE CASCADE,
    customer_id BIGINT,
    employee_id BIGINT,
    order_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    order_status VARCHAR(25) NOT NULL DEFAULT 'placed'
        CHECK (order_status IN ('draft','placed','processing','completed','cancelled')),
    payment_method VARCHAR(30),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (payment_status IN ('pending','paid','partially_paid','refunded')),
    delivery_date TIMESTAMPTZ,
    delivery_status VARCHAR(25)
        CHECK (delivery_status IS NULL OR delivery_status IN
        ('not_required','pending','preparing','dispatched','delivered','cancelled')),
    UNIQUE (business_id, order_id),
    FOREIGN KEY (business_id, customer_id)
        REFERENCES customer(business_id, customer_id) ON DELETE RESTRICT,
    FOREIGN KEY (business_id, employee_id)
        REFERENCES employee(business_id, employee_id) ON DELETE RESTRICT
);

CREATE TABLE order_details (
    order_detail_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    business_id BIGINT NOT NULL,
    order_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    variant_id BIGINT,
    quantity_ordered NUMERIC(12,3) NOT NULL CHECK (quantity_ordered > 0),
    unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    line_total NUMERIC(14,2) GENERATED ALWAYS AS
        (ROUND(quantity_ordered * unit_price, 2)) STORED,
    UNIQUE (order_id, product_id, variant_id),
    FOREIGN KEY (business_id, order_id)
        REFERENCES orders(business_id, order_id) ON DELETE CASCADE,
    FOREIGN KEY (business_id, product_id)
        REFERENCES product(business_id, product_id) ON DELETE RESTRICT
);

-- 5. EXPENSES
CREATE TABLE expense_category (
    expense_category_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    business_id BIGINT NOT NULL REFERENCES business(business_id) ON DELETE CASCADE,
    category_name VARCHAR(80) NOT NULL,
    UNIQUE (business_id, expense_category_id),
    UNIQUE (business_id, category_name)
);

CREATE TABLE expense (
    expense_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    business_id BIGINT NOT NULL,
    expense_category_id BIGINT NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method VARCHAR(30),
    description TEXT,
    FOREIGN KEY (business_id, expense_category_id)
        REFERENCES expense_category(business_id, expense_category_id) ON DELETE RESTRICT
);

-- 6. DOMAIN EXTENSIONS
-- Bakery
CREATE TABLE bakery_product (
    business_id BIGINT NOT NULL,
    product_id BIGINT PRIMARY KEY,
    flavour VARCHAR(80),
    shelf_life_days INTEGER CHECK (shelf_life_days IS NULL OR shelf_life_days > 0),
    FOREIGN KEY (business_id, product_id)
        REFERENCES product(business_id, product_id) ON DELETE CASCADE
);

CREATE TABLE recipe (
    recipe_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    business_id BIGINT NOT NULL REFERENCES business(business_id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL UNIQUE,
    recipe_name VARCHAR(120) NOT NULL,
    instructions TEXT,
    FOREIGN KEY (business_id, product_id)
        REFERENCES product(business_id, product_id) ON DELETE CASCADE
);

CREATE TABLE ingredient (
    ingredient_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    business_id BIGINT NOT NULL REFERENCES business(business_id) ON DELETE CASCADE,
    ingredient_name VARCHAR(120) NOT NULL,
    unit VARCHAR(30) NOT NULL,
    UNIQUE (business_id, ingredient_id),
    UNIQUE (business_id, ingredient_name)
);

CREATE TABLE recipe_ingredient (
    recipe_id BIGINT NOT NULL REFERENCES recipe(recipe_id) ON DELETE CASCADE,
    ingredient_id BIGINT NOT NULL REFERENCES ingredient(ingredient_id) ON DELETE RESTRICT,
    quantity_required NUMERIC(12,3) NOT NULL CHECK (quantity_required > 0),
    PRIMARY KEY (recipe_id, ingredient_id)
);

CREATE TABLE production_batch (
    batch_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    business_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    batch_code VARCHAR(60) NOT NULL,
    production_date DATE,
    expiry_date DATE,
    quantity_produced NUMERIC(12,3) NOT NULL CHECK (quantity_produced > 0),
    UNIQUE (business_id, batch_code),
    FOREIGN KEY (business_id, product_id)
        REFERENCES product(business_id, product_id) ON DELETE CASCADE,
    CHECK (expiry_date IS NULL OR production_date IS NULL OR expiry_date >= production_date)
);

-- Clothing and boutique
CREATE TABLE product_variant (
    variant_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    business_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    sku VARCHAR(80),
    size_label VARCHAR(40),
    color VARCHAR(50),
    material VARCHAR(80),
    additional_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (additional_price >= 0),
    variant_quantity NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (variant_quantity >= 0),
    UNIQUE (business_id, variant_id),
    UNIQUE (business_id, sku),
    FOREIGN KEY (business_id, product_id)
        REFERENCES product(business_id, product_id) ON DELETE CASCADE
);

-- Restaurant
CREATE TABLE restaurant_item (
    business_id BIGINT NOT NULL,
    product_id BIGINT PRIMARY KEY,
    preparation_time_minutes INTEGER
        CHECK (preparation_time_minutes IS NULL OR preparation_time_minutes >= 0),
    kitchen_station VARCHAR(80),
    FOREIGN KEY (business_id, product_id)
        REFERENCES product(business_id, product_id) ON DELETE CASCADE
);

CREATE TABLE dining_table (
    dining_table_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    business_id BIGINT NOT NULL REFERENCES business(business_id) ON DELETE CASCADE,
    table_number VARCHAR(20) NOT NULL,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    table_status VARCHAR(20) NOT NULL DEFAULT 'available'
        CHECK (table_status IN ('available','occupied','reserved','inactive')),
    UNIQUE (business_id, table_number),
    UNIQUE (business_id, dining_table_id)
);

CREATE TABLE reservation (
    reservation_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    business_id BIGINT NOT NULL,
    customer_id BIGINT,
    dining_table_id BIGINT,
    reservation_at TIMESTAMPTZ NOT NULL,
    guest_count INTEGER NOT NULL CHECK (guest_count > 0),
    reservation_status VARCHAR(20) NOT NULL DEFAULT 'booked'
        CHECK (reservation_status IN ('booked','seated','completed','cancelled','no_show')),
    notes TEXT,
    FOREIGN KEY (business_id, customer_id)
        REFERENCES customer(business_id, customer_id) ON DELETE RESTRICT,
    FOREIGN KEY (business_id, dining_table_id)
        REFERENCES dining_table(business_id, dining_table_id) ON DELETE RESTRICT
);

-- Flower shop
CREATE TABLE flower_product (
    business_id BIGINT NOT NULL,
    product_id BIGINT PRIMARY KEY,
    flower_type VARCHAR(80) NOT NULL,
    color VARCHAR(50),
    FOREIGN KEY (business_id, product_id)
        REFERENCES product(business_id, product_id) ON DELETE CASCADE
);

CREATE TABLE bouquet_component (
    bouquet_product_id BIGINT NOT NULL REFERENCES product(product_id) ON DELETE CASCADE,
    flower_product_id BIGINT NOT NULL REFERENCES flower_product(product_id) ON DELETE RESTRICT,
    quantity NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (bouquet_product_id, flower_product_id),
    CHECK (bouquet_product_id <> flower_product_id)
);

-- 7. INDEXES (created only after all referenced tables exist)
CREATE INDEX idx_product_business ON product(business_id);
CREATE INDEX idx_customer_business ON customer(business_id);
CREATE INDEX idx_employee_business ON employee(business_id);
CREATE INDEX idx_orders_business_date ON orders(business_id, order_date);
CREATE INDEX idx_orders_customer ON orders(business_id, customer_id);
CREATE INDEX idx_order_details_product ON order_details(business_id, product_id);
CREATE INDEX idx_expense_business_date ON expense(business_id, expense_date);
CREATE INDEX idx_inventory_low_stock ON inventory(business_id, quantity, reorder_level);

-- 8. DASHBOARD VIEWS
CREATE VIEW v_order_totals AS
SELECT
    o.business_id,
    o.order_id,
    o.order_date,
    o.order_status,
    o.payment_status,
    COALESCE(SUM(od.line_total), 0)::NUMERIC(14,2) AS total_amount
FROM orders o
LEFT JOIN order_details od
    ON od.business_id = o.business_id AND od.order_id = o.order_id
GROUP BY o.business_id, o.order_id, o.order_date, o.order_status, o.payment_status;

CREATE VIEW v_low_stock AS
SELECT i.business_id, p.product_id, p.product_name, i.quantity, i.reorder_level
FROM inventory i
JOIN product p
    ON p.business_id = i.business_id AND p.product_id = i.product_id
WHERE i.quantity <= i.reorder_level;

CREATE VIEW v_monthly_sales AS
SELECT
    business_id,
    DATE_TRUNC('month', order_date)::DATE AS sales_month,
    SUM(total_amount)::NUMERIC(14,2) AS revenue,
    COUNT(*) AS order_count
FROM v_order_totals
WHERE order_status <> 'cancelled'
GROUP BY business_id, DATE_TRUNC('month', order_date);

-- 9. STARTER REFERENCE DATA
INSERT INTO business_type (type_name, description) VALUES
('Bakery', 'Home bakeries and bakery businesses'),
('Clothing', 'Clothing stores and apparel sellers'),
('Restaurant', 'Restaurants, cafes and food outlets'),
('Flower Shop', 'Florists and bouquet businesses'),
('Retail', 'General retail businesses'),
('Boutique', 'Boutiques using clothing/product-variant functionality');

INSERT INTO module (module_name, module_key, description) VALUES
('Inventory', 'inventory', 'Products and stock levels'),
('Orders', 'orders', 'Order creation and tracking'),
('Customers', 'customers', 'Customer records and history'),
('Employees', 'employees', 'Employee records'),
('Expenses', 'expenses', 'Business expense tracking'),
('Suppliers', 'suppliers', 'Supplier records and product sourcing'),
('Recipes', 'recipes', 'Recipes and ingredients'),
('Production Batches', 'batches', 'Production and expiry tracking'),
('Product Variants', 'product_variants', 'Size, colour and SKU variations'),
('Reservations', 'reservations', 'Table reservations'),
('Dining Tables', 'dining_tables', 'Restaurant table management'),
('Bouquets', 'bouquets', 'Bouquet composition');

INSERT INTO role (role_name) VALUES ('Owner'), ('Manager'), ('Employee');

INSERT INTO business_type_module (business_type_id, module_id, default_enabled)
SELECT bt.business_type_id, m.module_id, TRUE
FROM business_type bt
CROSS JOIN module m
WHERE m.module_key IN ('inventory','orders','customers','employees','expenses','suppliers')
   OR (bt.type_name = 'Bakery' AND m.module_key IN ('recipes','batches'))
   OR (bt.type_name IN ('Clothing','Boutique') AND m.module_key = 'product_variants')
   OR (bt.type_name = 'Restaurant' AND m.module_key IN ('reservations','dining_tables'))
   OR (bt.type_name = 'Flower Shop' AND m.module_key = 'bouquets');

COMMIT;

-- After inserting a business, copy its default module configuration:
--
-- INSERT INTO business_module (business_id, module_id, enabled)
-- SELECT b.business_id, btm.module_id, btm.default_enabled
-- FROM business b
-- JOIN business_type_module btm ON btm.business_type_id = b.business_type_id
-- WHERE b.business_id = <new_business_id>;
--
-- For order creation, insert the order, order lines and stock adjustment in
-- one application-managed transaction. Add cancellation/refund stock reversal
-- rules before automating inventory changes.

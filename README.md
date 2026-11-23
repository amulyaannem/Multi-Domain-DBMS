Business Database Management System
1. Project overview
A configurable, multi-business management application for micro and small businesses such as home bakeries, clothing sellers, restaurants, flower shops, boutiques and small retailers.

The system combines:
- Centralized relational data management.
- CRUD operations for day-to-day business records.
- A live operational dashboard.
- Business reports and descriptive KPIs.
- Domain-specific modules enabled according to the selected business type.
Product principle: show business owners what is happening in their business, clearly and promptly. The system reports activity and trends; it does not prescribe whether the owner is running the business correctly.

2. Architecture decisions
Shared database, multiple businesses
All businesses use one PostgreSQL schema. Each business-owned record contains a business_id. Foreign keys and composite foreign keys are used where practical to prevent records from one business being linked to another business's records.

Selecting a business type does not create or drop physical database tables. All supported tables are created once when the application is installed. The selected type determines which modules are enabled and shown in that business's interface.
Configuration entities
Table	Purpose
business_type	The type selected during setup, such as Bakery or Clothing
business	A business workspace/tenant
module	Catalog of available features
business_type_module	Default modules associated with each business type
business_module	Modules actually enabled for an individual business


When a business is created:
1. Insert its row in business.
2. Read the matching rows from business_type_module.
3. Copy those rows into business_module.
4. Allow the owner to enable/disable optional modules, subject to application rules.
5. The frontend loads navigation and pages based on enabled modules.
Core entities
- product: the product/service being sold, including selling and cost price.
- inventory: current stock and reorder threshold for stock-tracked products.
- supplier and product_supplier: many-to-many supplier/product relationship.
- customer: customer records belonging to one business.
- employee and role: staff records and a starter role catalog.
- orders: order header; customer can be NULL for a walk-in sale.
- order_details: products and quantities within each order; stores the sale-time unit price.
- expense and expense_category: categorized business spending.
Domain extensions
The schema includes starter extension tables:
- Bakery: bakery_product, recipe, ingredient, recipe_ingredient, production_batch.
- Clothing/boutique: product_variant.
- Restaurant: restaurant_item, dining_table, reservation.
- Flower shop: flower_product, bouquet_component.
These tables are shared schema objects, not per-business dynamically created tables. Only the relevant businesses should create records in them. The application must verify the corresponding module is enabled before exposing its screens or accepting writes.

Boutique is mapped to the clothing/product-variant module in the starter configuration rather than given a duplicate product schema.
3. Technology stack
Recommended initial stack:
- Database: PostgreSQL
- Backend: Node.js + Express
- Frontend: React + Vite
- Database access: pg (node-postgres) initially, so SQL and DBMS concepts remain visible.
Keep SQL in version-controlled files. Avoid hiding the database design behind an ORM during the initial implementation.
4. Suggested project structure
business-dbms/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   └── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   └── services/
│   └── package.json
├── database/
│   ├── schema.sql
│   └── seed.sql
└── README.md
5. Build plan
Phase 1: Database foundation
1. Install/start PostgreSQL and create a development database.
2. Run schema.sql.
3. Verify that all tables, constraints, indexes and views exist.
4. Create one test bakery and one test clothing business.
5. Copy each type's default modules into business_module.
6. Insert sample products, inventory, customers, employees, orders and expenses.
7. Test joins and confirm business data remains isolated.
Completion condition: a bakery and clothing business can coexist in the same database without their records mixing.
Phase 2: SQL operations
Implement and test:
- Product CRUD.
- Inventory updates.
- Customer CRUD.
- Employee CRUD.
- Order creation and order-item insertion.
- Expense CRUD.
- Search, sorting and filtering.
Use parameterized SQL queries. Never concatenate user input into SQL strings.
Phase 3: Transaction-safe workflows
Order creation must be one database transaction:
1. Begin transaction.
2. Insert order header.
3. Insert order details.
4. Validate available stock for stock-tracked items.
5. Update inventory.
6. Commit; otherwise rollback.
Also define what happens when an order is edited, cancelled or refunded. Do not decrement stock with a simplistic trigger until these workflows are handled.
Phase 4: Backend API
Suggested routes:
- POST /api/businesses
- GET /api/businesses/:businessId/modules
- CRUD routes for products, customers, employees and expenses.
- POST /api/businesses/:businessId/orders
- Dashboard/report endpoints.
Every request must be authorized for the selected business. Do not trust a client-supplied business_id without checking the authenticated user's access.
Phase 5: Frontend
Build in this order:
1. Business setup and domain selection.
2. Login and business selection.
3. Dynamic navigation based on enabled modules.
4. CRUD pages.
5. Order-entry workflow.
6. Main dashboard.
7. Reports and filters.
Phase 6: Dashboard and reports
Initial KPIs:
- Today's revenue and order count.
- Monthly sales.
- Expenses by category and month.
- Low-stock items.
- Best-selling products.
- Gross margin estimate using sale-time price and product cost.
- Employee order activity.
Be explicit about metric definitions. For example, revenue should normally exclude cancelled orders; profit calculations must account for cost, discounts, taxes and refunds if those are later added.
Phase 7: DBMS concepts to demonstrate
- Primary and foreign keys.
- Referential integrity.
- 1NF, 2NF and 3NF with documented functional dependencies.
- CHECK, UNIQUE and NOT NULL constraints.
- Transactions and rollback.
- Views.
- Indexes and query plans.
- Role-based authorization.
- Data validation and error handling.
A role column/table alone is not complete role-based access control. Add user accounts, permissions and role-permission mapping when authentication is implemented.
6. Important schema notes and decisions
1. order_details.line_total is generated from quantity × sale-time unit price.
2. The order total is calculated in v_order_totals, rather than duplicated in the order header.
3. customer_id on an order is optional for walk-in sales.
4. product_id in order_details references product, not inventory.
5. inventory stores current stock; product master data stays in product.
6. Supplier/product is many-to-many and is resolved by product_supplier.
7. Expense categories are business-specific to keep reporting labels configurable.
8. next_salary_date is omitted because it was previously described as a value derived from hire date. A real payroll schedule should be modeled separately if needed.
9. Store credit is omitted from the first schema until its rules (balance, ledger, redemption, refunds) are defined.
10. business_module controls feature availability. It does not physically create or remove tables.
11. The starter schema is a practical MVP foundation, not a complete production accounting, payroll, tax or payment system.
7. First test scenario
Create:
- Business A: "Sweet Crumbs", type Bakery.
- Business B: "Style House", type Clothing.
Expected modules:
- Sweet Crumbs: inventory, orders, customers, employees, expenses, suppliers, recipes, batches.
- Style House: inventory, orders, customers, employees, expenses, suppliers, product variants.
Then verify:
- Each business sees only its own products, customers, orders and expenses.
- Sweet Crumbs can add a recipe and production batch.
- Style House can add size/colour variants.
- A product from one business cannot be added to another business's order.
- Low-stock and monthly-sales views return business-scoped results.
8. Before calling the project complete
- [ ] Schema executes cleanly on the chosen PostgreSQL version.
- [ ] Two businesses can be created and isolated.
- [ ] Default modules are copied correctly.
- [ ] CRUD operations work.
- [ ] Order workflow is transactional.
- [ ] Stock cannot become negative.
- [ ] Dashboard metrics have documented definitions.
- [ ] Authorization is enforced on the backend.
- [ ] Domain-specific screens are hidden/blocked when modules are disabled.
- [ ] SQL queries and normalization decisions are documented.

Improvements 

- Ingredient supplier mapping: Add an ingredient_supplier table so ingredient costs can be calculated using actual purchase prices.

- Batch consumption tracking: Track how much of each production batch has been sold, discarded or remains available. Currently, we only know how much was produced.

- We currently have two stock systems:
inventory.quantity for general product stock.
product_variant.variant_quantity for clothing variants.
For variant-enabled products, the variant quantities should become the source of truth. We should eventually automate stock updates for sales, cancellations and returns, rather than relying on manual SQL.

Also, the manual stock deduction we just tested must not be repeated for order 9.


usename- NSSVEX75
PASS - 36DWUD



import json
import urllib.request
import urllib.error

API_URL = "http://127.0.0.1:8000/api/v1/sensor-readings"

test_readings = [
    (1200, 1800, 25.0, False),
    (1800, 2100, 26.0, False),
    (2400, 2200, 27.0, False),
    (3000, 2500, 28.0, False),
    (3500, 3000, None, False),
    (2900, 4095, 28.0, True),
]

for index, (tds, water, temperature, warning) in enumerate(
    test_readings, start=1
):
    payload = {
        "device_id": "saltline_test_device",
        "uptime_ms": index * 10000,
        "tds_raw_avg": tds,
        "water_level_raw_avg": water,
        "tds_voltage_est_v": round(tds * 3.3 / 4095, 3),
        "water_voltage_est_v": round(water * 3.3 / 4095, 3),
        "input_warning": warning,
        "temperature_c": temperature,
        "temperature_valid": temperature is not None,
        "source": "synthetic_integration_test",
    }

    request = urllib.request.Request(
        API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request) as response:
            result = json.loads(response.read().decode())
            print(
                f"Reading {index}: stored successfully, "
                f"ID={result.get('id')}"
            )

    except urllib.error.HTTPError as error:
        print(f"Reading {index}: HTTP {error.code}")
        print(error.read().decode())

    except urllib.error.URLError as error:
        print(f"Connection error: {error.reason}")

# Business Database Management System

## 1. Project Overview

The Business Database Management System is a modular, database-driven application designed to help small businesses manage their day-to-day operations through a unified platform.

The system supports different business categories, including bakeries, clothing stores, restaurants and flower shops. Instead of maintaining separate applications for each business category, it uses a shared database architecture with dynamically activated business-specific modules.

The application provides centralized data management, operational CRUD functionality, inventory tracking, order management, business intelligence and reporting.

## 2. Problem Statement

Small businesses often rely on spreadsheets, notebooks or disconnected software to manage products, inventory, customers, orders, employees and expenses.

These fragmented systems make it difficult to maintain consistent records, track business performance, identify stock shortages and generate meaningful reports.

Additionally, existing generic management systems may include unnecessary features or lack workflows specific to individual business categories.

The proposed system addresses these challenges through a modular and scalable business management platform.

## 3. Objectives

- Develop a centralized database system for small businesses.
- Support multiple business categories through a modular architecture.
- Implement role-based access and business-specific data isolation.
- Provide CRUD operations for essential business entities.
- Automate selected inventory and order workflows.
- Generate business intelligence insights from operational data.
- Provide analytical dashboards and downloadable reports.
- Maintain data integrity through relational constraints, validation and transactions.

## 4. Supported Business Categories

### Bakery
- Product and ingredient management.
- Recipe management.
- Production batch tracking.
- Inventory monitoring.

### Clothing Store
- Product catalogue management.
- Size and colour variants.
- Variant-level inventory.
- Sales tracking.

### Restaurant
- Menu management.
- Customer orders.
- Table management.
- Reservation scheduling.
- Kitchen workload analysis.

### Flower Shop
- Flower inventory.
- Bouquet composition.
- Component costing.
- Bouquet assembly.
- Finished-product inventory.

## 5. Technology Stack

**Database**
- PostgreSQL

**Backend**
- Node.js
- Express.js
- PostgreSQL `pg` driver
- Zod validation
- bcrypt
- JSON Web Tokens

**Frontend (planned and optional)**
- React
- Vite
- Tailwind CSS
- Axios
- React Router
- Chart library

**Testing**
- Jest
- Supertest
- PostgreSQL test database

## 6. System Architecture

The application follows a layered architecture:

1. Presentation layer: React-based interface, when implemented.
2. API layer: Express REST endpoints.
3. Business logic layer: services, validation and authorization.
4. Data access layer: parameterized PostgreSQL queries.
5. Database layer: relational tables, views, functions and triggers.

## 7. Core Functional Modules

- User authentication and authorization.
- Business registration and management.
- Dynamic module activation.
- Product and inventory management.
- Customer and supplier management.
- Order management.
- Employee management.
- Expense tracking.
- Business-specific operational modules.
- Dashboards and business intelligence.
- Report generation.

## 8. Business Intelligence

The system will transform operational records into descriptive business insights.

Examples include:

- Best-selling products.
- Monthly sales trends.
- Low-stock alerts.
- Product-level revenue.
- Expense trends.
- Gross margin calculations.
- Employee order activity.
- Business-specific operational metrics.

The system is intended to provide information and visibility to business owners rather than automatically dictate business decisions.

## 9. Security and Data Integrity

- Password hashing using bcrypt.
- JWT-based authentication.
- Role-based authorization.
- Business-level data isolation.
- Request validation.
- Parameterized SQL queries.
- Database constraints.
- Transaction-safe business operations.
- Centralized error handling.

## 10. Expected Outcome

The expected outcome is a functional, modular business management backend capable of supporting different small-business categories through a shared relational database.

The backend will expose REST APIs for business registration, authentication, CRUD operations, operational workflows, dashboards and analytical reports.

A React interface may subsequently be developed to provide a user-friendly dashboard and management experience.

## 11. Current Development Status

- Relational database implementation completed.
- Four sample business categories populated.
- Core business-specific database workflows implemented.
- Backend server and PostgreSQL connection operational.
- User registration and login APIs implemented.
- JWT authentication middleware implemented.
- Business registration and CRUD API development pending.
- Analytics API development pending.
- Automated testing pending.
- Frontend development optional.

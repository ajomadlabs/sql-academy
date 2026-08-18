-- ============================================================
--  NORTHWIND-STYLE RETAIL SCHEMA  ·  SQL Mastery practice DB
-- ============================================================
--  Designed so that every tier of the curriculum has something
--  real to practise against:
--
--    categories.parent_id     -> recursive CTEs (Tier 2)
--    employees.manager_id     -> self-joins, hierarchies (Tier 0/2)
--    customers.referred_by    -> nullable FK, the NOT IN trap (Tier 0)
--    customers.email          -> nullable, NULL semantics (Tier 0)
--    orders.shipped_at        -> nullable, anti-joins (Tier 0)
--    orders / order_items     -> ~250k / ~700k rows for EXPLAIN (Tier 3)
--    product_price_history    -> SCD Type 2 practice (Tier 4)
--
--  NOTE: deliberately NO indexes beyond primary keys.
--  Tier 3 is where she adds them herself and measures the
--  difference. Starting indexed would remove the whole lesson.
-- ============================================================

DROP TABLE IF EXISTS product_price_history, payments, order_items,
                     orders, products, customers, employees, categories CASCADE;

-- ---------- categories (self-referencing hierarchy) ----------
CREATE TABLE categories (
    category_id  int PRIMARY KEY,
    name         text NOT NULL,
    parent_id    int REFERENCES categories(category_id)
);

-- ---------- employees (self-referencing hierarchy) ----------
CREATE TABLE employees (
    employee_id  int PRIMARY KEY,
    full_name    text NOT NULL,
    title        text NOT NULL,
    manager_id   int  REFERENCES employees(employee_id),
    hired_on     date NOT NULL,
    salary       numeric(10,2) NOT NULL,
    region       text
);

-- ---------- customers ----------
CREATE TABLE customers (
    customer_id   int PRIMARY KEY,
    full_name     text NOT NULL,
    email         text,                                   -- nullable ON PURPOSE
    city          text NOT NULL,
    country       text NOT NULL,
    signed_up_on  date NOT NULL,
    referred_by   int REFERENCES customers(customer_id)    -- nullable ON PURPOSE
);

-- ---------- products ----------
CREATE TABLE products (
    product_id    int PRIMARY KEY,
    name          text NOT NULL,
    category_id   int NOT NULL REFERENCES categories(category_id),
    list_price    numeric(10,2) NOT NULL,
    discontinued  boolean NOT NULL DEFAULT false
);

-- ---------- orders ----------
CREATE TABLE orders (
    order_id     bigint PRIMARY KEY,
    customer_id  int NOT NULL REFERENCES customers(customer_id),
    employee_id  int REFERENCES employees(employee_id),
    placed_at    timestamp NOT NULL,
    shipped_at   timestamp,                               -- nullable ON PURPOSE
    status       text NOT NULL,
    channel      text NOT NULL
);

-- ---------- order_items ----------
CREATE TABLE order_items (
    order_id    bigint NOT NULL REFERENCES orders(order_id),
    line_no     int    NOT NULL,
    product_id  int    NOT NULL REFERENCES products(product_id),
    quantity    int    NOT NULL,
    unit_price  numeric(10,2) NOT NULL,
    discount    numeric(4,3)  NOT NULL DEFAULT 0,
    PRIMARY KEY (order_id, line_no)
);

-- ---------- payments ----------
CREATE TABLE payments (
    payment_id  bigint PRIMARY KEY,
    order_id    bigint NOT NULL REFERENCES orders(order_id),
    paid_at     timestamp NOT NULL,
    amount      numeric(12,2) NOT NULL,
    method      text NOT NULL
);

-- ---------- price history (SCD Type 2) ----------
CREATE TABLE product_price_history (
    product_id  int  NOT NULL REFERENCES products(product_id),
    valid_from  date NOT NULL,
    valid_to    date,                                     -- NULL = current row
    price       numeric(10,2) NOT NULL,
    PRIMARY KEY (product_id, valid_from)
);

-- ============================================================
--  SEED DATA  ·  generated, not hand-written
-- ============================================================
--  Roughly 1 million rows total, from a ~7 KB file, because
--  everything is generated with generate_series rather than
--  stored as INSERT statements.
--
--  Volume is the point: Tier 3 (performance) only teaches
--  anything when a missing index actually costs seconds.
--
--  setseed() makes the data reproducible - re-running gives
--  the identical database, so answers stay stable.
-- ============================================================

SELECT setseed(0.4242);

-- ---------- categories: 5 roots, 15 children ----------
INSERT INTO categories (category_id, name, parent_id)
SELECT g, (ARRAY['Electronics','Home & Kitchen','Apparel','Sports','Books'])[g], NULL
FROM generate_series(1,5) g;

INSERT INTO categories (category_id, name, parent_id)
SELECT 5 + g,
       (ARRAY['Laptops','Phones','Audio','Cookware','Furniture','Lighting',
              'Menswear','Womenswear','Footwear','Fitness','Outdoor','Cycling',
              'Fiction','Technical','Childrens'])[g],
       ((g - 1) / 3) + 1
FROM generate_series(1,15) g;

-- ---------- employees: 150, four-level hierarchy ----------
INSERT INTO employees (employee_id, full_name, title, manager_id, hired_on, salary, region)
SELECT g,
       'Employee ' || g,
       CASE WHEN g = 1 THEN 'VP Sales'
            WHEN g <= 6 THEN 'Regional Manager'
            WHEN g <= 30 THEN 'Team Lead'
            ELSE 'Sales Rep' END,
       CASE WHEN g = 1 THEN NULL
            WHEN g <= 6 THEN 1
            WHEN g <= 30 THEN 2 + (g % 4)
            ELSE 7 + (g % 23) END,
       DATE '2015-01-01' + (random() * 3200)::int,
       (45000 + random() * 90000)::numeric(10,2),
       (ARRAY['North','South','East','West',NULL])[1 + (random() * 4)::int]
FROM generate_series(1,150) g;

-- ---------- customers: 40,000 ----------
-- ~12% have NULL email, ~70% have NULL referred_by (both deliberate)
INSERT INTO customers (customer_id, full_name, email, city, country, signed_up_on, referred_by)
SELECT g,
       'Customer ' || g,
       CASE WHEN random() < 0.12 THEN NULL
            ELSE 'customer' || g || '@example.com' END,
       (ARRAY['Kochi','Chennai','Bengaluru','Mumbai','Delhi','Hyderabad','Pune',
              'London','Dubai','Singapore'])[1 + (random() * 9)::int],
       (ARRAY['India','India','India','India','India','India','India',
              'UK','UAE','Singapore'])[1 + (random() * 9)::int],
       DATE '2019-01-01' + (random() * 2200)::int,
       CASE WHEN random() < 0.30 THEN 1 + (random() * (g - 1))::int ELSE NULL END
FROM generate_series(1,40000) g;

-- ---------- products: 1,500 ----------
INSERT INTO products (product_id, name, category_id, list_price, discontinued)
SELECT g,
       'Product ' || g,
       6 + (random() * 14)::int,
       (5 + random() * 1200)::numeric(10,2),
       random() < 0.08
FROM generate_series(1,1500) g;

-- ---------- orders: 250,000 ----------
-- ~9% never shipped (NULL shipped_at) for anti-join practice
INSERT INTO orders (order_id, customer_id, employee_id, placed_at, shipped_at, status, channel)
SELECT g,
       1 + (random() * 39999)::int,
       CASE WHEN random() < 0.05 THEN NULL ELSE 31 + (random() * 119)::int END,
       ts,
       CASE WHEN random() < 0.09 THEN NULL
            ELSE ts + INTERVAL '1 day' + random() * INTERVAL '9 days' END,
       CASE WHEN random() < 0.09 THEN 'pending'
            WHEN random() < 0.05 THEN 'cancelled'
            ELSE 'completed' END,
       (ARRAY['web','web','web','mobile','mobile','phone','partner'])[1 + (random() * 6)::int]
FROM (
    -- ts must be computed in a per-row target list. An uncorrelated
    -- LATERAL here gets hoisted and evaluated ONCE, giving every order
    -- the identical timestamp.
    SELECT g,
           TIMESTAMP '2022-01-01' + random() * INTERVAL '1400 days'
                                  + random() * INTERVAL '86400 seconds' AS ts
    FROM generate_series(1,250000) g
) s;

-- ---------- carve gaps into the calendar ----------
-- Without this, all 1,400 days have orders, there are no gaps,
-- and the gaps-and-islands exercise has a single trivial answer.
-- Deterministic (no random()), so the data stays reproducible.
DELETE FROM orders
WHERE (((placed_at::date - DATE '2022-01-01') * 7919) % 100) < 14;

-- ---------- order_items: ~700,000 (1-5 lines per order) ----------
INSERT INTO order_items (order_id, line_no, product_id, quantity, unit_price, discount)
SELECT o.order_id,
       ln,
       1 + (random() * 1399)::int,   -- products 1401-1500 stay unsold on purpose
       1 + (random() * 6)::int,
       (5 + random() * 1200)::numeric(10,2),
       CASE WHEN random() < 0.25 THEN (random() * 0.3)::numeric(4,3) ELSE 0 END
FROM orders o
CROSS JOIN LATERAL generate_series(1, 1 + (o.order_id % 5)) AS ln;

-- ---------- payments: one per completed order ----------
INSERT INTO payments (payment_id, order_id, paid_at, amount, method)
SELECT row_number() OVER (ORDER BY o.order_id),
       o.order_id,
       o.placed_at + random() * INTERVAL '3 days',
       t.total,
       (ARRAY['card','card','card','upi','upi','netbanking','cod'])[1 + (random() * 6)::int]
FROM orders o
JOIN LATERAL (
    SELECT sum(oi.quantity * oi.unit_price * (1 - oi.discount))::numeric(12,2) AS total
    FROM order_items oi WHERE oi.order_id = o.order_id
) t ON true
WHERE o.status = 'completed';


-- ---------- a few double-charges ----------
-- Real payment systems occasionally bill twice. Without these, the
-- duplicate-detection exercise asks learners to find something that
-- does not exist, which teaches the wrong lesson when they find nothing.
INSERT INTO payments (payment_id, order_id, paid_at, amount, method)
SELECT (SELECT max(payment_id) FROM payments) + row_number() OVER (ORDER BY p.payment_id),
       p.order_id, p.paid_at + INTERVAL '4 minutes', p.amount, p.method
FROM payments p
WHERE p.order_id % 337 = 0;

-- ---------- price history: SCD Type 2, 1-4 versions per product ----------
INSERT INTO product_price_history (product_id, valid_from, valid_to, price)
SELECT p.product_id,
       DATE '2022-01-01' + (v.n * 220),
       CASE WHEN v.n = v.maxn THEN NULL
            ELSE DATE '2022-01-01' + ((v.n + 1) * 220) - 1 END,
       (p.list_price * CASE WHEN p.product_id % 5 = 0
                     THEN 1.30 - v.n*0.11    -- these decline
                     ELSE 0.75 + v.n*0.12 END)::numeric(10,2)
FROM products p
CROSS JOIN LATERAL (
    SELECT n, maxn FROM (SELECT 1 + (p.product_id % 4) AS maxn) m,
                        generate_series(0, m.maxn) AS n
) v;

ANALYZE;

-- ---------- what you just built ----------
SELECT 'categories'            AS table_name, count(*) FROM categories
UNION ALL SELECT 'employees',            count(*) FROM employees
UNION ALL SELECT 'customers',            count(*) FROM customers
UNION ALL SELECT 'products',             count(*) FROM products
UNION ALL SELECT 'orders',               count(*) FROM orders
UNION ALL SELECT 'order_items',          count(*) FROM order_items
UNION ALL SELECT 'payments',             count(*) FROM payments
UNION ALL SELECT 'product_price_history',count(*) FROM product_price_history
ORDER BY 1;

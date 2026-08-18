-- ============================================================
--  LITE SEED — for the in-browser sandbox only
-- ============================================================
--  Same shape and same deliberate messiness as 02-seed.sql, at
--  roughly 1/12 the volume, so Postgres-in-WASM can build it in a
--  few seconds inside a browser tab.
--
--  Use the FULL seed (02-seed.sql) on the local Docker database.
--  Tier 3 is about measuring what an index does to a real query,
--  and 17k rows will not show you that. This file is for practising
--  and checking answers, not for performance work.
-- ============================================================

SELECT setseed(0.4242);

INSERT INTO categories
SELECT g, (ARRAY['Electronics','Home & Kitchen','Apparel','Sports','Books'])[g], NULL
FROM generate_series(1,5) g;

INSERT INTO categories
SELECT 5+g, (ARRAY['Laptops','Phones','Audio','Cookware','Furniture','Lighting',
                   'Menswear','Womenswear','Footwear','Fitness','Outdoor','Cycling',
                   'Fiction','Technical','Childrens'])[g], ((g-1)/3)+1
FROM generate_series(1,15) g;

INSERT INTO employees
SELECT g, 'Employee '||g,
  CASE WHEN g=1 THEN 'VP Sales' WHEN g<=6 THEN 'Regional Manager'
       WHEN g<=30 THEN 'Team Lead' ELSE 'Sales Rep' END,
  CASE WHEN g=1 THEN NULL WHEN g<=6 THEN 1
       WHEN g<=30 THEN 2+(g%4) ELSE 7+(g%23) END,
  DATE '2015-01-01'+(random()*3200)::int,
  (45000+random()*90000)::numeric(10,2),
  (ARRAY['North','South','East','West',NULL])[1+(random()*4)::int]
FROM generate_series(1,150) g;

-- ~12% NULL email, ~70% NULL referred_by, exactly as in the full seed
INSERT INTO customers
SELECT g, 'Customer '||g,
  CASE WHEN random()<0.12 THEN NULL ELSE 'customer'||g||'@example.com' END,
  (ARRAY['Kochi','Chennai','Bengaluru','Mumbai','Delhi','Hyderabad','Pune',
         'London','Dubai','Singapore'])[1+(random()*9)::int],
  (ARRAY['India','India','India','India','India','India','India',
         'UK','UAE','Singapore'])[1+(random()*9)::int],
  DATE '2019-01-01'+(random()*2200)::int,
  CASE WHEN random()<0.30 THEN 1+(random()*(g-1))::int ELSE NULL END
FROM generate_series(1,4000) g;

INSERT INTO products
SELECT g, 'Product '||g, 6+(random()*14)::int,
  (5+random()*1200)::numeric(10,2), random()<0.08
FROM generate_series(1,600) g;

INSERT INTO orders
SELECT g, 1+(random()*3999)::int,
  CASE WHEN random()<0.05 THEN NULL ELSE 31+(random()*119)::int END,
  ts,
  CASE WHEN random()<0.09 THEN NULL
       ELSE ts + INTERVAL '1 day' + random()*INTERVAL '9 days' END,
  CASE WHEN random()<0.09 THEN 'pending'
       WHEN random()<0.05 THEN 'cancelled' ELSE 'completed' END,
  (ARRAY['web','web','web','mobile','mobile','phone','partner'])[1+(random()*6)::int]
FROM (
  SELECT g, TIMESTAMP '2022-01-01' + random()*INTERVAL '1400 days'
                                   + random()*INTERVAL '86400 seconds' AS ts
  FROM generate_series(1,20000) g
) s;

-- carve gaps into the calendar so gaps-and-islands has real islands
DELETE FROM orders
WHERE (((placed_at::date - DATE '2022-01-01') * 7919) % 100) < 14;

-- Products 561-600 are deliberately never ordered. Real catalogues always
-- carry dead stock, and several exercises ask you to find it -- drawing the
-- product across the whole range made those questions return nothing.
INSERT INTO order_items
SELECT o.order_id, ln, 1+(random()*559)::int, 1+(random()*6)::int,
  (5+random()*1200)::numeric(10,2),
  CASE WHEN random()<0.25 THEN (random()*0.3)::numeric(4,3) ELSE 0 END
FROM orders o
CROSS JOIN LATERAL generate_series(1, 1+(o.order_id%5)) AS ln;

INSERT INTO payments
SELECT row_number() OVER (ORDER BY o.order_id), o.order_id,
  o.placed_at + random()*INTERVAL '3 days', t.total,
  (ARRAY['card','card','card','upi','upi','netbanking','cod'])[1+(random()*6)::int]
FROM orders o
JOIN LATERAL (
  SELECT sum(oi.quantity*oi.unit_price*(1-oi.discount))::numeric(12,2) AS total
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

INSERT INTO product_price_history
SELECT p.product_id,
       DATE '2022-01-01' + (v.n*220),
       CASE WHEN v.n = v.maxn THEN NULL
            ELSE DATE '2022-01-01' + ((v.n+1)*220) - 1 END,
       (p.list_price * CASE WHEN p.product_id % 5 = 0
                     THEN 1.30 - v.n*0.11    -- these decline
                     ELSE 0.75 + v.n*0.12 END)::numeric(10,2)
FROM products p
CROSS JOIN LATERAL (
  SELECT n, maxn FROM (SELECT 1+(p.product_id%4) AS maxn) m,
                      generate_series(0, m.maxn) AS n
) v;

ANALYZE;

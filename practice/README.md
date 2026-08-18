# Practice Database

A real Postgres database with **~900,000 rows** and 58 problems mapped to the curriculum tiers.

Everything here has been executed and verified — the schema loads, the seed runs in about 8 seconds, and all 58 solutions return correct results.

---

## Why a local database rather than only LeetCode

Online judges are good for interview reps and bad for learning. They hand you a tiny toy table, so `EXPLAIN` teaches nothing, indexes make no measurable difference, and you never design a schema or break anything.

This database is deliberately different:

- **Big enough that performance is real.** A non-sargable predicate here costs ~6.6 ms; the sargable rewrite costs ~0.1 ms. Roughly 60×, on her own machine, measured by her. That number is what makes the lesson stick.
- **Deliberately un-indexed** beyond primary keys. Tier 3 is where she adds the indexes herself and measures the before and after. Shipping it pre-indexed would delete the entire lesson.
- **Full of realistic mess.** Nullable emails, nullable referrers, unshipped orders, duplicate order lines, gaps in the calendar. Clean data teaches habits that break on contact with production.

Use both: this database to *learn*, DataLemur and StrataScratch to *drill under interview conditions*.

---

## Setup (about 5 minutes, once)

**1. Start Postgres in Docker**

```bash
docker run -d --name sqlprac \
  -e POSTGRES_PASSWORD=practice \
  -e POSTGRES_USER=practice \
  -e POSTGRES_DB=practice \
  -p 55432:5432 \
  postgres:16
```

**2. Load the schema and data**

```bash
cd academy/practice
docker cp 01-schema.sql sqlprac:/tmp/ && docker cp 02-seed.sql sqlprac:/tmp/
docker exec sqlprac psql -U practice -d practice -f /tmp/01-schema.sql
docker exec sqlprac psql -U practice -d practice -f /tmp/02-seed.sql
```

The seed prints a row count per table when it finishes. Expect roughly:

| Table | Rows |
|---|---:|
| order_items | 645,108 |
| orders | 215,179 |
| payments | 185,839 |
| customers | 40,000 |
| product_price_history | 5,250 |
| products | 1,500 |
| employees | 150 |
| categories | 20 |

**3. Connect with a GUI** — [DBeaver](https://dbeaver.io) (free) or pgAdmin:

```
Host: localhost      Port: 55432
Database: practice   User: practice   Password: practice
```

**Daily use afterwards:** `docker start sqlprac`. To rebuild from scratch, re-run step 2 — the seed is deterministic (`setseed`), so you get the identical database every time and the answers stay stable.

---

## Files

| File | What |
|---|---|
| `01-schema.sql` | Tables, keys, constraints. No indexes beyond PKs — on purpose. |
| `02-seed.sql` | Generates ~900k rows from ~8 KB using `generate_series`. |
| `03-problems.md` | **The 58 problems.** Start here. |
| `04-solutions.sql` | Runnable solutions with explanations. Open only after attempting. |

---

## The schema

```
categories ──┐ (parent_id → itself: recursive CTEs)
             │
products ────┼──→ order_items ──→ orders ──→ customers (referred_by → itself)
             │                      │
product_price_history               ├──→ employees (manager_id → itself)
(SCD Type 2)                        └──→ payments
```

**Deliberate design choices, each supporting a specific tier:**

| Feature | Teaches |
|---|---|
| `customers.email` nullable (~12% NULL) | NULL semantics, `count(*)` vs `count(col)` |
| `customers.referred_by` nullable (~70% NULL) | **The `NOT IN` trap** — verified to return 0 rows |
| `orders.shipped_at` nullable (~9% NULL) | Anti-joins, `IS NULL` filtering |
| `employees.manager_id` self-referencing | Self-joins, recursive hierarchies |
| `categories.parent_id` self-referencing | Recursive CTEs |
| 645k `order_items` | `EXPLAIN`, indexes, join strategies |
| Gaps carved into the calendar | **Gaps and islands** — 196 real islands, runs of 4–10 days |
| 596 duplicate order lines | Deduplication with `ROW_NUMBER` |
| `product_price_history` | SCD Type 2, temporal joins |

---

## How to work through the problems

1. **Attempt fully before opening solutions.** Twenty minutes minimum. The struggle is where the learning happens; reading a solution first swaps it for a comfortable illusion of understanding that evaporates under interview pressure.
2. **Type every query.** Never copy-paste.
3. **From Tier 2 onward, narrate out loud while solving.** It feels ridiculous alone in a room and it is the fastest available fix for freezing when someone is watching.
4. **Log every mistake** in the error log in `../progress.md`, and review it every Sunday. Mistakes cluster; the log is what makes the pattern visible.
5. **Re-solve the starred problems a week later, cold.** Solving something once is recognition. Solving it again a week later is knowledge, and only the second one survives an interview.

Suggested pace, matching the 60-day plan:

| Tier | Problems | Days |
|---|---|---|
| 0 — Foundations | 1–22 | 1–7 |
| 1 — Structure | 23–30 | 8–14 |
| 2 — Window functions | 31–48 | 15–22 |
| 3 — Performance | 49–55 | 23–28 |
| 4 — Modelling | 56–58 | 29–35 |

---

## Cleanup

```bash
docker stop sqlprac && docker rm sqlprac    # remove entirely
```

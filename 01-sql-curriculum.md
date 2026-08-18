# SQL — End to End, From Foundations

**Days 1–60. The core of the plan.** ~4 hrs/day of the daily budget.

**The method, which matters more than the syllabus:**

1. **Type everything.** Real Postgres, real data, real queries. Watching tutorials produces recognition, not ability, and recognition collapses in interviews.
2. **Understand before memorising.** Every topic answers *why does this exist and what problem does it solve* before *what is the syntax*. Memorised syntax is exactly what evaporates under pressure.
3. **Re-solve from memory.** Yesterday's hardest problem, cold, the next evening. This is the single mechanism that converts study into confidence.
4. **Narrate out loud from Week 3.** Talking through a solution to an empty room feels absurd and is the fastest available fix for interview freeze.

**Setup (Day 1, ~2 hours):** Postgres via Docker, DBeaver or pgAdmin as a client, and the Pagila sample database. Add a large public dataset (1M+ rows) later in Week 3 so execution plans become meaningful.

---

## Tier 0 — Foundations (Days 1–7)

The floor. If this is shaky, everything above it wobbles — which is very likely the actual root cause of the confidence problem.

**Days 1–2 — Retrieval**
- `SELECT`, column aliasing, `DISTINCT`
- `WHERE` — comparison, `AND`/`OR`/`NOT`, operator precedence and why parentheses matter
- `BETWEEN`, `IN`, `LIKE`, wildcards
- `ORDER BY` (multi-column, `ASC`/`DESC`), `LIMIT`/`OFFSET`
- **`NULL` semantics** — three-valued logic, `IS NULL` vs `= NULL`, how NULL behaves in comparisons. Do not rush this; it silently causes wrong results for years.
- `CASE WHEN`, `COALESCE`, `NULLIF`

**Days 3–4 — Joins**
- The mental model: joins combine rows across tables by matching a condition. Draw it before writing it.
- `INNER`, `LEFT`, `RIGHT`, `FULL OUTER`, `CROSS`
- Multi-table joins (3+), join order and readability
- **Self-joins** — the first genuinely tricky one; employee/manager is the canonical drill
- Join on multiple conditions; joining on non-equality
- Why a wrong join multiplies rows — the fan-out trap

**Days 5–6 — Aggregation**
- `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`
- `GROUP BY`, single and multiple columns
- `HAVING` vs `WHERE` — the difference and why it exists
- `COUNT(*)` vs `COUNT(col)` vs `COUNT(DISTINCT col)`
- **Logical execution order:** `FROM` → `JOIN` → `WHERE` → `GROUP BY` → `HAVING` → `SELECT` → `DISTINCT` → `ORDER BY` → `LIMIT`

  ⭐ **This single concept is the most important item in Tier 0.** It explains why a `SELECT` alias can't be used in `WHERE`, why `HAVING` filters aggregates and `WHERE` doesn't, and why so much SQL behaviour feels arbitrary until you know it. Much of the "I don't really get SQL" feeling traces back to never having been taught this.

**Day 7 — Subqueries and consolidation**
- Scalar, single-row, multi-row subqueries
- Subqueries in `SELECT`, `FROM` (derived tables), `WHERE`
- Correlated subqueries and how they differ
- `EXISTS` / `NOT EXISTS`
- **The `NOT IN` NULL trap** — why it silently returns zero rows when the subquery yields a NULL. A classic screening question.
- Set ops: `UNION` vs `UNION ALL` (`ALL` is usually correct and always faster), `INTERSECT`, `EXCEPT`

**Checkpoint:** writes a 3-table join with aggregation and filtering, from scratch, unaided, without looking anything up.

## Tier 1 — Structure and manipulation (Days 8–14)

- DDL: `CREATE`/`ALTER`/`DROP` for tables, data types and choosing them well
- Constraints: `PRIMARY KEY`, `FOREIGN KEY`, `UNIQUE`, `NOT NULL`, `CHECK`, `DEFAULT`
- DML: `INSERT` (incl. `INSERT...SELECT`), `UPDATE` with joins, `DELETE` vs `TRUNCATE`
- **Upserts** — `MERGE` / `ON CONFLICT`. Central to any data-loading work.
- String functions, date/time functions and arithmetic, type casting
- Views — what they are, when they help

Second half of the week: **re-drill all of Tier 0.** Consolidation is not wasted time; it's where fragile knowledge becomes durable.

**Checkpoint:** designs and creates a small normalised schema from a written business description.

## Tier 2 — Window functions (Days 15–22) ⭐ highest interview yield

The topic that appears in most SQL interviews and most clearly separates a confident candidate from a nervous one. Give it the full eight days.

- The mental model: like `GROUP BY`, but rows are kept rather than collapsed. Understand this before any syntax.
- `OVER()`, `PARTITION BY`, `ORDER BY` within `OVER`
- `ROW_NUMBER()` vs `RANK()` vs `DENSE_RANK()` — and precisely when each is right
- `LAG()` / `LEAD()` — period-over-period, the most common analytical ask
- Aggregate windows — `SUM() OVER (...)` for running totals and moving averages
- **Frame clauses** — `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`, `RANGE` vs `ROWS`. Most candidates never learn frames; knowing them is a visible level marker.
- `FIRST_VALUE`, `LAST_VALUE`, `NTILE`
- **CTEs** — `WITH`, chained CTEs, readability; then **recursive CTEs** for hierarchies

**The five patterns to write cold, under 10 minutes each:**
1. Deduplicate, keeping the most recent row per key
2. Top-N per group
3. Running total / cumulative sum
4. Month-over-month growth %
5. Gaps-and-islands (consecutive streaks) — hardest of the five; expect it at senior level

**Checkpoint:** all five, from scratch, no reference, while narrating.

## Tier 3 — Performance (Days 23–28)

What senior SQL rounds are actually about. A mid candidate writes a correct query; a senior one explains why it's fast. This tier converts 5 years of tenure into a credible senior story.

- How a database executes a query — parse, plan, execute
- Reading `EXPLAIN` / `EXPLAIN ANALYZE`: seq scan vs index scan; nested loop vs hash vs merge join
- Indexes: B-tree, composite, covering, partial — and **when an index is ignored**
- **Sargability** — why `WHERE YEAR(dt) = 2024` kills an index and `WHERE dt >= '2024-01-01'` doesn't
- Composite index column order
- Cardinality, selectivity, statistics
- Partitioning
- Rewrites: correlated subquery → join; `DISTINCT` → `EXISTS`; `OR` → `UNION ALL`

**The drill that builds the most confidence in the whole plan:** take a slow query, read its plan, predict the fix, apply it, measure the improvement. Ten times across the week, on a table with millions of rows. Watching a query go from 8 seconds to 40 milliseconds because of something *she* diagnosed does more for confidence than any amount of reading.

## Tier 4 — Modelling and transactions (Days 29–35)

- Normalisation 1NF → 3NF; when to denormalise deliberately
- **Star vs snowflake schema**, fact vs dimension tables, grain
- **Slowly Changing Dimensions**, especially Type 2 — expect to implement one
- ACID; isolation levels (read committed → serializable) and the anomaly each prevents
- Locking, deadlocks, cause and avoidance
- Stored procedures, functions, triggers — common in services-company interviews
- Materialised views

## Tier 5 — Maintenance and mastery (Days 36–60)

New material stops; drilling doesn't. ~2 hrs/day of problems for the rest of the plan, weighted toward whatever the actual interviews reveal as weak. Plus: recursive CTEs revisited, `PIVOT`/`UNPIVOT`, JSON in SQL, `GROUPING SETS`/`ROLLUP`/`CUBE`.

---

## Daily drilling (Day 3 → Day 60, non-negotiable)

**~2 hrs/day, timed.** Target ~250 problems over the plan.

| Source | Use for |
|---|---|
| **SQLBolt / Mode SQL Tutorial** | Weeks 1–2 only. Gentle, interactive, good for foundations. |
| **HackerRank SQL** | Weeks 1–3. Large easy/medium volume — and many services companies screen with it. |
| **LeetCode Database** | Weeks 3+. Medium and Hard. |
| **DataLemur** | Weeks 3+. Real questions from real companies. |
| **StrataScratch** | Weeks 4+. Closest to genuine interview difficulty. |
| **Ankit Bansal (YouTube)** | Window functions and interview patterns; well-matched to the Indian market. |

**Three rules:**
1. **Attempt fully before looking.** 20 minutes minimum. Struggle is where the learning happens; reading the solution first replaces it with a comfortable illusion.
2. **Keep an error log.** Every wrong answer: the problem, the mistake, the correction. Review it weekly. Mistakes repeat in clusters, and the log makes the pattern visible.
3. **Narrate from Week 3 onward.** Every problem, out loud, as if watched.

## Weekly checkpoints

| Week | Should be able to… |
|---|---|
| 1 | 3-table join + aggregation + filter, unaided. Explain logical execution order. |
| 2 | Design and create a small normalised schema. |
| 3 | Explain window functions conceptually; write `ROW_NUMBER` dedup. |
| 4 | All five window patterns cold. Read a plan and name the fix. |
| 5 | Design a star schema and defend the grain. Explain ACID. |
| 6 | Solve a Medium problem in 15 min while narrating. |
| 8 | Full mock interview, no lookups. |

**If a checkpoint slips, slow down.** Moving on from a shaky foundation is what created the current situation. Repeating that pattern would waste the 60 days — the plan has slack for this, and using it is the correct call.

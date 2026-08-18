# 60-Day Plan — SQL End-to-End, With Confidence

**Profile:** ~5 years as a developer at an IT services company, with SQL as part of the day job.
**Starting point:** SQL used at work but not deeply; no Python; limited server-side background.
**Time available:** full-time study.
**Study budget:** 6–8 focused hours/day, ~400 hours total.
**Goal by Day 60:** Genuinely competent in SQL end-to-end, working Python, interviewing well, pipeline full.
**Realistic offer date:** Day 75–90. Hiring is slow; this is normal, not failure.

---

## Read this part first

**The gap is real, and it is also completely ordinary.** Five years at a services company often means five years of a narrow slice — maintaining one module, writing the same shape of query, never designing anything. That produces exactly this: a real job title, real tenure, and no confidence. It is not a talent problem and it is not too late. It is a curriculum problem, and 400 focused hours is a lot of curriculum.

**Depth over breadth, deliberately.** The temptation is to cover SQL *and* Python *and* cloud *and* data engineering so the resume looks strong. That produces a resume that gets interviews and then fails them, which is worse than not getting them — it burns companies she can't reapply to for a year. This plan does SQL properly first, Python second, and explicitly does not attempt a Data Engineering pivot inside 60 days.

**Data Engineering is still the destination — just at month 6, not month 2.** Solid SQL is 60% of that role. Everything here is a prerequisite for it, so nothing is wasted. Making that jump later from real strength beats attempting it now from a thin one.

**Confidence is built by output, not input.** Watching SQL tutorials feels like progress and produces almost none. The rule for all 60 days: *if she hasn't typed it, she doesn't know it.* Every topic gets a real database and real queries. From Week 3, she explains answers out loud, because "can solve it" and "can solve it while someone watches" are different skills, and it's the second one she's short on.

---

## Target roles (revised)

| Priority | Role | Why |
|---|---|---|
| **Primary** | SQL Developer / Database Developer | Directly matches what she'll be genuinely good at by Day 45. Interviews are SQL-centric — her strongest ground. |
| **Primary** | Backend Developer (SQL-heavy) | Same skills, broader market. Needs the backend-fundamentals track in Week 6. |
| **Secondary** | Senior Data Analyst | SQL + reporting. Slightly lower ceiling, but interviews are the most forgiving and it's a legitimate stepping stone. |
| **Stretch, month 6+** | Data Engineer | The real destination. Revisit once SQL is genuinely strong and Python is comfortable. Not a Day-60 target. |

Services companies (Infosys, TCS, Cognizant, Accenture, LTIMindtree, Wipro) are a legitimate and strategically sensible target here, not a consolation prize — their interview loops are more predictable, they value her 5 years of tenure, and a lateral move at a better band buys the runway to do the DE jump properly next year.

---

## Phase map

| Phase | Days | Centre of gravity |
|---|---|---|
| **1 — Foundations** | 1–14 | SQL from the ground up. No applications yet. Build the base. |
| **2 — Depth** | 15–35 | Window functions, performance, modelling. Python starts Day 22. **Applications begin Day 25.** |
| **3 — Application** | 36–50 | Python consolidation, backend fundamentals, one project. Heavy applying. Interviews begin. |
| **4 — Convert** | 51–60+ | Mocks, live interview processes, continued drilling. |

**Applications start Day 25, not Day 5.** This is the one place I'd accept the delay: applying before the fundamentals hold means burning good openings on interviews she'll fail. Three weeks of preparation converts far better. Urgency is real, but a wasted first-round is more costly than a three-week wait.

**Start here each day:**
- [`sql-tracker.html`](sql-tracker.html) — the interactive tracker. Open in a browser, tick topics as they're genuinely done, progress saves automatically. Cmd+P saves it as a PDF.
- [`practice/`](practice/README.md) — **the practice database.** ~900k rows of realistic data plus 58 problems mapped to the tiers. This is where the actual learning happens; the tracker only records it.

Track files:
- [`01-sql-curriculum.md`](01-sql-curriculum.md) — the full SQL path, foundations upward
- [`02-python-track.md`](02-python-track.md) — Python from zero, data-focused
- [`03-resume-and-positioning.md`](03-resume-and-positioning.md) — honest positioning of 5 years
- [`04-job-search.md`](04-job-search.md) — where and how to apply
- [`05-interview-prep.md`](05-interview-prep.md) — the four rounds and how to drill each
- [`06-backend-fundamentals.md`](06-backend-fundamentals.md) — the minimum server-side concepts
- [`progress.md`](progress.md) — weekly tracker and checkpoints

---

## Daily shape

A 7-hour day:

| Block | Hours | What |
|---|---|---|
| Morning — new material | 2.5 | The week's topic. Typed, on a real database. |
| Midday — drilling | 2 | SQL problems, timed. Out loud from Week 3. |
| Afternoon — second track | 1.5 | Python (from Day 22) / project / backend concepts. |
| Evening — review + pipeline | 1 | Re-solve yesterday's hardest problem from memory. Then applications (from Day 25). |

That evening re-solve is the highest-value hour in the day. Solving something once is recognition; solving it again cold, a day later, is knowledge. This is the mechanism that turns study into confidence.

---

## Week by week

### Weeks 1–2 (Days 1–14) — Foundations, properly
Setup, then the base: `SELECT`/`WHERE`/`ORDER BY`, all join types, NULL semantics, aggregation and `GROUP BY`/`HAVING`, subqueries, set operations, DDL and constraints. Crucially, **logical execution order** — the concept that makes everything else stop feeling arbitrary.

No applications this fortnight. Build the floor first.

*Checkpoint:* writes a 3-table join with aggregation and filtering, from scratch, unaided.

### Weeks 3–4 (Days 15–28) — The step up
Window functions (the highest-yield interview topic there is), CTEs including recursive, then performance: `EXPLAIN`, indexes, sargability. Python begins Day 22. **Applications begin Day 25.** Narrating answers out loud starts here and never stops.

*Checkpoint:* the five core window patterns cold; can read an execution plan and name the fix.

### Week 5 (Days 29–35) — Modelling and transactions
Normalisation, star schemas, fact/dimension, SCD Type 2. ACID, isolation levels, deadlocks. Stored procedures, views, triggers. Python: pandas and database connectivity.

*Checkpoint:* designs a schema for a described business and defends the choices.

### Week 6 (Days 36–42) — Backend fundamentals + project
The minimum server-side model: client/server, HTTP, REST, APIs, where a database sits in an application, ORMs, connection pooling, caching, auth basics. Enough to not be blank when asked — see `06`. Project build starts.

### Week 7 (Days 43–49) — Consolidation
Project finished and on GitHub with a real README. Advanced SQL revisited. Mock interviews begin in earnest. Application volume peaks.

### Week 8 (Days 50–60) — Convert
Mocks on a schedule, behavioural stories in STAR form, company-specific prep, negotiation prep. Daily SQL drilling continues throughout — it never stops until she signs.

---

## How we'll know it's working

Confidence is a lagging indicator, so track leading ones instead:

- **Week 2:** can explain *why* a query works, not just that it does
- **Week 4:** solves a Medium problem unaided within 15 minutes
- **Week 5:** narrates a solution out loud without freezing
- **Week 6:** answers "how would you make this faster?" with specifics
- **Week 8:** completes a full mock interview without needing to look anything up

If Week 4's checkpoint slips, slow down rather than pushing on. Moving forward on a shaky foundation is what produced the current situation; repeating it would waste the 60 days.

---

## Assumptions worth correcting

- **Market:** assumed India (Kerala, Chennai, Bangalore). US/Middle East changes `04` substantially.
- **Notice period:** unknown. If 90 days, disclose it early on applications rather than at offer stage.
- **Current DB:** curriculum is written Postgres-first (best free tooling for learning). If her work is SQL Server or Oracle, learn on that instead — familiarity beats purity, and syntax differences are minor.

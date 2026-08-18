# Python — From Zero, Data-Focused

**Days 22–55, ~1.5 hrs/day.** Roughly 50 hours total.

**Scope decision:** starting from zero with SQL as the priority, Python gets one job — move data into, out of, and between databases, and write small scripts competently. That's it. This is not a "become a Python developer" track and shouldn't pretend to be; the resume claim we're earning is *"can write Python for data tasks,"* which is honest, defensible, and enough for the roles being targeted.

**Why it starts on Day 22, not Day 1:** splitting attention between two unfamiliar things halves the progress on both. SQL is the thing being interviewed on and the thing she needs confidence in. Python starts once SQL foundations hold.

---

## Weeks 4–5 (Days 22–35) — Core Python

**Setup (Day 22):** Python 3.12 via `pyenv`, VS Code with the Python extension, virtual environments — what they are and why they exist.

**Days 22–26 — Basics**
- Variables and types: `int`, `float`, `str`, `bool`
- Strings — f-strings, common methods, slicing
- Operators, truthiness
- `if`/`elif`/`else`
- `for` and `while`, `range`, `break`/`continue`
- **Lists** — indexing, slicing, `append`/`extend`/`sort`, and list comprehensions (used constantly in data code)
- **Dictionaries** — the most important structure for data work; keys, values, iteration, `.get()`
- Tuples and sets — and when each is the right choice

**Days 27–31 — Functions and structure**
- Defining functions, arguments, defaults, return values
- Scope; why globals cause problems
- Modules and imports; the standard library
- File I/O — reading and writing text and CSV; context managers (`with`)
- Exceptions — `try`/`except`/`finally`, and failing loudly rather than silently
- `datetime` — parsing, formatting, arithmetic, and why timezones cause real bugs
- Light OOP — classes, `__init__`, methods. Enough to *read* code that uses them; not a deep dive.

**Days 32–35 — Practice**
Small scripts only, each finished: read a CSV and summarise it; clean messy data; call a public API and save the response; rename files in bulk. Short, complete programs beat exercises — finishing something builds confidence in a way drills don't.

**Checkpoint:** writes a 30-line script that reads a CSV, filters it, computes a summary, and writes the output — unaided.

## Week 6 (Days 36–42) — Python + SQL together

This is the part that matters most for the target roles, and it's where her SQL becomes an advantage rather than a separate skill.

- `psycopg2` (Postgres) / `pyodbc` (SQL Server) — connect, query, fetch results
- Cursors, iterating result sets, closing connections properly
- **Parameterised queries** — never string-format SQL. Expect a SQL injection question; this is also the single most common junior mistake, so getting it right signals care.
- `SQLAlchemy` — engines, connections, running raw SQL through it
- Transactions from Python — commit and rollback
- Batch inserts; why row-by-row insertion is the classic performance mistake
- Loading a CSV into a database with a script, end to end

## Week 7 (Days 43–49) — pandas

Deliberately taught by mapping each operation to its SQL equivalent — she'll already think in SQL by now, which makes pandas almost free.

| pandas | SQL |
|---|---|
| `df[df.col > 5]` | `WHERE` |
| `df.groupby().agg()` | `GROUP BY` |
| `df.merge()` | `JOIN` |
| `pd.concat()` | `UNION ALL` |
| `df.sort_values()` | `ORDER BY` |
| `df.shift()` | `LAG` / `LEAD` |
| `df.drop_duplicates()` | `DISTINCT` |

Plus: `read_csv` / `read_sql` / `to_sql`, `.loc` vs `.iloc`, missing data handling, dtypes and conversion, pivot and melt.

**Checkpoint:** pulls a query into a DataFrame, transforms it, writes the result back to a new table.

## Weeks 8+ (Days 50–55) — Scripting practices

- Logging rather than `print`
- Config and secrets via environment variables — never committed
- Writing a script that's safe to re-run (idempotence) — a genuinely valuable concept and a good interview answer
- `requests` for API calls — pagination and error handling
- `pytest` basics — a couple of tests on the project

---

## Explicitly out of scope

Django/Flask/FastAPI, async/await, threading and multiprocessing, advanced OOP and design patterns, decorators and metaclasses, LeetCode algorithms in Python, PySpark. Each costs days and none appears in the interviews being targeted. Revisit when the Data Engineering pivot starts in month 6.

## The honest resume line

By Day 60 she can truthfully say: *"Python for data tasks — scripting, pandas, database connectivity, ETL-style loads."* She should not claim Python developer, and shouldn't need to. For SQL Developer and Backend roles, competent SQL plus working Python is a perfectly strong combination — and the honesty holds up in the room, which is worth more than a stronger-sounding claim that collapses under one follow-up question.

# Backend Fundamentals — the minimum viable model

**Week 6 (Days 36–42), ~1.5 hrs/day. ~10 hours total.**

**Purpose:** not to become a backend engineer, but to stop being blank when an interviewer asks how a database fits into an application. For SQL Developer and Backend-SQL roles, one or two questions like this always appear, and a coherent answer is worth far more than the small time investment.

**The goal is a mental model, not implementation skill.** She should be able to explain, on a whiteboard, what happens between a user clicking a button and a row being read.

---

## The one diagram that matters

```
Browser  →  Network (HTTP)  →  Web server  →  Application code  →  Database
   ↑                                                                  │
   └──────────────────── response ────────────────────────────────────┘
```

If she can draw that and talk through each hop — what it does, what can go wrong, where latency comes from — most junior-backend questions are covered.

## Day-by-day

**Day 36 — Client/server**
What a server actually is. Client vs server. IP addresses, ports, DNS. What "localhost" means. Request/response as a model.

**Day 37 — HTTP**
Methods (`GET`/`POST`/`PUT`/`PATCH`/`DELETE`) and which are idempotent. Status codes — the 2xx/4xx/5xx families and specifically 200, 201, 400, 401, 403, 404, 500. Headers, request body, JSON. Stateless protocol and what that implies.

**Day 38 — APIs and REST**
What an API is. REST conventions and resource-oriented URL design. Path vs query parameters. Reading API documentation. Postman for hands-on calls — try a public API and watch the request and response.

**Day 39 — Where the database sits** ⭐ most relevant day
The application layer between user and database. **Connection pooling** — why opening a connection per request is expensive. **ORMs** — what they do, and the **N+1 query problem**, which is the classic ORM performance bug and a great thing to be able to name. When to write raw SQL instead. Transactions at the application level.

This is the day that directly connects to her actual strength — it's where her SQL knowledge becomes an interview asset rather than a separate topic.

**Day 40 — Auth and security basics**
Authentication vs authorisation. Sessions vs tokens; JWT at a conceptual level. Password hashing (never plaintext, never plain MD5). **SQL injection** — how it works and why parameterised queries prevent it. This one connects directly to the Python track and comes up often.

**Day 41 — Performance and scale**
Caching, and Redis as the common answer. Latency vs throughput. Horizontal vs vertical scaling. Load balancers. Read replicas. Where a database usually becomes the bottleneck — a question she's unusually well placed to answer.

**Day 42 — Consolidation**
Draw the full diagram from memory and explain every component out loud. Then rehearse answers to the questions below.

---

## Questions to be ready for

- Walk me through what happens when a user submits a form.
- What's the difference between `GET` and `POST`?
- What does a 404 mean? A 500?
- What is an API?
- How does an application connect to a database?
- What is connection pooling and why does it matter?
- What is an ORM? What's the N+1 problem?
- How would you prevent SQL injection?
- Where would you add caching?
- Your application is slow — how do you diagnose it?

That last one is the opportunity. Most candidates answer vaguely. She can answer it well — check whether it's the app or the database, look at query timings, read the execution plan, check for missing indexes or non-sargable predicates. That's a genuinely senior answer and it comes straight out of Tier 3 of the SQL curriculum.

## Resources

- MDN's HTTP overview — the best free reference
- *Postman* — hands-on API calls, an hour well spent
- Any "backend basics in 1 hour" video for the mental model, then straight to practice

**Do not** start a full backend course, learn a web framework, or build an API from scratch. That's weeks of work for one interview question, and those weeks belong to SQL.

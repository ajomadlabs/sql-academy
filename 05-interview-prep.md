# Interview Preparation

**Light from Day 25. Primary focus Days 43–60.**

---

## The core issue

She can be well prepared and still freeze. That's the actual risk here, and it's a separate skill from knowing SQL. Interview performance is trainable — but only through reps that simulate the real conditions: out loud, under time pressure, being watched.

**The single most important habit in this plan:** from Week 3, every practice problem gets narrated out loud. Not thought through silently and then explained — narrated *while solving*. It feels ridiculous alone in a room. It is the difference between knowing SQL and demonstrating SQL, and the second one is what gets hired.

---

## The four rounds

### 1. Screening (recruiter, 15–30 min)
Not technical. They're checking basics and interest.

Prepare, out loud, until fluent: *"Tell me about yourself"* (90 seconds, ending on what she's looking for), why she's leaving, notice period, expected CTC, and a one-line summary of her tech stack.

**On expected CTC:** research the band first, then state a range with the bottom at her actual target. Never say "as per company standards" — it reads as low confidence and costs real money.

### 2. SQL technical (45–60 min) — the round that decides it
Live query writing, either on a shared screen or a platform like HackerRank.

Expect: 3–5 problems of rising difficulty; window functions almost certainly; a join or NULL-trap question; "how would you optimise this"; and schema-design discussion for senior roles.

**How to handle it — this matters as much as the SQL:**
1. **Restate the problem** before writing. Confirms understanding, buys thinking time, and reads as senior.
2. **Ask clarifying questions.** Are there NULLs? Duplicates? What's the expected output shape? Asking is a positive signal, not an admission of ignorance.
3. **Narrate while writing.** "I'll start with the join, then aggregate, then filter on the aggregate with HAVING." Silence reads as being stuck even when she isn't.
4. **Get something working, then improve it.** A correct-but-suboptimal query she then optimises out loud beats a silent five minutes hunting for the elegant answer.
5. **If stuck, say so and reason aloud.** "I'm thinking window function here — let me work through the partition." Interviewers help people who are visibly thinking. They can't help silence.

### 3. Technical discussion (30–45 min)
Concepts rather than code: indexes and when they're not used, ACID and isolation levels, normalisation and when to break it, `DELETE` vs `TRUNCATE` vs `DROP`, `WHERE` vs `HAVING`, joins vs subqueries, how to debug a slow query, stored procedures and triggers.

The differentiator: **give a real example.** "We had a report that took about 40 seconds; the plan showed a sequential scan on a date column with a function wrapped around it, so I rewrote the predicate as a range and it dropped under a second." That one sentence outweighs a page of textbook definitions.

### 4. Behavioural / managerial (30 min)
Standard set. Write out **six STAR stories** and rehearse them:
1. A difficult technical problem solved
2. A production issue handled under pressure
3. A disagreement with a colleague or manager
4. A mistake made, and what changed after
5. Something learned quickly under deadline
6. Helping or mentoring a teammate

She'll believe she has no good stories. She has five years of them — the excavation exercise in `03` produces this list.

---

## The mock interview schedule

Reps beat reading. From Day 43, three per week minimum.

- **With you** — you can run a SQL round from her own drilling problems. Screen shared, timed, no help. Being watched by someone familiar is a gentler first step.
- **Pramp / interviewing.io** — free peer mocks with strangers, which is closer to the real thing.
- **Recorded solo mocks** — set a timer, solve out loud, record it, watch it back. Uncomfortable and unusually effective; filler words, freezes, and unclear explanations are obvious on playback and invisible in the moment.
- **Real interviews at Tier 3 companies** — deliberately treated as practice. The stakes feel real because they are, which is exactly what makes them valuable.

**Rule after every mock:** write down the questions missed, then drill those specific gaps the next day. A mock without a follow-up drill is entertainment.

## The week before a real interview

- Research the company: products, tech stack, recent news
- Re-read the JD and map her experience to each line
- Re-drill the five window patterns
- Prepare 3 questions to ask them (about the team and the work, never about leave policy in round one)
- Test the setup — camera, mic, internet, the coding platform if there is one

## In the room

- Camera on, decent light, quiet room
- **Slow down.** Nervousness accelerates speech; deliberate pacing reads as confidence.
- Think out loud, always
- "I don't know, but here's how I'd find out" is a good answer. Bluffing is the worst one — interviewers detect it reliably and it costs more than the gap.
- Take notes
- Ask at the end about next steps and timeline

## After

Send a short thank-you note within 24 hours. Log every question asked into the tracker — companies reuse question banks, and patterns emerge fast across a hiring market.

**Rejections are data.** Ask for feedback (occasionally you'll get it). Note which topics broke down. Drill those. Twenty rejections with feedback acted on will produce an offer; twenty rejections that are only absorbed emotionally will produce a quit at week six.

/* Public catalogue: enough to show what the course is and where you are,
   and nothing you could learn from. Generated -- edit the plan in
   scripts/ and regenerate. The lessons live in the database. */

const MODULES = [
 {
  "id": 1,
  "name": "Databases and SQL",
  "c": "var(--t0)",
  "classes": [
   {
    "id": "1.1",
    "name": "Fundamentals",
    "days": [
     1
    ]
   },
   {
    "id": "1.2",
    "name": "Tables, data and control",
    "days": [
     2,
     3,
     4,
     5,
     6
    ]
   }
  ]
 },
 {
  "id": 2,
  "name": "Querying data",
  "c": "var(--t1)",
  "classes": [
   {
    "id": "2.1",
    "name": "Retrieval and aggregation",
    "days": [
     7,
     8,
     9,
     10,
     11,
     12
    ]
   },
   {
    "id": "2.2",
    "name": "Joins and subqueries",
    "days": [
     13,
     14,
     15,
     16,
     17,
     18
    ]
   }
  ]
 },
 {
  "id": 3,
  "name": "Advanced SQL",
  "c": "var(--t2)",
  "classes": [
   {
    "id": "3.1",
    "name": "Window functions",
    "days": [
     19,
     20,
     21,
     22,
     23,
     24,
     25
    ]
   },
   {
    "id": "3.2",
    "name": "Views and CTEs",
    "days": [
     26,
     27,
     28
    ]
   },
   {
    "id": "3.3",
    "name": "Pivots and routines",
    "days": [
     29,
     30
    ]
   }
  ]
 },
 {
  "id": 4,
  "name": "Performance and modelling",
  "c": "var(--t3)",
  "classes": [
   {
    "id": "4.1",
    "name": "How a query runs",
    "days": [
     31,
     32,
     33,
     34
    ]
   },
   {
    "id": "4.2",
    "name": "Rewrites",
    "days": [
     35,
     36
    ]
   },
   {
    "id": "4.3",
    "name": "Data modelling",
    "days": [
     37,
     38,
     39
    ]
   },
   {
    "id": "4.4",
    "name": "Concurrency",
    "days": [
     40,
     41,
     42
    ]
   }
  ]
 },
 {
  "id": 5,
  "name": "Interview problems",
  "c": "var(--t4)",
  "classes": [
   {
    "id": "5.1",
    "name": "The project",
    "days": [
     43
    ]
   },
   {
    "id": "5.2",
    "name": "Warm-up",
    "days": [
     44
    ]
   },
   {
    "id": "5.3",
    "name": "Medium",
    "days": [
     45,
     46
    ]
   },
   {
    "id": "5.4",
    "name": "Hard",
    "days": [
     47,
     48
    ]
   }
  ]
 }
];

const TIERS = MODULES.map(m => ({id:m.id, name:m.name, c:m.c,
  days:`Days ${Math.min(...m.classes.flatMap(c=>c.days))}\u2013${Math.max(...m.classes.flatMap(c=>c.days))}`}));

const DAYS = [{"d":1,"title":"What a database actually is","goal":"Explain what a database, a DBMS and an RDBMS are, and what SQL is for — in your own words.","hrs":"2–3 hrs","mod":1,"cls":"1.1","np":5,"nr":3},{"d":2,"title":"Data types and creating tables","goal":"Create a table with sensible types, and explain why the type choice matters.","hrs":"4–5 hrs","mod":1,"cls":"1.2","np":5,"nr":0},{"d":3,"title":"Changing data: INSERT, UPDATE, DELETE","goal":"Modify data safely, always previewing what you are about to change.","hrs":"4–5 hrs","mod":1,"cls":"1.2","np":5,"nr":0},{"d":4,"title":"Upserts: insert or update in one statement","goal":"Write a load that can be re-run safely without creating duplicates.","hrs":"4–5 hrs","mod":1,"cls":"1.2","np":5,"nr":2},{"d":5,"title":"Constraints: making bad data impossible","goal":"Use keys and constraints so the database itself refuses invalid rows.","hrs":"4–5 hrs","mod":1,"cls":"1.2","np":4,"nr":0},{"d":6,"title":"Transactions and permissions","goal":"Group statements into a transaction you can undo, and control who is allowed to do what.","hrs":"3–4 hrs","mod":1,"cls":"1.2","np":4,"nr":1},{"d":7,"title":"Getting rows out: SELECT, WHERE, ORDER BY","goal":"Pull any subset of rows from one table, filtered and sorted, without looking anything up.","hrs":"4–5 hrs","mod":2,"cls":"2.1","np":5,"nr":0},{"d":8,"title":"NULL: the thing that silently breaks queries","goal":"Explain why NULL is not zero and not empty string, and predict what a query does when NULLs are present.","hrs":"4–5 hrs","mod":2,"cls":"2.1","np":6,"nr":0},{"d":9,"title":"Aggregation: GROUP BY and HAVING","goal":"Summarise data by category and filter on the summary, knowing exactly which rows each function sees.","hrs":"4–5 hrs","mod":2,"cls":"2.1","np":6,"nr":0},{"d":10,"title":"Logical execution order — the day everything clicks","goal":"Recite the order SQL actually runs in, and use it to explain every rule you have met so far.","hrs":"4–5 hrs","mod":2,"cls":"2.1","np":5,"nr":2},{"d":11,"title":"Strings and dates","goal":"Manipulate text and do date arithmetic without looking up syntax every time.","hrs":"4–5 hrs","mod":2,"cls":"2.1","np":5,"nr":0},{"d":12,"title":"Combining results: UNION and UNION ALL","goal":"Stack two result sets into one, and know which of the two operators to reach for.","hrs":"3–4 hrs","mod":2,"cls":"2.1","np":4,"nr":1},{"d":13,"title":"Joins, part 1: the mental model","goal":"Combine two tables correctly and know why you chose INNER versus LEFT.","hrs":"4–5 hrs","mod":2,"cls":"2.2","np":6,"nr":0},{"d":14,"title":"Joins, part 2: self-joins, many tables, and fan-out","goal":"Join a table to itself, chain three or more tables, and spot when a join is inflating your numbers.","hrs":"4–5 hrs","mod":2,"cls":"2.2","np":6,"nr":0},{"d":15,"title":"The rest of the joins: FULL, CROSS and NATURAL","goal":"Use the remaining join types, and know why one of them should almost never be used.","hrs":"3–4 hrs","mod":2,"cls":"2.2","np":5,"nr":0},{"d":16,"title":"Subqueries, EXISTS, and the NOT IN trap","goal":"Nest one query inside another, and never be caught by the NOT IN NULL trap.","hrs":"4–5 hrs","mod":2,"cls":"2.2","np":5,"nr":1},{"d":17,"title":"STRING_AGG and ROLLUP","goal":"Collapse many rows into one string, and get subtotals without a second query.","hrs":"3–4 hrs","mod":2,"cls":"2.2","np":5,"nr":0},{"d":18,"title":"Consolidation — re-drill everything so far","goal":"Re-solve Week 1 problems cold, from memory, without notes.","hrs":"4–5 hrs","mod":2,"cls":"2.2","np":6,"nr":5},{"d":19,"title":"ANY, ALL, EXISTS and NOT EXISTS","goal":"Compare a value against a whole set, and know which operator the planner actually likes.","hrs":"3–4 hrs","mod":3,"cls":"3.1","np":4,"nr":1},{"d":20,"title":"Window functions: the idea","goal":"Explain what a window function is and why it is not a GROUP BY.","hrs":"4–5 hrs","mod":3,"cls":"3.1","np":5,"nr":0},{"d":21,"title":"Ranking: ROW_NUMBER, RANK, DENSE_RANK","goal":"Choose the right ranking function without hesitating, and explain how they differ on ties.","hrs":"4–5 hrs","mod":3,"cls":"3.1","np":4,"nr":1},{"d":22,"title":"Pattern 3: LAG, LEAD and period-over-period","goal":"Compare each row to the one before it, and compute growth percentages.","hrs":"4–5 hrs","mod":3,"cls":"3.1","np":4,"nr":1},{"d":23,"title":"Running totals and frame clauses","goal":"Write a running total, and explain what a frame is — including the LAST_VALUE surprise.","hrs":"4–5 hrs","mod":3,"cls":"3.1","np":5,"nr":0},{"d":24,"title":"Patterns 1 and 2: deduplication and top-N per group","goal":"Write both patterns cold, in under 10 minutes each.","hrs":"4–5 hrs","mod":3,"cls":"3.1","np":4,"nr":1},{"d":25,"title":"Gaps and islands — the hardest common pattern","goal":"Find runs of consecutive values, and sessionise events by time gap.","hrs":"5 hrs","mod":3,"cls":"3.1","np":4,"nr":1},{"d":26,"title":"Views and saved logic","goal":"Package a query as a view, and know when a view helps versus hurts.","hrs":"4–5 hrs","mod":3,"cls":"3.2","np":4,"nr":1},{"d":27,"title":"CTEs: making complex queries readable","goal":"Break a hard query into named steps with WITH.","hrs":"4–5 hrs","mod":3,"cls":"3.2","np":5,"nr":1},{"d":28,"title":"Recursive CTEs: hierarchies and trees","goal":"Walk a parent-child hierarchy to any depth with a single query.","hrs":"4–5 hrs","mod":3,"cls":"3.2","np":5,"nr":0},{"d":29,"title":"Pivoting: turning rows into columns","goal":"Reshape a result so categories become columns, with and without crosstab.","hrs":"3–4 hrs","mod":3,"cls":"3.3","np":4,"nr":1},{"d":30,"title":"Stored procedures, functions and triggers","goal":"Write a function and a trigger, and argue about when triggers are a bad idea.","hrs":"4–5 hrs","mod":3,"cls":"3.3","np":4,"nr":1},{"d":31,"title":"How a query actually runs, and reading EXPLAIN","goal":"Read an execution plan and say, in plain words, what the database decided to do.","hrs":"4–5 hrs","mod":4,"cls":"4.1","np":5,"nr":3},{"d":32,"title":"Indexes: what they are and when they are ignored","goal":"Create the right index for a query and explain why some indexes never get used.","hrs":"4–5 hrs","mod":4,"cls":"4.1","np":5,"nr":0},{"d":33,"title":"Sargability — why your index is being ignored","goal":"Spot a predicate that disables an index, and rewrite it.","hrs":"4–5 hrs","mod":4,"cls":"4.1","np":4,"nr":1},{"d":34,"title":"Composite indexes and column order","goal":"Explain why an index on (a, b) helps some queries and not others.","hrs":"4–5 hrs","mod":4,"cls":"4.1","np":4,"nr":1},{"d":35,"title":"Join strategies and query rewrites","goal":"Recognise the three join algorithms and rewrite a slow query into a fast one.","hrs":"4–5 hrs","mod":4,"cls":"4.2","np":4,"nr":1},{"d":36,"title":"The tuning drill — ten queries, measured","goal":"Diagnose and fix ten slow queries, recording before and after times.","hrs":"5 hrs","mod":4,"cls":"4.2","np":5,"nr":3},{"d":37,"title":"Normalisation — and when to break it","goal":"Take a messy flat table to 3NF, and argue for denormalising when it is right.","hrs":"4–5 hrs","mod":4,"cls":"4.3","np":5,"nr":3},{"d":38,"title":"Star schemas, facts, dimensions and grain","goal":"Design a star schema and defend its grain in one sentence.","hrs":"4–5 hrs","mod":4,"cls":"4.3","np":5,"nr":5},{"d":39,"title":"Slowly Changing Dimensions (Type 2)","goal":"Query a temporal table for the value that was valid at a point in time, and implement a Type 2 update.","hrs":"4–5 hrs","mod":4,"cls":"4.3","np":4,"nr":1},{"d":40,"title":"Transactions and ACID","goal":"Explain each ACID property with a concrete example, and use transactions correctly.","hrs":"4–5 hrs","mod":4,"cls":"4.4","np":4,"nr":1},{"d":41,"title":"Isolation levels, locking and deadlocks","goal":"Name each isolation level, the anomaly it prevents, and explain how deadlocks happen.","hrs":"4–5 hrs","mod":4,"cls":"4.4","np":5,"nr":2},{"d":42,"title":"Consolidation and first full mock","goal":"Re-solve every starred problem cold, then sit a timed 45-minute mock interview.","hrs":"5 hrs","mod":4,"cls":"4.4","np":6,"nr":5},{"d":43,"title":"The project: a parcel logistics report","goal":"Build a complete operational report from scratch, the way you would be asked to in a take-home.","hrs":"5–6 hrs","mod":5,"cls":"5.1","np":9,"nr":1},{"d":44,"title":"Interview problems: warm-up","goal":"Solve the easy tier cleanly and quickly — these are the screening questions.","hrs":"3–4 hrs","mod":5,"cls":"5.2","np":6,"nr":0},{"d":45,"title":"Interview problems: medium, part one","goal":"Window functions under interview conditions — ranking, offsets and per-group filtering.","hrs":"4–5 hrs","mod":5,"cls":"5.3","np":7,"nr":0},{"d":46,"title":"Interview problems: medium, part two","goal":"Time-based analysis — rates, windows of hours, and cumulative measures.","hrs":"4–5 hrs","mod":5,"cls":"5.3","np":7,"nr":0},{"d":47,"title":"Interview problems: hard, part one","goal":"Hierarchies, gaps, streaks and duplicate detection — the patterns that look impossible until you see them.","hrs":"5 hrs","mod":5,"cls":"5.4","np":6,"nr":0},{"d":48,"title":"Interview problems: hard, part two","goal":"Multi-step problems where the answer needs two or three stacked ideas.","hrs":"5 hrs","mod":5,"cls":"5.4","np":6,"nr":0}];

/* Filled in per day once the lesson has been fetched. */
const SOL = {};

/* Problem ids shifted when talking prompts moved out of practice.
   null means the id is no longer a solvable problem. */
const PROBLEM_MIGRATION = {"p1_1":null,"p1_2":null,"p1_3":"p1_1","p1_4":null,"p1_5":"p1_2","p1_6":"p1_3","p1_7":"p1_4","p4_2":null,"p4_3":null,"p4_4":"p4_2","p4_5":"p4_3","p4_6":"p4_4","p6_4":null,"p10_0":null,"p10_1":"p10_0","p10_2":"p10_1","p10_3":"p10_2","p10_4":null,"p10_5":"p10_3","p10_6":"p10_4","p12_4":null,"p16_5":null,"p18_0":null,"p18_1":null,"p18_2":null,"p18_3":null,"p18_4":null,"p18_5":"p18_0","p18_6":"p18_1","p18_7":"p18_2","p18_8":"p18_3","p18_9":"p18_4","p18_10":"p18_5","p19_4":null,"p21_3":null,"p21_4":"p21_3","p22_3":null,"p22_4":"p22_3","p24_4":null,"p25_4":null,"p26_4":null,"p27_3":null,"p27_4":"p27_3","p27_5":"p27_4","p29_4":null,"p30_4":null,"p31_0":null,"p31_1":"p31_0","p31_2":null,"p31_3":"p31_1","p31_4":null,"p31_5":"p31_2","p31_6":"p31_3","p31_7":"p31_4","p33_4":null,"p34_4":null,"p35_4":null,"p36_0":null,"p36_1":null,"p36_2":null,"p36_3":"p36_0","p36_4":"p36_1","p36_5":"p36_2","p36_6":"p36_3","p36_7":"p36_4","p37_0":null,"p37_1":"p37_0","p37_2":"p37_1","p37_3":null,"p37_4":null,"p37_5":"p37_2","p37_6":"p37_3","p37_7":"p37_4","p38_0":null,"p38_1":null,"p38_2":null,"p38_3":null,"p38_4":null,"p38_5":"p38_0","p38_6":"p38_1","p38_7":"p38_2","p38_8":"p38_3","p38_9":"p38_4","p39_3":null,"p39_4":"p39_3","p40_3":null,"p40_4":"p40_3","p41_3":null,"p41_4":null,"p41_5":"p41_3","p41_6":"p41_4","p42_0":null,"p42_1":null,"p42_2":null,"p42_3":null,"p42_4":null,"p42_5":"p42_0","p42_6":"p42_1","p42_7":"p42_2","p42_8":"p42_3","p42_9":"p42_4","p42_10":"p42_5","p43_9":null};

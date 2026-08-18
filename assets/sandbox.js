/* In-browser Postgres sandbox.

   Real PostgreSQL compiled to WASM (PGlite), not SQLite. That matters:
   the whole curriculum is Postgres — window frames, generate_series,
   recursive CTEs, date_trunc, FILTER, percentile_cont. Grading against
   a different dialect would teach her syntax interviewers do not ask
   for, and would fail correct answers.

   It is deliberately NOT a replacement for the Docker database. This
   carries ~17k orders so a browser can build it in seconds; Tier 3 is
   about watching an index change a real query's time, and that needs
   the full ~900k-row seed. */

const Sandbox = {
  /* Bump when practice/01-schema.sql or 02-seed-lite.sql change. It does
     two jobs: a browser holding the previous database rebuilds instead of
     serving data the current exercises no longer match, and the SQL files
     are fetched under this version so the rebuild cannot pick the old
     seed back out of the HTTP cache. */
  SEED_VERSION: 2,

  db: null,
  status: "idle",          // idle | booting | ready | failed
  _boot: null,
  listeners: [],

  onStatus(fn) { this.listeners.push(fn); },
  _emit(s, detail) { this.status = s; this.listeners.forEach(f => f(s, detail)); },

  /* Boots once and is shared by every problem on the page. Persisted to
     IndexedDB, so the ~6s build happens on the first use only. */
  ready() {
    if (this._boot) return this._boot;
    this._boot = (async () => {
      try {
        this._emit("booting", "starting Postgres…");
        const { PGlite } = await import(
          "https://cdn.jsdelivr.net/npm/@electric-sql/pglite@0.5.5/dist/index.js");

        this.db = new PGlite("idb://sql-academy-practice");
        await this.db.query("select 1");

        // already built on a previous visit?
        const built = await this.db.query(`
          select count(*)::int n from information_schema.tables
          where table_schema='public' and table_name='orders'`);

        /* A cached database that predates a seed change is worse than no
           cache: the exercises that depend on the new data quietly return
           nothing. The stamp lives outside the public schema so it never
           shows up when someone lists their tables. */
        let seeded = -1;
        try {
          const v = await this.db.query("select version from meta.seed limit 1");
          seeded = v.rows[0].version;
        } catch (e) { /* no stamp: built before versioning, or not built */ }

        if (built.rows[0].n === 0 || seeded !== Sandbox.SEED_VERSION) {
          this._emit("booting", "building the practice database — about ten seconds, once");
          const base = Sandbox.base();
          const [schema, seed] = await Promise.all([
            fetch(base + "practice/01-schema.sql?v=" + Sandbox.SEED_VERSION).then(r => r.text()),
            fetch(base + "practice/02-seed-lite.sql?v=" + Sandbox.SEED_VERSION).then(r => r.text())
          ]);
          await this.db.exec(schema);
          await this.db.exec(seed);
          await this.db.exec(Sandbox.stampSql());
        }

        this._emit("ready");
        return this.db;
      } catch (err) {
        console.warn("[sandbox]", err);
        this._emit("failed", err.message);
        throw err;
      }
    })();
    return this._boot;
  },

  /* query() refuses more than one statement, which silently made every
     multi-statement answer -- the transaction, DDL and upsert exercises --
     impossible to run at all. exec() takes a script; the interesting output
     is the last statement that returned columns, since a BEGIN/UPDATE/COMMIT
     ends with a SELECT to show what changed. */
  async run(sql) {
    const db = await this.ready();
    try {
      if (!this.isScript(sql)) return await db.query(sql);
      const results = await db.exec(sql);
      for (let i = results.length - 1; i >= 0; i--)
        if (results[i].fields && results[i].fields.length) return results[i];
      return { rows: [], fields: [] };
    } catch (err) {
      /* A script that fails part-way never reaches its own ROLLBACK, and
         the session is left in an aborted transaction where every later
         query dies complaining about a transaction the learner never
         opened. Several exercises trigger an error on purpose, so this
         has to clean up rather than leave the sandbox bricked. */
      try { await db.exec("rollback"); } catch (e) { /* nothing open */ }
      throw err;
    }
  },

  /* Only a hint, and deliberately generous: a semicolon inside a string
     literal would misread as a second statement, but routing a single
     statement through exec() still runs it correctly. */
  isScript(sql) {
    return sql.replace(/--[^\n]*/g, "")
              .split(";").map(s => s.trim()).filter(Boolean).length > 1;
  },

  /* Rebuild from scratch — for when she has experimented destructively.
     Mirrors "re-run the seed" on the Docker database. */
  async reset() {
    const db = await this.ready();
    const base = Sandbox.base();
    const [schema, seed] = await Promise.all([
      fetch(base + "practice/01-schema.sql?v=" + Sandbox.SEED_VERSION).then(r => r.text()),
      fetch(base + "practice/02-seed-lite.sql?v=" + Sandbox.SEED_VERSION).then(r => r.text())
    ]);
    await db.exec(schema);   // schema file drops the tables first
    await db.exec(seed);
    await db.exec(Sandbox.stampSql());
  },

  /* Where the SQL files live. Guessing from the path only ever handled
     /day/, so opening the Playground first on a fresh browser fetched the
     seed from the wrong depth, got the 404 page, and handed Postgres HTML
     to parse. The brand link points at the site root on every page. */
  base() {
    const b = document.querySelector(".brand");
    return b ? new URL(b.getAttribute("href"), location.href).href
             : new URL("./", location.href).href;
  },

  stampSql() {
    return `create schema if not exists meta;
            create table if not exists meta.seed (version int);
            delete from meta.seed;
            insert into meta.seed values (${Sandbox.SEED_VERSION});`;
  }
};

/* ---------------- grading ----------------

   The expected answer is produced by running the reference solution
   against the same database, rather than being stored. That keeps the
   two from drifting apart and means a correct-but-differently-written
   query passes: aliases, table prefixes and column names are ignored.
   Row order is only enforced when the reference itself orders. */

const Grader = {
  /* A result set is only a fair test for a single SELECT. DDL, EXPLAIN
     and multi-statement answers can still be run, just not graded. */
  gradeable(sql, sol) {
    if (!sql) return false;
    if (sol && sol.nograde) return false;   // an expected error has no result to compare
    // Answers that change the database are judged by what they changed,
    // not by what they returned. See checkEffect.
    if (sol && sol.verify) return true;
    const q = sql.replace(/--[^\n]*/g, "").trim();
    // Allowlist, not denylist: some answers are illustrative fragments
    // (a BAD/GOOD cheat sheet, a clause to paste into a larger query).
    // Anything that is not a single complete SELECT or WITH is runnable
    // at most, never graded.
    if (!/^\s*(select|with)\b/i.test(q)) return false;
    return q.split(";").map(s => s.trim()).filter(Boolean).length === 1;
  },

  _cells(rows, fields, ordered) {
    const out = rows.map(r => fields.map(f => {
      const v = r[f.name];
      if (v === null || v === undefined) return "∅";
      if (v instanceof Date) return v.toISOString().slice(0, 19);
      if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(4);
      if (typeof v === "string" && /^-?\d+\.\d+$/.test(v)) return parseFloat(v).toFixed(4);
      return String(v).trim();
    }).join(" | "));
    return ordered ? out : out.slice().sort();
  },

  /* Does this answer manage its own transaction? Then it cannot be graded
     by effect, because the isolation below depends on owning the only
     transaction in play -- their COMMIT would end ours. */
  ownsTransaction(sql) {
    return /\b(BEGIN|COMMIT|ROLLBACK|SAVEPOINT|START\s+TRANSACTION)\b/i
      .test(sql.replace(/--[^\n]*/g, ""));
  },

  /* Grading a CREATE or an INSERT by its result set is meaningless -- the
     answer is what it did to the database. So run it, ask a verification
     query what the database looks like now, and roll the whole thing back.

     Both sides run from the same committed state and the same setup, so the
     comparison is fair whatever the learner has already done to their
     database. Rolling back is what makes Check safe to press repeatedly,
     and what stops it quietly doing the exercise for them. */
  async checkEffect(userSql, sol) {
    if (this.ownsTransaction(userSql))
      return { pass: false, error: true,
               why: "This answer opens its own transaction, so it cannot be checked automatically. Run it and read the output instead." };

    const db = await Sandbox.ready();
    const attempt = async (script) => {
      await db.exec("BEGIN");
      try {
        if (sol.pre) await db.exec(sol.pre);   // same starting point for both sides
        await db.exec(script);
        return await db.query(sol.verify);
      } finally {
        try { await db.exec("ROLLBACK"); } catch (e) { /* already gone */ }
      }
    };

    let mine;
    try { mine = await attempt(userSql); }
    catch (err) { return { pass: false, error: true, why: err.message }; }
    const expected = await attempt(sol.a);

    const a = this._cells(mine.rows, mine.fields, true);
    const b = this._cells(expected.rows, expected.fields, true);
    if (a.length === b.length && a.every((x, i) => x === b[i]))
      return { pass: true, rows: mine, effect: true };

    return {
      pass: false,
      effect: true,
      why: a.length !== b.length
        ? `The database does not look right afterwards \u2014 the check found ${a.length} row${a.length===1?"":"s"} where it expected ${b.length}.`
        : `The database does not look right afterwards. Expected: ${b[0]} \u2014 found: ${a[0]}`,
      hint: "Check answer inspects the database after running your statements, then undoes them.",
      rows: mine
    };
  },

  async check(userSql, refSql, sol) {
    if (sol && sol.verify) return this.checkEffect(userSql, sol);
    let mine;
    try {
      mine = await Sandbox.run(userSql);
    } catch (err) {
      return { pass: false, error: true, why: err.message };
    }
    const expected = await Sandbox.run(refSql);
    const ordered = /order\s+by/i.test(refSql);

    if (mine.fields.length !== expected.fields.length)
      return { pass: false, why: `Expected ${expected.fields.length} column${expected.fields.length===1?"":"s"}, your query returned ${mine.fields.length}.`, rows: mine };
    if (mine.rows.length !== expected.rows.length)
      return { pass: false, why: `Expected ${expected.rows.length} row${expected.rows.length===1?"":"s"}, your query returned ${mine.rows.length}.`, rows: mine };

    const a = this._cells(mine.rows, mine.fields, ordered);
    const b = this._cells(expected.rows, expected.fields, ordered);
    const i = a.findIndex((x, ix) => x !== b[ix]);
    if (i === -1) return { pass: true, rows: mine };

    return {
      pass: false,
      why: ordered
        ? `Row ${i + 1} does not match. Expected: ${b[i]} — got: ${a[i]}`
        : `A row does not match. Expected: ${b[i]} — got: ${a[i]}`,
      hint: ordered ? "The reference answer is ordered, so row order counts here." : null,
      rows: mine
    };
  }
};

/* ---------------- schema reference ----------------
   Read from the live database rather than hard-coded, so it can never
   describe a column that is not there. Exploring is most of how you
   learn a schema, and you cannot explore what you cannot name. */

const Schema = {
  _cache: null,

  async tables() {
    if (this._cache) return this._cache;
    const db = await Sandbox.ready();
    const cols = await db.query(`
      select c.table_name, c.column_name, c.data_type, c.is_nullable,
             c.ordinal_position
      from information_schema.columns c
      join information_schema.tables t
        on t.table_name = c.table_name and t.table_schema = c.table_schema
      where c.table_schema = 'public' and t.table_type = 'BASE TABLE'
      order by c.table_name, c.ordinal_position`);

    const counts = {};
    const names = [...new Set(cols.rows.map(r => r.table_name))];
    for (const n of names) {
      const r = await db.query(`select count(*)::int n from "${n}"`);
      counts[n] = r.rows[0].n;
    }

    this._cache = names.map(n => ({
      name: n,
      rows: counts[n],
      columns: cols.rows.filter(r => r.table_name === n).map(r => ({
        name: r.column_name,
        type: r.data_type.replace("character varying", "varchar")
                         .replace("timestamp without time zone", "timestamp")
                         .replace("integer", "int"),
        nullable: r.is_nullable === "YES"
      }))
    }));
    return this._cache;
  },

  async html() {
    const ts = await this.tables();
    return `<div class="schema">${ts.map(t => `
      <div class="schema-t">
        <div class="schema-h">
          <b>${t.name}</b><span>${t.rows.toLocaleString()} rows</span>
        </div>
        <div class="schema-c">${t.columns.map(c =>
          `<span class="col"><i>${c.name}</i> ${c.type}${c.nullable ? '<em>null</em>' : ''}</span>`
        ).join("")}</div>
      </div>`).join("")}
      <p class="schema-n">Columns marked <em>null</em> can contain NULL &mdash; those are the ones that catch people out.</p>
    </div>`;
  }
};

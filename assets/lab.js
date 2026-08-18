/* The remote lab: a real Postgres holding the full ~900k-row dataset.

   The in-browser database is the right default. It is instant, works
   offline, and every graded problem is checked against it. But Module 4
   asks you to measure what an index does to a query, and fifty thousand
   rows cannot show you that -- the plan changes and the clock does not
   move. So the performance exercises can be sent to a real Postgres
   instead, where a sequential scan over 250k orders actually costs
   something you can read off the page.

   Everything you send is rolled back on the server, so the shared
   dataset stays as it was for the next person and you can create the
   same index a hundred times. */

const Lab = {
  /* Offered only when the project has actually been set up for it.
     The flag is explicit rather than probed: the alternative is a button
     that appears for everyone and fails for anyone whose project has not
     had the lab SQL applied, which is a worse first impression than no
     button at all. Set lab:true in config.js once supabase/lab has run. */
  available() {
    return typeof SUPABASE_CONFIG !== "undefined"
        && SUPABASE_CONFIG.lab === true
        && !SUPABASE_CONFIG.url.includes("YOUR_")
        && typeof Auth !== "undefined" && !!Auth.user;
  },

  /* The server takes statements one at a time rather than a script, so
     it can run all of them but only read back the last one's output.
     Splitting on semicolons outside string literals and comments is
     enough for the SQL these exercises involve. */
  split(sql) {
    const out = [];
    let cur = "", quote = null, i = 0;
    while (i < sql.length) {
      const c = sql[i], next = sql[i + 1];
      if (!quote && c === "-" && next === "-") {          // line comment
        const nl = sql.indexOf("\n", i);
        i = nl === -1 ? sql.length : nl;
        continue;
      }
      if (!quote && (c === "'" || c === '"')) quote = c;
      else if (quote && c === quote) quote = null;
      if (c === ";" && !quote) { out.push(cur.trim()); cur = ""; i++; continue; }
      cur += c; i++;
    }
    if (cur.trim()) out.push(cur.trim());
    return out.filter(Boolean);
  },

  async run(sql) {
    if (!Lab.available()) throw new Error("Sign in to use the remote database.");
    const stmts = Lab.split(sql);
    if (!stmts.length) throw new Error("Nothing to run.");

    const res = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/rpc/lab_run`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_CONFIG.anonKey,
        "Authorization": `Bearer ${await Auth.token()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ stmts })
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        res.status === 404
          ? "The remote database is not set up for this site yet."
          : `Remote database said ${res.status}: ${body.slice(0, 200)}`);
    }

    const data = await res.json();
    if (data && data.error) {
      /* Postgres puts the useful half of an error in DETAIL and HINT --
         which processes deadlocked, on which locks. Dropping them would
         leave the deadlock exercise showing three words. */
      const err = new Error(data.error);
      err.detail = data.detail || null;
      err.hint = data.hint || null;
      throw err;
    }

    /* Shaped like a PGlite result so the editor and the table renderer
       cannot tell the two engines apart. Column order survives because
       the server builds rows with json rather than jsonb. */
    const rows = data.rows || [];
    const fields = rows.length ? Object.keys(rows[0]).map(name => ({ name })) : [];
    return { rows, fields, ms: data.ms, truncated: data.truncated, remaining: data.remaining, remote: true };
  }
};

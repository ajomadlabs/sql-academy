/* The query editor attached to each practice problem.

   Design choices worth stating:

   - It opens on demand. Postgres-in-WASM is a few MB; loading it on
     every page view to serve a problem she may not attempt would be
     rude on a phone.

   - Passing the test ticks the problem off. That is the point of
     grading: the XP then reflects work that was actually verified,
     not work that was self-reported.

   - Failing never reveals the answer. It says how the result differed
     — row count, column count, or the first mismatching row — which
     is what a person needs to debug their own query. */

const Editor = {
  /* Renders into the workbench pane on the right. One editor exists at a
     time, rebuilt as you move between problems -- drafts survive because
     they are keyed by problem, not by editor instance. */
  stage(host, pid, refSql, onSolved, opts) {
    const gradeable = Grader.gradeable(refSql, SOL[pid]);
    /* Some exercises are about what a query costs, and the in-browser
       database is too small to have a cost worth reading. Those get the
       option of a real Postgres with the full dataset. */
    const offerLab = !!(opts && opts.lab) && typeof Lab !== "undefined" && Lab.available();
    /* Two sessions at once only exist on the real database, so these have
       nowhere else to run -- there is no dblink in the browser. No choice
       to offer, just an explanation of where the query is going. */
    const labOnly = !!(opts && opts.labOnly);
    let useLab = labOnly && offerLab;

    host.innerHTML = `
      <div class="ide">
        <div class="ide-h">
          <span class="ide-t">Your query</span>
          <span class="ide-s" data-role="status"></span>
        </div>
        <textarea class="ide-in" spellcheck="false" rows="9"
          placeholder="SELECT ...&#10;&#10;Cmd/Ctrl + Enter to run"></textarea>
        <div class="ide-a">
          <button class="ide-run" type="button">Run</button>
          ${gradeable ? `<button class="ide-check" type="button">Check answer</button>` : ""}
          <span class="ide-k">&#8984;&#8629; run${gradeable ? " &middot; &#8679;&#8984;&#8629; check" : ""}</span>
          <button class="ide-reset" type="button" title="Rebuild the practice data">Reset data</button>
          <button class="ide-schema" type="button">Tables</button>
        </div>
        ${labOnly ? `<div class="ide-engine">
          <span class="eng on" data-eng="lab">Real database &middot; two sessions</span>
          <span class="eng-note">${offerLab
            ? "This one needs two connections at once, which only exists on the real database. Postgres opens the second session itself."
            : "This one needs the real database, and it is not available right now. Sign in to run it."}</span>
        </div>` : offerLab ? `<div class="ide-engine">
          <button class="eng on" type="button" data-eng="local">In your browser</button>
          <button class="eng" type="button" data-eng="lab">Real database &middot; 900k rows</button>
          <span class="eng-note">This one is about what the query costs. Fifty thousand rows cannot show you that.</span>
        </div>` : ""}
        ${gradeable ? (SOL[pid] && SOL[pid].verify
            ? `<p class="ide-note">Checked by what it does to the database. Your statements are run, inspected, then undone.</p>` : "")
          : `<p class="ide-note">This one is checked by eye &mdash; there is no single result to compare against.</p>`}
        <div class="ide-schemabox" data-role="schema" hidden></div>
        <div class="ide-out" data-role="out"></div>
      </div>`;

    const ide  = host.querySelector(".ide");
    const ta   = ide.querySelector(".ide-in");
    const out  = ide.querySelector('[data-role="out"]');
    const stat = ide.querySelector('[data-role="status"]');

    // restore whatever was last typed for this problem
    const key = "sql-draft-" + pid;
    ta.value = localStorage.getItem(key) || "";
    ta.addEventListener("input", () => localStorage.setItem(key, ta.value));

    Sandbox.onStatus((s, d) => {
      stat.textContent = s === "booting" ? d
        : s === "ready" ? "Postgres ready"
        : s === "failed" ? "Sandbox unavailable — " + d : "";
      stat.dataset.s = s;
    });
    if (Sandbox.status !== "idle") {
      stat.textContent = Sandbox.status === "ready" ? "Postgres ready" : "";
      stat.dataset.s = Sandbox.status;
    }

    /* Run just executes and shows rows — no verdict. Looking at the data
       is a normal part of solving, and grading an exploratory query as
       "wrong" would punish exactly the right instinct. */
    const run = async () => {
      const sql = ta.value.trim();
      if (!sql) return;
      out.innerHTML = `<div class="ide-wait">${useLab ? "Running on the real database…" : "Running…"}</div>`;
      try {
        const r = useLab ? await Lab.run(sql) : await Sandbox.run(sql);
        const timing = r.remote
          ? ` <span class="ide-ms">${r.ms} ms on the real database${r.truncated ? ", first 200 rows" : ""}</span>` : "";
        out.innerHTML =
          `<div class="ide-ok">${r.rows.length} row${r.rows.length===1?"":"s"}.` + timing +
          (gradeable && !useLab ? ` <b>Check answer</b> when you think you have it.` : ``) + `</div>` +
          this.table(r);
      } catch (err) {
        out.innerHTML = `<div class="ide-err"><b>Postgres says:</b> ${this.esc(err.message)}` +
          (err.detail ? `\n${this.esc(err.detail)}` : "") +
          (err.hint ? `\n\nHint: ${this.esc(err.hint)}` : "") + `</div>`;
      }
    };

    const check = async () => {
      const sql = ta.value.trim();
      if (!sql) return;
      out.innerHTML = `<div class="ide-wait">Checking…</div>`;
      try {
        const r = await Grader.check(sql, refSql, SOL[pid]);
        out.innerHTML = this.verdict(r) + (r.rows ? this.table(r.rows) : "");
        if (r.pass && onSolved) onSolved();
      } catch (err) {
        out.innerHTML = `<div class="ide-err"><b>Postgres says:</b> ${this.esc(err.message)}</div>`;
      }
    };

    ide.querySelector(".ide-run").addEventListener("click", run);

    /* Grading always uses the local database: it is the one every
       expected answer was produced against, and a plan read off the
       real one is not something you can compare row by row anyway. */
    if (offerLab && !labOnly) {
      ide.querySelectorAll(".eng").forEach(b => b.addEventListener("click", () => {
        useLab = b.dataset.eng === "lab";
        ide.querySelectorAll(".eng").forEach(x => x.classList.toggle("on", x === b));
        const chk = ide.querySelector(".ide-check");
        if (chk) {
          chk.disabled = useLab;
          chk.title = useLab ? "Checking uses the database in your browser" : "";
        }
      }));
    }
    const checkBtn = ide.querySelector(".ide-check");
    if (checkBtn) checkBtn.addEventListener("click", check);
    ta.addEventListener("keydown", e => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        e.shiftKey && checkBtn ? check() : run();
      }
    });

    /* schema reference — read from the live database so it cannot go stale */
    ide.querySelector(".ide-schema").addEventListener("click", async () => {
      const box = ide.querySelector('[data-role="schema"]');
      if (!box.hidden) { box.hidden = true; return; }
      box.hidden = false;
      box.innerHTML = `<div class="ide-wait">Reading schema…</div>`;
      box.innerHTML = await Schema.html();
    });
    ide.querySelector(".ide-reset").addEventListener("click", async e => {
      const b = e.target; b.textContent = "Rebuilding…"; b.disabled = true;
      try { await Sandbox.reset(); b.textContent = "Data reset"; }
      catch { b.textContent = "Failed"; }
      setTimeout(() => { b.textContent = "Reset data"; b.disabled = false; }, 1800);
    });

    Sandbox.ready().catch(() => {});
  },

  verdict(r) {
    if (r.pass)
      return `<div class="ide-pass">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>
        <b>Correct.</b> ${r.effect
          ? "The database looks exactly as it should afterwards. Your changes have been undone, so you can run it yourself."
          : `${r.rows.rows.length} row${r.rows.rows.length===1?"":"s"}, matching the expected result.`}</div>`;
    if (r.error)
      return `<div class="ide-err"><b>Postgres says:</b> ${this.esc(r.why)}</div>`;
    return `<div class="ide-fail"><b>Not quite.</b> ${this.esc(r.why)}
      ${r.hint ? `<span class="ide-hint">${this.esc(r.hint)}</span>` : ""}</div>`;
  },

  /* A date column has no time component; showing "00:00:00" after every
     date is noise. Only render the time when there is one. */
  fmtVal(v) {
    if (v === null || v === undefined) return null;
    if (v instanceof Date) {
      const iso = v.toISOString();
      return iso.endsWith("T00:00:00.000Z") ? iso.slice(0, 10) : iso.slice(0, 19).replace("T", " ");
    }
    return String(v);
  },

  table(res) {
    if (!res.rows.length) return `<div class="ide-empty">No rows returned.</div>`;
    const cols = res.fields.map(f => f.name);
    // cap rather than scroll: a scrollbar inside a scrolling page is the
    // thing that made this feel cluttered
    const LIMIT = 15;
    const cap = res.rows.slice(0, LIMIT);
    const cell = v => {
      const f = this.fmtVal(v);
      return f === null ? `<i class="nul">NULL</i>` : this.esc(f);
    };
    return `<div class="ide-tw"><table class="ide-tbl">
      <thead><tr>${cols.map(c => `<th>${this.esc(c)}</th>`).join("")}</tr></thead>
      <tbody>${cap.map(r => `<tr>${cols.map(c => `<td>${cell(r[c])}</td>`).join("")}</tr>`).join("")}</tbody>
    </table></div>${res.rows.length > LIMIT ? `<div class="ide-more">Showing ${LIMIT} of ${res.rows.length} rows \u2014 open the Playground for the full result.</div>` : ""}`;
  },


  esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
};

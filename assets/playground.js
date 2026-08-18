/* Free-form query page. No problem, no grading — just the database.

   Laid out as a tool rather than a document: the editor takes the space
   it needs, results take everything left, and there is exactly one
   scrolling surface per pane. Nested scrollbars were the main thing
   making the earlier version feel cluttered. */

const PG = {
  el: id => document.getElementById(id),

  init() {
    const ta = this.el("pg-in"), out = this.el("pg-out"), stat = this.el("pg-status");

    ta.value = localStorage.getItem("sql-playground") || "SELECT * FROM customers LIMIT 20;";
    ta.addEventListener("input", () => localStorage.setItem("sql-playground", ta.value));

    Sandbox.onStatus((s, d) => {
      stat.textContent = s === "booting" ? d
        : s === "ready" ? "ready"
        : s === "failed" ? "unavailable — " + d : "";
      stat.dataset.s = s;
    });

    const run = async () => {
      const sql = ta.value.trim();
      if (!sql) return;
      out.innerHTML = `<div class="pg-msg">Running…</div>`;
      const t0 = performance.now();
      try {
        const r = await Sandbox.run(sql);
        const ms = Math.round(performance.now() - t0);
        out.innerHTML = this.result(r, ms);
      } catch (err) {
        out.innerHTML = `<div class="pg-msg err"><b>Postgres says</b>${Editor.esc(err.message)}</div>`;
      }
      out.scrollTop = 0;
    };
    this.run = run;

    this.el("pg-run").addEventListener("click", run);
    ta.addEventListener("keydown", e => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); run(); }
      if (e.key === "Tab") {                       // tab should indent, not leave the field
        e.preventDefault();
        const s = ta.selectionStart;
        ta.value = ta.value.slice(0, s) + "  " + ta.value.slice(ta.selectionEnd);
        ta.selectionStart = ta.selectionEnd = s + 2;
      }
    });

    this.el("pg-reset").addEventListener("click", async e => {
      const b = e.target; b.textContent = "Rebuilding…"; b.disabled = true;
      try { await Sandbox.reset(); Schema._cache = null; await this.paintSchema(); b.textContent = "Reset"; }
      catch { b.textContent = "Failed"; }
      setTimeout(() => { b.textContent = "Reset data"; b.disabled = false; }, 1600);
    });

    this.el("pg-samples").addEventListener("click", e => {
      const b = e.target.closest("[data-q]");
      if (!b) return;
      ta.value = b.dataset.q;
      localStorage.setItem("sql-playground", ta.value);
      run();
    });

    Sandbox.ready().then(() => { this.paintSchema(); run(); }).catch(() => {});
  },

  /* Results render as one scrollable pane. Wide output (a query plan,
     say) scrolls horizontally inside it rather than clipping. */
  result(res, ms) {
    const n = res.rows.length;
    const head = `<div class="pg-meta">${n} row${n === 1 ? "" : "s"} · ${ms} ms</div>`;
    if (!n) return head + `<div class="pg-msg">No rows returned.</div>`;
    const cols = res.fields.map(f => f.name);
    const cap = res.rows.slice(0, 200);
    const cell = v => {
      const f = Editor.fmtVal(v);
      return f === null ? `<i class="nul">NULL</i>` : Editor.esc(f);
    };
    return head + `<div class="pg-tw"><table class="ide-tbl">
      <thead><tr>${cols.map(c => `<th>${Editor.esc(c)}</th>`).join("")}</tr></thead>
      <tbody>${cap.map(r => `<tr>${cols.map(c => `<td>${cell(r[c])}</td>`).join("")}</tr>`).join("")}</tbody>
    </table></div>` + (n > 200 ? `<div class="pg-meta">Showing the first 200.</div>` : "");
  },

  /* A compact, scannable list. Clicking a table queries it — the fastest
     way to answer "what is actually in here?". */
  async paintSchema() {
    const box = this.el("pg-schema");
    const ts = await Schema.tables();
    this.el("pg-tcount").textContent = ts.length;
    box.innerHTML = ts.map(t => `
      <details class="tbl">
        <summary>
          <span class="tbl-n">${t.name}</span>
          <span class="tbl-r">${t.rows.toLocaleString()}</span>
        </summary>
        <div class="tbl-c">
          ${t.columns.map(c => `<span class="col"><i>${c.name}</i>${c.type}${c.nullable ? "<em>null</em>" : ""}</span>`).join("")}
          <button class="tbl-q" data-t="${t.name}">SELECT *</button>
        </div>
      </details>`).join("");

    box.addEventListener("click", e => {
      const b = e.target.closest(".tbl-q");
      if (!b) return;
      const ta = this.el("pg-in");
      ta.value = `SELECT * FROM ${b.dataset.t} LIMIT 20;`;
      localStorage.setItem("sql-playground", ta.value);
      this.run();
    }, { once: false });
  }
};
document.addEventListener("DOMContentLoaded", () => PG.init());

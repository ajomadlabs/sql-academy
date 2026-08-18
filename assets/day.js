/* A single day: one lesson, start to finish, with no other day competing
   for attention. Reads its number from <body data-day="N">. */

const N   = +document.body.dataset.day;
const D   = DAYS.find(x => x.d === N);
const T   = TIERS.find(t => t.id === D.mod) || TIERS[0];
const CLS = (MODULES.find(m => m.id === D.mod) || {classes:[]}).classes.find(c => c.id === D.cls) || {name:""};
const esc = s => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

/* auto syntax-highlight solution SQL.
   escape -> numbers -> comments -> strings -> keywords -> restore, so the
   placeholders are created after the number pass and never re-matched. */
const KW=/\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|FULL|OUTER|CROSS|ON|AND|OR|NOT|IN|IS|NULL|GROUP|BY|ORDER|HAVING|LIMIT|OFFSET|AS|CASE|WHEN|THEN|ELSE|END|WITH|RECURSIVE|UNION|ALL|INTERSECT|EXCEPT|DISTINCT|OVER|PARTITION|ROWS|RANGE|BETWEEN|UNBOUNDED|PRECEDING|FOLLOWING|CURRENT_DATE|CURRENT|ROW|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|REPLACE|TABLE|VIEW|INDEX|DROP|ALTER|ADD|RENAME|COLUMN|PRIMARY|KEY|FOREIGN|REFERENCES|UNIQUE|CHECK|DEFAULT|CONSTRAINT|BEGIN|COMMIT|ROLLBACK|SAVEPOINT|EXPLAIN|ANALYZE|EXISTS|LIKE|CONFLICT|DO|NOTHING|EXCLUDED|RETURNS|LANGUAGE|FUNCTION|TRIGGER|MATERIALIZED|REFRESH|COALESCE|NULLIF|CAST|DATE|INTERVAL|TIMESTAMP|IF|ELSIF|DECLARE|RETURN|WINDOW|FILTER|WITHIN|ASC|DESC|USING|LATERAL|TRUNCATE|CASCADE|ISOLATION|LEVEL|READ|COMMITTED|REPEATABLE|SERIALIZABLE|MERGE|MATCHED|STABLE|IMMUTABLE|NEW|OLD|EXTRACT|YEAR|MONTH|DOW|AFTER|EACH|EXECUTE|SHOW|RESET|numeric|int|bigint|text|boolean|bigserial|date)\b/g;
function hl(sql){
  let s=esc(sql); const store=[];
  const keep=(cls,txt)=>{store.push('<span class="'+cls+'">'+txt+'</span>'); return "\x00"+(store.length-1)+"\x00";};
  s=s.replace(/\b\d+(\.\d+)?\b/g,m=>'<span class="n">'+m+'</span>');
  s=s.replace(/--[^\n]*/g,m=>keep('c',m));
  s=s.replace(/'[^'\n]*'/g,m=>keep('s',m));
  s=s.replace(KW,m=>'<span class="k">'+m+'</span>');
  return s.replace(/\x00(\d+)\x00/g,(_,i)=>store[+i]);
}

document.title = `Day ${N} · ${D.title} — SQL Day by Day`;
document.documentElement.style.setProperty("--tc", T.c);

/* ---------- header ---------- */
document.getElementById("dayhead").innerHTML = `
  <p class="eyebrow"><a href="../../">Course</a> <span>/</span> ${esc(T.name)} <span>/</span> ${esc(CLS.name)} <span>/</span> Day ${N}</p>
  <h1>${esc(D.title)}</h1>
  <p class="goal"><b>Today's goal.</b> ${esc(D.goal)}</p>
  <div class="dmeta">
    <span class="pill" style="--tc:${T.c}">Module ${T.id} &middot; ${esc(CLS.name)}</span>
    <span class="hrs">${esc(D.hrs)}</span>
    <span class="hrs">${D.practice ? D.practice.length : 0} problems</span>
  </div>`;

/* ---------- lesson ---------- */
let b = "";
if (D.why) b += `<section class="blk"><h2 class="sec">Why this matters</h2><p class="lead">${D.why}</p></section>`;

if (D.concepts) {
  b += `<section class="blk"><h2 class="sec">Concepts</h2>`;
  D.concepts.forEach(c => {
    b += `<article class="cpt"><h3>${c.h}</h3><p>${c.p}</p>`;
    if (c.code) b += `<pre><code>${c.code}</code></pre>`;
    if (c.out)  b += `<div class="out">&rarr; ${c.out}</div>`;
    b += `</article>`;
  });
  b += `</section>`;
}

if (D.gotchas && D.gotchas.length) {
  b += `<section class="blk"><h2 class="sec">Watch out for</h2>`;
  D.gotchas.forEach(g => { b += `<div class="gotcha"><b>${g.t}</b><p>${g.p}</p></div>`; });
  b += `</section>`;
}

/* Prompts that are not editor work -- spoken answers, timed re-drills,
   review. They used to sit in the problem list with no way to solve or
   check them, which made the list look broken. */
if (D.rehearse && D.rehearse.length) {
  b += `<section class="blk"><h2 class="sec">Rehearse</h2>
    <p class="pnote">Work these away from the editor. An answer you have only thought is not an answer you can give under pressure.</p>
    <div class="rz">`;
  D.rehearse.forEach((r, i) => {
    b += `<div class="rz-i">
      <p class="rz-q"><b class="rz-n">${i + 1}</b><span>${r.q}${r.h ? `<span class="hint">${r.h}</span>` : ""}</span></p>
      ${r.n ? `<details class="sol"><summary><span class="eye">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
        </span>Show a model answer</summary><div class="solb"><p class="soln">${r.n}</p></div></details>` : ""}
    </div>`;
  });
  b += `</div></section>`;
}

if (D.refs) {
  b += `<section class="blk"><h2 class="sec">References</h2><div class="refs">`;
  D.refs.forEach(r => { b += `<a href="${r.u}" target="_blank" rel="noopener">${r.l}</a>${r.n ? `<span>${r.n}</span>` : ""}`; });
  b += `</div></section>`;
}

if (D.cp) b += `<div class="cpbox"><b>Checkpoint</b><p>${D.cp}</p></div>`;

/* ---------- practice ----------
   The list stays put on the left while you work on the right. Solving one
   problem no longer scrolls the rest out of reach, and the wide half of the
   screen -- previously empty -- becomes the place you actually work. */
const P   = D.practice || [];
const pid = i => `p${N}_${i}`;

/* The list needs a short label. Most questions open with a bold title;
   where there isn't one, fall back to a trimmed opening clause. */
function label(q) {
  const m = q.match(/^<b>(.*?)<\/b>/);
  if (m) return esc(m[1].replace(/\s*[.—–-]\s*$/, ""));
  const t = q.replace(/<[^>]+>/g, "");
  return esc(t.length > 56 ? t.slice(0, 56).replace(/\s\S*$/, "") + "…" : t);
}

let practice = "";
if (P.length) {
  practice = `<div class="pwork">
    <aside class="plist">
      <div class="plist-h"><span>Problems</span><span id="pcount"></span></div>
      <div class="pbar-t"><i id="pfill"></i></div>
      <div class="plist-b">${P.map((p, i) => `
        <button type="button" class="pitem${Progress.problemDone(pid(i)) ? " solved" : ""}" data-i="${i}">
          <span class="pdot" aria-hidden="true"></span>
          <span class="pi-n">${i + 1}</span>
          <span class="pi-t">${label(p.q)}</span>
        </button>`).join("")}</div>
    </aside>
    <section class="pstage" id="pstage"></section>
  </div>`;
}

document.getElementById("daybody").innerHTML = `
  <div class="tabs" role="tablist">
    <button type="button" class="tab" role="tab" data-tab="lesson">Lesson</button>
    ${P.length ? `<button type="button" class="tab" role="tab" data-tab="practice">Practice <b class="tcount" id="tcount"></b></button>` : ""}
  </div>
  <div class="panel" data-panel="lesson">${b}</div>
  ${P.length ? `<div class="panel" data-panel="practice" hidden>${practice}</div>` : ""}`;

/* ---------- tabs ---------- */
const tabs   = [...document.querySelectorAll(".tab")];
const panels = [...document.querySelectorAll(".panel")];
let current  = -1;

function showTab(name) {
  tabs.forEach(t => {
    const on = t.dataset.tab === name;
    t.classList.toggle("on", on);
    t.setAttribute("aria-selected", on ? "true" : "false");
  });
  panels.forEach(p => { p.hidden = p.dataset.panel !== name; });
  // Postgres is a few megabytes of WebAssembly, so it must not boot for
  // someone who only came to read. Opening Practice is the signal to start.
  if (name === "practice" && current === -1) {
    const firstUnsolved = P.findIndex((_, i) => !Progress.problemDone(pid(i)));
    select(firstUnsolved === -1 ? 0 : firstUnsolved);
  }
}
tabs.forEach(t => t.addEventListener("click", () => {
  showTab(t.dataset.tab);
  history.replaceState(null, "", t.dataset.tab === "practice" ? "#practice" : location.pathname);
}));

/* ---------- the workbench ---------- */
function select(i) {
  if (!P.length || i < 0 || i >= P.length) return;
  current = i;
  document.querySelectorAll(".pitem").forEach((el, k) => el.classList.toggle("on", k === i));
  const p = P[i], id = pid(i), s = SOL[id];
  document.getElementById("pstage").innerHTML = `
    <div class="ps-h">
      <span class="ps-n">Problem ${i + 1} of ${P.length}</span>
      <label class="ps-done"><input type="checkbox" data-p="${id}"${Progress.problemDone(id) ? " checked" : ""}><span>Solved</span></label>
    </div>
    <p class="ps-q">${p.q}</p>
    ${p.h ? `<p class="ps-hint">${p.h}</p>` : ""}
    <div id="ps-ide"></div>
    ${s ? `<details class="sol"><summary><span class="eye">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
      </span>Show solution</summary><div class="solb">
      ${s.a ? `<pre><code>${hl(s.a)}</code></pre>` : ""}
      ${s.n ? `<p class="soln">${s.n}</p>` : ""}</div></details>` : ""}
    <div class="ps-nav">
      <button type="button" class="psbtn" data-go="-1"${i === 0 ? " disabled" : ""}>&larr; Previous</button>
      <button type="button" class="psbtn" data-go="1"${i === P.length - 1 ? " disabled" : ""}>Next problem &rarr;</button>
    </div>`;
  if (s && s.a && typeof Editor !== "undefined")
    Editor.stage(document.getElementById("ps-ide"), id, s.a, () => setSolved(id, true), { lab: !!p.lab, labOnly: !!p.labOnly });
}

function setSolved(id, on) {
  Progress.setProblem(id, on);
  const i = P.findIndex((_, k) => pid(k) === id);
  const item = document.querySelectorAll(".pitem")[i];
  if (item) item.classList.toggle("solved", on);
  const cb = document.querySelector(`input[data-p="${id}"]`);
  if (cb) cb.checked = on;
  practiceCount();
}

document.addEventListener("click", e => {
  const item = e.target.closest(".pitem");
  if (item) { select(+item.dataset.i); return; }
  const go = e.target.closest(".psbtn");
  if (go) {
    select(current + (+go.dataset.go));
    document.querySelector(".pstage").scrollIntoView({ block: "start", behavior: "smooth" });
  }
});

document.addEventListener("change", e => {
  const id = e.target.dataset && e.target.dataset.p;
  if (id) setSolved(id, e.target.checked);
});

/* ---------- practice progress ---------- */
function practiceCount() {
  if (!P.length) return;
  const n = P.filter((_, i) => Progress.problemDone(pid(i))).length;
  const fill = document.getElementById("pfill");
  if (fill) fill.style.width = (n / P.length * 100) + "%";
  const c = document.getElementById("pcount");
  if (c) c.textContent = `${n}/${P.length}`;
  const t = document.getElementById("tcount");
  if (t) t.textContent = `${n}/${P.length}`;
}
practiceCount();
showTab(location.hash === "#practice" ? "practice" : "lesson");

/* This file draws the page before the gate has finished working out who
   you are, so anything that depends on being signed in -- the offer to
   run against the real database -- is not known yet at first paint.
   Rebuilding the current problem once the gate resolves is enough; the
   draft survives because it is saved to storage as you type, not held
   in the editor. */
window.onGateReady = () => { if (current >= 0) select(current); };

/* ---------- complete + navigate ---------- */
const prev = DAYS.find(x => x.d === N - 1), next = DAYS.find(x => x.d === N + 1);
const doneBtn = document.getElementById("markdone");

function paintDone() {
  const done = Progress.dayDone(N);
  doneBtn.classList.toggle("is-done", done);
  doneBtn.innerHTML = done
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg> Day ${N} complete`
    : `Mark Day ${N} complete`;
}
paintDone();

doneBtn.addEventListener("click", () => {
  const now = !Progress.dayDone(N);
  Progress.setDay(N, now);
  paintDone();
  if (now) celebrate();
});

/* Silent success is the anti-pattern — completing a day should feel like
   something happened, and say what it earned. */
function celebrate() {
  const streak = Progress.streak(), done = Progress.daysDone();
  const msg = MILESTONES[N];
  const t = document.createElement("div");
  t.className = "toast";
  t.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>
    <div>
      <b>${msg ? msg : `Day ${N} done.`}</b>
      <span>+${Points.forDay()} XP &middot; ${done} of ${DAYS.length} days${streak > 1 ? ` &middot; ${streak}-day streak` : ""}</span>
    </div>`;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add("in"));
  setTimeout(() => { t.classList.remove("in"); setTimeout(() => t.remove(), 400); }, 4200);
}

document.getElementById("daynav").innerHTML = `
  ${prev ? `<a class="nav prev" href="../${prev.d}/"><span>&larr; Day ${prev.d}</span><b>${esc(prev.title)}</b></a>` : `<a class="nav prev" href="../../"><span>&larr; Course</span><b>Back to dashboard</b></a>`}
  ${next ? `<a class="nav next" href="../${next.d}/"><span>Day ${next.d} &rarr;</span><b>${esc(next.title)}</b></a>` : `<a class="nav next" href="../../"><span>Finish &rarr;</span><b>Back to dashboard</b></a>`}`;

/* keyboard: left/right move between days */
addEventListener("keydown", e => {
  // arrows belong to whatever is focused -- jumping days out from under
  // someone mid-problem is never what they meant
  if (e.target.matches("input,textarea,summary,button,a,[contenteditable]")) return;
  if (e.key === "ArrowLeft"  && prev) location.href = `../${prev.d}/`;
  if (e.key === "ArrowRight" && next) location.href = `../${next.d}/`;
});

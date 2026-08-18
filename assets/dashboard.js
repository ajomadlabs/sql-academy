/* Dashboard: where you are, what to do next, and what you have built. */

const esc = s => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const el  = id => document.getElementById(id);

/* ---------- continue card: the single most important thing on the page ---------- */
function renderContinue() {
  const next = Progress.nextDay();
  const done = Progress.daysDone();

  if (next === null) {
    el("continue").innerHTML = `
      <div class="cont finished">
        <div class="cont-l">
          <p class="cont-k">Curriculum complete</p>
          <h2>All ${DAYS.length} days done.</h2>
          <p class="cont-s">Keep drilling daily until you sign an offer. Re-solve the starred problems cold, a week apart.</p>
        </div>
        <a class="cta" href="day/35/">Review Day 35 &rarr;</a>
      </div>`;
    return;
  }

  const d = DAYS.find(x => x.d === next);
  const tier = TIERS.find(t => t.id === d.mod) || TIERS[0];
  el("continue").innerHTML = `
    <div class="cont" style="--tc:${tier.c}">
      <div class="cont-l">
        <p class="cont-k">${done === 0 ? "Start here" : "Pick up where you left off"}</p>
        <h2>Day ${d.d} &middot; ${esc(d.title)}</h2>
        <p class="cont-s">${esc(d.goal)}</p>
        <p class="cont-m"><span class="pill" style="--tc:${tier.c}">${esc(tier.name)}</span><span class="hrs">${esc(d.hrs)}</span></p>
      </div>
      <a class="cta" href="day/${d.d}/">${done === 0 ? "Begin Day 1" : "Continue"} &rarr;</a>
    </div>`;
}

/* ---------- stats ---------- */
function renderStats() {
  const done = Progress.daysDone(), total = Progress.totalDays();
  const streak = Progress.streak(), best = Progress.state.bestStreak || 0;
  const pd = Progress.problemsDone(), pt = Progress.totalProblems();
  const pct = Progress.pct();
  const lv = Points.level();

  // progress ring
  const R = 52, C = 2 * Math.PI * R;
  el("ring").innerHTML = `
    <svg viewBox="0 0 120 120" class="ringsvg" role="img" aria-label="${pct}% complete">
      <circle cx="60" cy="60" r="${R}" class="ring-bg"></circle>
      <circle cx="60" cy="60" r="${R}" class="ring-fg"
              stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct/100)}"></circle>
    </svg>
    <div class="ring-c"><b>${pct}<i>%</i></b><span>${done} of ${total} days</span></div>`;

  el("stats").innerHTML = `
    <div class="stat">
      <span class="sk">Streak</span>
      <span class="sv ${streak > 0 ? "hot" : ""}">${streak}<i>${streak === 1 ? "day" : "days"}</i></span>
      <span class="ss">${best > 0 ? `best ${best}` : "study today to start one"}</span>
    </div>
    <div class="stat">
      <span class="sk">Problems solved</span>
      <span class="sv">${pd}<i>/ ${pt}</i></span>
      <span class="ss">${pt - pd} to go</span>
    </div>
    <div class="stat">
      <span class="sk">Days completed</span>
      <span class="sv">${done}<i>/ ${total}</i></span>
      <span class="ss">${total - done} remaining</span>
    </div>
    <div class="stat">
      <span class="sk">Experience</span>
      <span class="sv gold">${lv.xp}<i>XP</i></span>
      <span class="ss">Lv ${lv.index} ${lv.name}${lv.next ? ` &middot; ${lv.toNext} to go` : ""}</span>
    </div>
    <div class="stat">
      <span class="sk">Today</span>
      <span class="sv ${Progress.studiedToday() ? "ok" : ""}">${Progress.studiedToday() ? "Done" : "Not yet"}</span>
      <span class="ss">${Progress.studiedToday() ? "come back tomorrow" : "one day keeps the streak"}</span>
    </div>`;
}

/* ---------- the map: every day, grouped by tier ---------- */
function renderMap() {
  const next = Progress.nextDay();
  let h = "";
  MODULES.forEach(M => {
    const mdays = M.classes.flatMap(c => c.days);
    const done  = mdays.filter(n => Progress.dayDone(n)).length;
    h += `
    <section class="mod" style="--tc:${M.c}">
      <header class="mod-h">
        <span class="mod-n">Module ${M.id}</span>
        <h3>${esc(M.name)}</h3>
        <span class="mod-d">${M.classes.length} classes &middot; ${mdays.length} days</span>
        <span class="mod-p ${done === mdays.length ? "done" : ""}">${done === mdays.length ? "Complete" : `${done}/${mdays.length}`}</span>
      </header>`;
    M.classes.forEach(C => {
      h += `<div class="cls"><div class="cls-h">Class ${C.id} &middot; ${esc(C.name)}</div><div class="chips">`;
      C.days.forEach(n => {
        const d = DAYS.find(x => x.d === n);
        const isDone = Progress.dayDone(n), isNext = n === next;
        h += `<a class="chip${isDone ? " done" : ""}${isNext ? " next" : ""}" href="day/${n}/" title="${esc(d.title)}">
                <span class="cn">${n}</span>
                <span class="ct">${esc(d.title)}</span>
                ${isDone ? `<svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>`
                         : isNext ? `<span class="cnx">next</span>` : ""}
              </a>`;
      });
      h += `</div></div>`;
    });
    h += `</section>`;
  });
  el("map").innerHTML = h;
}


/* ---- the activity graph ----------------------------------------------

   A year of calendar days, one square each, darker the more you did.
   Weeks run down the columns and forward across, the way GitHub's does,
   because that is the shape people already know how to read.

   Two decisions worth recording. The scale is relative to your own busiest
   day rather than a fixed number, so a light week still shows contrast
   instead of a wall of the palest shade. And empty days are drawn rather
   than skipped -- the gaps are the honest part, and a graph that hid them
   would be decoration. */
function renderGraph() {
  const box = el("graph");
  if (!box) return;

  /* Server-side history when signed in, local counters otherwise, so
     the card is right across devices and still renders offline. */
  const g = Progress.graphData();
  const act = g.days;
  const today = new Date(Progress.today() + "T00:00:00");

  // start on the Sunday on or before 52 weeks ago, so columns are whole weeks
  const start = new Date(today);
  start.setDate(start.getDate() - 364);
  start.setDate(start.getDate() - start.getDay());

  const iso = d => Progress.iso(d);   // local dates, not UTC: see Progress.iso
  const counts = [];
  let peak = 0;
  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const key = iso(d);
    const v = act[key];
    const n = Progress.countFor(v);
    if (n > peak) peak = n;
    const e = typeof v === "number" ? { p: v, d: 0 } : (v || { p: 0, d: 0 });
    counts.push({ key, n, p: e.p || 0, done: e.d || 0, dow: d.getDay(), month: d.getMonth() });
  }

  const level = n => {
    if (!n) return 0;
    if (peak <= 1) return 4;
    const r = n / peak;
    return r > 0.66 ? 4 : r > 0.33 ? 3 : r > 0.12 ? 2 : 1;
  };

  // columns of seven, padded so the first week starts on the right weekday
  const weeks = [];
  let week = new Array(counts[0].dow).fill(null);
  counts.forEach(c => {
    week.push(c);
    if (week.length === 7) { weeks.push(week); week = []; }
  });
  if (week.length) { while (week.length < 7) week.push(null); weeks.push(week); }

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  let labels = "", seen = -1;
  weeks.forEach((w, i) => {
    const first = w.find(Boolean);
    if (first && first.month !== seen && first.key.slice(-2) <= "07") {
      labels += `<span class="g-mo" style="grid-column:${i + 1}">${MONTHS[first.month]}</span>`;
      seen = first.month;
    }
  });

  const active   = counts.filter(c => c.n > 0).length;
  const problems = counts.reduce((n, c) => n + c.p, 0);
  const finished = counts.reduce((n, c) => n + c.done, 0);
  const streak = Progress.streak();
  const best   = Progress.state.bestStreak || 0;

  /* Anything solved before the graph existed has no date attached, so it
     cannot be placed on a square. It still counts, so say so plainly
     rather than letting someone who has already done half the course
     open this and be told to solve their first problem. */
  const pre = g.undated;
  const preBits = [];
  if (pre.p) preBits.push(`${pre.p} problem${pre.p === 1 ? "" : "s"}`);
  if (pre.d) preBits.push(`${pre.d} day${pre.d === 1 ? "" : "s"}`);
  const preLine = preBits.length
    ? `${preBits.join(" and ")} from before the graph started, with no dates recorded`
    : "";

  /* No title attribute: the native tooltip takes a second to appear, cannot
     be styled, and puts the date last. This carries the data instead and a
     single floating element does the display. */
  const cells = weeks.map(w => w.map(c => {
    if (!c) return `<i class="g-c g-pad"></i>`;
    return `<i class="g-c" data-l="${level(c.n)}" data-day="${c.key}"`
         + ` data-p="${c.p}" data-done="${c.done}"></i>`;
  }).join("")).join("");

  box.innerHTML = `
    <div class="g-head">
      <h2>Your year</h2>
      <span class="g-sum">${active === 0
        ? (preBits.length
            ? "Starts filling in from today"
            : "Solve one problem and this starts filling in")
        : `${problems} problem${problems === 1 ? "" : "s"}`
          + `${finished ? ` &middot; ${finished} day${finished === 1 ? "" : "s"} finished` : ""}`
          + ` &middot; active on ${active} day${active === 1 ? "" : "s"}`}</span>
    </div>
    <div class="g-wrap">
      <div class="g-months" style="grid-template-columns:repeat(${weeks.length},minmax(0,1fr))">${labels}</div>
      <div class="g-grid" style="grid-template-columns:repeat(${weeks.length},minmax(0,1fr))">${cells}</div>
    </div>
    <div class="g-tip" hidden></div>
    ${preLine ? `<p class="g-pre">${preLine}</p>` : ""}
    <div class="g-foot">
      <span class="g-streak">${streak === 0 && !best
        ? "No streak yet"
        : `<b>${streak}</b> day${streak === 1 ? "" : "s"} in a row${best > streak ? ` &middot; best ${best}` : ""}`}</span>
      <span class="g-key">less
        <i class="g-c" data-l="0"></i><i class="g-c" data-l="1"></i><i class="g-c" data-l="2"></i><i class="g-c" data-l="3"></i><i class="g-c" data-l="4"></i>
        more</span>
    </div>`;

  wireTip(box);
}

/* One tooltip, moved to whichever square is under the pointer. Follows the
   cell rather than the cursor so it does not jitter, and clamps to the
   card so squares at either end are not cut off. */
function wireTip(box) {
  const tip = box.querySelector(".g-tip");
  const grid = box.querySelector(".g-grid");
  if (!tip || !grid) return;

  const label = c => {
    const p = +c.dataset.p, d = +c.dataset.done;
    const when = new Date(c.dataset.day + "T00:00:00")
      .toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
    const bits = [];
    if (p) bits.push(`<b>${p}</b> problem${p === 1 ? "" : "s"} solved`);
    if (d) bits.push(`<b>${d}</b> day${d === 1 ? "" : "s"} finished`);
    return `<span class="g-tip-w">${bits.length ? bits.join(" &middot; ") : "Nothing this day"}</span>`
         + `<span class="g-tip-d">${when}</span>`;
  };

  const show = c => {
    tip.innerHTML = label(c);
    tip.hidden = false;
    const cell = c.getBoundingClientRect(), host = box.getBoundingClientRect();
    const w = tip.offsetWidth;
    let left = cell.left - host.left + cell.width / 2 - w / 2;
    left = Math.max(8, Math.min(left, host.width - w - 8));
    tip.style.left = `${left}px`;
    tip.style.top = `${cell.top - host.top - tip.offsetHeight - 8}px`;
  };

  grid.addEventListener("mouseover", e => {
    const c = e.target.closest(".g-c[data-day]");
    if (c) show(c);
  });
  grid.addEventListener("mouseleave", () => { tip.hidden = true; });
  // touch: tap a square to read it
  grid.addEventListener("click", e => {
    const c = e.target.closest(".g-c[data-day]");
    if (c) show(c); else tip.hidden = true;
  });
}

function renderAll() {
  renderContinue(); renderStats(); renderGraph(); renderMap();
  const rg = el("curr-range");
  if (rg) rg.textContent = `Days 1\u2013${DAYS.length} \u00b7 SQL from zero to interview-ready`;
  const cs = el("curr-stats");
  if (cs) cs.textContent = `${MODULES.length} modules \u00b7 ${DAYS.length} days \u00b7 `
        + `${DAYS.reduce((n, d) => n + (d.np || 0), 0)} problems`;
}
renderAll();
document.addEventListener("progress:synced", renderAll);

/* reset */
el("reset").addEventListener("click", () => {
  const s = el("saved");
  if (s.dataset.arm) {
    Progress.reset();
    s.dataset.arm = ""; s.textContent = "Progress cleared";
    renderAll();
  } else {
    s.dataset.arm = "1"; s.textContent = "Click again to confirm";
    setTimeout(() => { if (s.dataset.arm) { s.dataset.arm = ""; s.textContent = "Saved in this browser"; } }, 4000);
  }
});

/* returning from a day page should show fresh numbers */
addEventListener("pageshow", e => { if (e.persisted) { Progress.state = JSON.parse(localStorage.getItem("sql-daybyday-v1") || "{}"); renderAll(); } });

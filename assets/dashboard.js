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

function renderAll() {
  renderContinue(); renderStats(); renderMap();
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

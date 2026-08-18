/* Shared progress state: completion, streak, and the "what next" pointer.
   Used by the dashboard and every day page. */

const KEY = "sql-daybyday-v1";

/* Problem ids shifted when the talking prompts moved out of practice.
   Applied once per device: without it, a solved marker would land on
   whichever problem inherited its index, crediting work never done. */
const MIGRATED = "sql-daybyday-migrated-v2";
function migrate(state) {
  if (localStorage.getItem(MIGRATED) || typeof PROBLEM_MIGRATION === "undefined") return state;
  const out = {};
  Object.entries(state).forEach(([k, v]) => {
    if (!(k in PROBLEM_MIGRATION)) { out[k] = v; return; }
    const to = PROBLEM_MIGRATION[k];
    if (to) out[to] = v;          // moved; null means it is no longer solvable
  });
  localStorage.setItem(MIGRATED, "1");
  localStorage.setItem(KEY, JSON.stringify(out));
  return out;
}

const Progress = {
  state: migrate(JSON.parse(localStorage.getItem(KEY) || "{}")),

  save() {
    localStorage.setItem(KEY, JSON.stringify(this.state));
    // mirror to Supabase when signed in; debounced, never blocking
    if (typeof Auth !== "undefined" && Auth.user) Auth.queuePush();
  },

  dayDone(n)        { return !!this.state["d" + n]; },
  problemDone(pid)  { return !!this.state[pid]; },

  setProblem(pid, v) {
    this.state[pid] = v;
    if (v) this.touch("p");       // solving counts as studying
    this.save();
  },

  /* ---- activity ---------------------------------------------------------

     One counter per calendar day: what the graph is drawn from, and now
     what the streak is computed from too.

     The streak used to move only when a day was marked complete, so
     someone who solved twenty problems and never ticked the box had a
     streak of zero. Any real work counts now.

     Nothing here can be backfilled. Before this, only the most recent
     study date was kept, so the graph necessarily starts from the day
     this shipped -- inventing plausible history would be worse than an
     empty chart. */
  act() { return (this.state.act = this.state.act || {}); },

  /* kind is "p" for a problem solved, "d" for a day completed, so the
     graph can say "3 problems and a day finished" rather than "4 things".
     Older entries are plain numbers, which are read as problems. */
  entry(day) {
    const a = this.act();
    const cur = a[day];
    if (typeof cur === "number") return (a[day] = { p: cur, d: 0 });
    return (a[day] = cur || { p: 0, d: 0 });
  },

  countFor(v) {
    if (!v) return 0;
    return typeof v === "number" ? v : (v.p || 0) + (v.d || 0);
  },

  touch(kind) {
    const t = this.today();
    const e = this.entry(t);
    e[kind === "d" ? "d" : "p"] += 1;
    const a = this.act();
    this.state.lastStudied = t;
    const s = this.streakFrom(a);
    this.state.streak = s;
    if (s > (this.state.bestStreak || 0)) this.state.bestStreak = s;
  },

  /* Counts back from today, allowing yesterday to be the latest day so a
     streak is not lost before the day is over. */
  streakFrom(a) {
    const days = Object.keys(a || {}).filter(d => this.countFor(a[d]) > 0).sort();
    if (!days.length) return 0;
    const last = days[days.length - 1];
    const gap = this.daysBetween(last, this.today());
    if (gap > 1) return 0;
    let n = 1, cursor = last;
    const set = new Set(days);
    for (;;) {
      const prev = this.shiftDate(cursor, -1);
      if (!set.has(prev)) break;
      n++; cursor = prev;
    }
    return n;
  },

  shiftDate(day, delta) {
    const d = new Date(day + "T00:00:00");
    d.setDate(d.getDate() + delta);
    return this.iso(d);
  },

  /* Marking a day complete is the moment that drives the streak. */
  setDay(n, v) {
    this.state["d" + n] = v;
    if (v) this.touch("d");
    this.save();
  },

  daysDone()  { return DAYS.filter(d => this.dayDone(d.d)).length; },
  totalDays() { return DAYS.length; },
  pct()       { return Math.round(this.daysDone() / this.totalDays() * 100); },

  /* Count only problems that actually exist in the curriculum. Counting
     raw keys would inflate the total if a problem is ever removed, and
     would disagree with the XP calculation.

     Counted from np in the catalogue rather than the practice array,
     because the array is part of the lesson and the lesson is not
     loaded until you open the day. The dashboard has to total everyone's
     problems without reading anybody's lessons. */
  problemsDone() {
    return DAYS.reduce((n, d) =>
      n + Array.from({length: d.np || 0}, (_, i) => i)
            .filter(i => this.problemDone(`p${d.d}_${i}`)).length, 0);
  },
  totalProblems() {
    return DAYS.reduce((n, d) => n + (d.np || 0), 0);
  },

  /* The next unfinished day — what the dashboard's primary CTA points at. */
  nextDay() {
    const d = DAYS.find(x => !this.dayDone(x.d));
    return d ? d.d : null;
  },

  /* ---- streak ---------------------------------------------------------
     Counts consecutive calendar days on which at least one day was
     completed. Studying twice in one day does not inflate it; missing a
     day resets it. Stored as a plain YYYY-MM-DD string so it survives
     timezone changes better than a timestamp. */
  /* A calendar day in the reader's own timezone.

     Deliberately not toISOString(), which converts to UTC first: east of
     Greenwich that returns yesterday for most of the day, so today's work
     would land on the wrong square and the streak would count from the
     wrong end. Every date in this file goes through here. */
  iso(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  },

  today() { return this.iso(new Date()); },
  daysBetween(a, b) {
    return Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000);
  },
  touchStreak() {
    const today = this.today(), last = this.state.lastStudied;
    if (!last)                        this.state.streak = 1;
    else if (last === today)          { /* already counted today */ }
    else if (this.daysBetween(last, today) === 1) this.state.streak = (this.state.streak || 0) + 1;
    else                              this.state.streak = 1;
    this.state.lastStudied = today;
    if ((this.state.streak || 0) > (this.state.bestStreak || 0))
      this.state.bestStreak = this.state.streak;
  },
  /* Read the streak lazily so a stale one decays without needing a write. */
  streak() {
    if (this.state.act) return this.streakFrom(this.state.act);
    const last = this.state.lastStudied;
    if (!last) return 0;
    const gap = this.daysBetween(last, this.today());
    return gap <= 1 ? (this.state.streak || 0) : 0;
  },
  studiedToday() { return this.state.lastStudied === this.today(); },

  reset() {
    this.state = {};
    localStorage.removeItem(KEY);
    if (typeof Auth !== "undefined" && Auth.user) Auth.push();   // clear the remote copy too
  }
};

/* Milestone copy — shown once a day is completed. Earned, not constant
   cheerleading: only fires on genuine checkpoints. */
const MILESTONES = {
  1:  "First day done. The hardest one is starting.",
  6:  "Module 1 complete. You know what a database is and how to change one safely.",
  18: "Module 2 complete. Every join and subquery — the half of SQL most work actually uses.",
  30: "Module 3 complete. Window functions, CTEs and pivots. This is the material interviews turn on.",
  42: "Module 4 complete. You can read a query plan and design a schema. That is senior-level ground.",
  48: "All 48 days. 253 problems. That is the whole curriculum — go and interview."
};

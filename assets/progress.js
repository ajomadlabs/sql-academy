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

  setProblem(pid, v) { this.state[pid] = v; this.save(); },

  /* Marking a day complete is the moment that drives the streak. */
  setDay(n, v) {
    this.state["d" + n] = v;
    if (v) this.touchStreak();
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
  today() {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`;
  },
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

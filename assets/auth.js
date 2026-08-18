/* Supabase auth + progress sync.

   Design rules this follows:

   1. Auth is OPTIONAL. Without an account everything still works from
      localStorage. Signing in adds cross-device sync, nothing else.
      Never block Day 1 behind a signup form.

   2. Offline-first. localStorage stays the working copy; the network
      is a mirror. A dropped connection must never lose a tick.

   3. Merges are UNION, never overwrite. If the laptop and the phone
      both have progress, the answer is everything both have done —
      losing completed work to a sync is unforgivable, and "last write
      wins" would do exactly that. Progress here is monotonic (you do
      not un-learn Day 3), so union is also semantically right.
      Un-ticking therefore only propagates while online.
*/

/* Google's mark, inlined — an external image request would be one more
   thing to fail, and the CSP-free CDN is not worth the dependency. */
const GOOGLE_MARK = `<svg viewBox="0 0 18 18" width="15" height="15" aria-hidden="true"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/></svg>`;

const Auth = {
  client: null,
  user: null,
  ready: false,

  async init() {
    if (!window.SUPABASE_CONFIG || !SUPABASE_CONFIG.url || SUPABASE_CONFIG.url.includes("YOUR_")) {
      this.ready = true;                 // not configured — local-only mode
      document.body.classList.add("no-auth");
      this.paint();
      return;
    }
    try {
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      this.client = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
      const { data } = await this.client.auth.getSession();
      this.user = data.session ? data.session.user : null;
      this.client.auth.onAuthStateChange((_e, s) => {
        this.user = s ? s.user : null;
        this.paint();
        // supabase-js holds an internal lock for the duration of this
        // callback, so calling back into the client from inside it
        // deadlocks — silently, with no error. Defer off the callback.
        if (this.user) setTimeout(() => this.pull(), 0);
      });
      this.ready = true;
      this.paint();
      if (this.user) await this.pull();
    } catch (err) {
      console.warn("[auth] unavailable, staying local-only:", err.message);
      this.ready = true;
      document.body.classList.add("no-auth");
      this.paint();
    }
  },

  /* ---------- sync ---------- */

  /* Pull the remote row, union it with local, write the result back. */
  async pull() {
    if (!this.client || !this.user) return;
    try {
      const { data, error } = await this.client
        .from("progress").select("*").eq("user_id", this.user.id).maybeSingle();
      if (error) throw error;

      if (data) {
        const merged = this.merge(Progress.state, data);
        Progress.state = merged;
        Progress.save();
      }
      await this.push();
      await this.syncLog();     // before the render event: the graph reads it
      this.paint();
      document.dispatchEvent(new CustomEvent("progress:synced"));
    } catch (err) {
      console.warn("[auth] pull failed:", err.message);
      this.flag("offline");
    }
  },

  merge(local, remote) {
    const out = Object.assign({}, local);

    // days + problems: union of both sides
    Object.entries(remote.days || {}).forEach(([k, v]) => { if (v) out["d" + k] = true; });
    /* Remote rows can predate the problem renumbering, so ids arriving
       from the server go through the same map as the local ones --
       otherwise a second device would quietly restore the old ids that
       the local migration has just cleaned up. */
    Object.entries(remote.problems || {}).forEach(([k, v]) => {
      if (!v) return;
      const id = (typeof PROBLEM_MIGRATION !== "undefined" && k in PROBLEM_MIGRATION)
        ? PROBLEM_MIGRATION[k] : k;
      if (id) out[id] = true;
    });

    /* Activity: union by date, keeping the larger count. Summing would
       double-count a day worked on two devices that both synced; the
       larger number is the closer estimate and cannot inflate on every
       subsequent sync the way a sum would. */
    const norm = v => (typeof v === "number" ? { p: v, d: 0 } : (v || { p: 0, d: 0 }));
    const act = {};
    Object.keys(local.act || {}).forEach(day => { act[day] = norm(local.act[day]); });
    Object.entries(remote.activity || {}).forEach(([day, v]) => {
      const r = norm(v), l = act[day] || { p: 0, d: 0 };
      act[day] = { p: Math.max(l.p || 0, r.p || 0), d: Math.max(l.d || 0, r.d || 0) };
    });
    out.act = act;

    // streak: keep the better record from either device
    out.bestStreak = Math.max(local.bestStreak || 0, remote.best_streak || 0);
    const localLast = local.lastStudied || "", remoteLast = remote.last_studied || "";
    if (remoteLast > localLast) { out.lastStudied = remoteLast; out.streak = remote.streak || 0; }
    else if (localLast > remoteLast) { /* local already newer */ }
    else out.streak = Math.max(local.streak || 0, remote.streak || 0);

    /* With both devices' activity in hand the streak can be computed
       rather than picked, which is the only way it is right when work
       was split across two machines. */
    if (typeof Progress !== "undefined" && Object.keys(act).length) {
      out.streak = Progress.streakFrom(act);
      out.bestStreak = Math.max(out.bestStreak || 0, out.streak);
    }

    return out;
  },

  /* ---------- activity log ----------

     public.activity_log is the history; everything below only moves it.
     Three steps, in order, because each depends on the one before:
     drain anything queued, backfill work that predates the log, then
     read back the union of every device.

     None of it is allowed to break sync -- the graph is motivational,
     progress is the thing you cannot lose -- so failures here warn and
     leave the queue alone for the next attempt. */
  async syncLog() {
    if (!this.client || !this.user) return;
    try {
      await this.drainLog();
      await this.pullLog();                 // read BEFORE writing history
      if (await this.backfillLog()) await this.pullLog();
    } catch (err) {
      console.warn("[auth] activity log sync failed:", err.message);
    }
  },

  /* Send queued events. Only clears the queue on success, so a dropped
     connection costs nothing but a retry; the table's primary key makes
     a duplicated retry a no-op rather than a double count. */
  async drainLog() {
    const o = Progress.state.out || {};
    const keys = Object.keys(o);
    if (!keys.length) return;

    const rows = keys.map(k => ({
      user_id: this.user.id, kind: o[k].kind, ref: o[k].ref, done_on: o[k].on
    }));
    const { error } = await this.client.from("activity_log")
      .upsert(rows, { onConflict: "user_id,kind,ref", ignoreDuplicates: true });
    if (error) throw error;

    // Only drop the keys that were actually sent: a solve landing mid
    // flight belongs to the next drain, not this one's success.
    keys.forEach(k => { delete Progress.state.out[k]; });
    Progress.save();
  },

  /* Everything that happened before the log existed, in one pass.

     There are two kinds of it and they are not equally knowable:

     - The old per-day counters know WHEN but not WHAT. "3 problems on
       the 18th" cannot name the three, so those become three dated rows
       under a legacy ref. The count is exact, which is all the graph
       draws; the identity was never recorded.
     - Everything else knows WHAT but not WHEN, because the format
       before that stored a bare boolean. Those go in undated: counted,
       never drawn on a day nobody studied.

     Both halves are sized against what the server already has, not
     against local state, and that is the part that matters. The
     counters are still mirrored to progress.activity for devices that
     have not upgraded, so a second device arrives holding a counter for
     a day the log already recorded properly -- migrating it blind would
     file the same solve twice and show two problems on a day with one.
     Reading first means each day is migrated exactly once, by whichever
     device gets there first, and the rest simply find nothing to do.

     Idempotent by construction, so it needs no ran-once flag: after the
     first pass every day is accounted for and this builds an empty list
     and makes no request. Returns whether anything was written. */
  async backfillLog() {
    const have = (Progress.state.actDb && Progress.state.actDb.days) || {};
    const rows = [];

    const act = Progress.state.act || {};
    Object.keys(act).sort().forEach(day => {
      if (have[day]) return;                    // the log already covers it
      const v = act[day];
      const e = typeof v === "number" ? { p: v, d: 0 } : (v || {});
      for (let i = 0; i < (e.p || 0); i++)
        rows.push({ user_id: this.user.id, kind: "p", ref: `legacy:${day}#${i}`, done_on: day });
      for (let i = 0; i < (e.d || 0); i++)
        rows.push({ user_id: this.user.id, kind: "d", ref: `legacy:${day}#d${i}`, done_on: day });
    });

    /* The undated batch tops the log up to what is actually solved.
       Counting the shortfall against the server total -- dated, undated
       and the rows just queued above -- is what keeps it from
       overlapping the dated history rather than adding to it. */
    const u = (Progress.state.actDb && Progress.state.actDb.undated) || { p: 0, d: 0 };
    let onServer = { p: u.p || 0, d: u.d || 0 };
    Object.values(have).forEach(v => { onServer.p += v.p || 0; onServer.d += v.d || 0; });
    rows.forEach(r => { onServer[r.kind] += 1; });

    let solvedP = 0, solvedD = 0;
    Object.keys(Progress.state).forEach(k => {
      if (!Progress.state[k]) return;
      if (/^d\d+$/.test(k)) solvedD += 1;
      else if (/^p\d+_\d+$/.test(k)) solvedP += 1;
    });
    for (let i = 0; i < solvedP - onServer.p; i++)
      rows.push({ user_id: this.user.id, kind: "p", ref: `pre:p#${onServer.p + i}`, done_on: null });
    for (let i = 0; i < solvedD - onServer.d; i++)
      rows.push({ user_id: this.user.id, kind: "d", ref: `pre:d#${onServer.d + i}`, done_on: null });

    if (!rows.length) return false;
    // Chunked: a finished course is over a thousand rows and some
    // proxies balk at a payload that size.
    for (let i = 0; i < rows.length; i += 250) {
      const { error } = await this.client.from("activity_log")
        .upsert(rows.slice(i, i + 250), { onConflict: "user_id,kind,ref", ignoreDuplicates: true });
      if (error) throw error;
    }
    return true;
  },

  /* One call for the whole card: counts per day plus the undated total,
     aggregated server-side so the payload stays flat as history grows. */
  async pullLog() {
    const since = Progress.shiftDate(Progress.today(), -371);
    const { data, error } = await this.client.rpc("activity_summary", { since });
    if (error) throw error;
    Progress.state.actDb = {
      days:    (data && data.days)    || {},
      undated: (data && data.undated) || { p: 0, d: 0 }
    };
    /* The streak follows the log too, now that it is the record of
       what actually happened rather than one device's tally. */
    Progress.state.streak = Progress.streakFrom(Progress.state.actDb.days);
    Progress.state.bestStreak = Math.max(
      Progress.state.bestStreak || 0, Progress.state.streak);
    Progress.save();
  },

  _lt: null,
  queueLog() {
    if (!this.client || !this.user) return;
    clearTimeout(this._lt);
    this._lt = setTimeout(() => this.syncLog()
      .then(() => document.dispatchEvent(new CustomEvent("progress:synced"))), 1200);
  },

  async push() {
    if (!this.client || !this.user) return;
    const s = Progress.state;
    const days = {}, problems = {};
    Object.keys(s).forEach(k => {
      if (!s[k]) return;
      const d = k.match(/^d(\d+)$/);
      if (d) days[d[1]] = true;
      else if (/^p\d+_\d+$/.test(k)) problems[k] = true;
    });
    try {
      const { error } = await this.client.from("progress").upsert({
        user_id:      this.user.id,
        days, problems,
        streak:       s.streak || 0,
        best_streak:  s.bestStreak || 0,
        last_studied: s.lastStudied || null,
        xp:           typeof Points !== "undefined" ? Points.total() : 0
      }, { onConflict: "user_id" });
      if (error) throw error;
      this._pending = false;
      this.flag("synced");
    } catch (err) {
      console.warn("[auth] push failed:", err.message);
      this.flag("offline");
    }
  },

  /* Debounced so ticking ten problems is one network write, not ten.
     The debounce opens a window where closing the tab loses the last
     change, so anything pending is flushed when the page is hidden. */
  _t: null,
  _pending: false,
  queuePush() {
    if (!this.client || !this.user) return;
    this._pending = true;
    this.flag("saving");
    clearTimeout(this._t);
    this._t = setTimeout(() => this.push(), 900);
  },

  flush() {
    if (!this._pending || !this.client || !this.user) return;
    clearTimeout(this._t);
    // keepalive lets the request outlive the page; a normal fetch would
    // be cancelled the moment the tab closes.
    const s = Progress.state, days = {}, problems = {};
    Object.keys(s).forEach(k => {
      if (!s[k]) return;
      const d = k.match(/^d(\d+)$/);
      if (d) days[d[1]] = true; else if (/^p\d+_\d+$/.test(k)) problems[k] = true;
    });
    try {
      fetch(`${SUPABASE_CONFIG.url}/rest/v1/progress?on_conflict=user_id`, {
        method: "POST", keepalive: true,
        headers: {
          "apikey": SUPABASE_CONFIG.anonKey,
          "Authorization": `Bearer ${this._token()}`,
          "Content-Type": "application/json",
          "Prefer": "resolution=merge-duplicates"
        },
        body: JSON.stringify({
          user_id: this.user.id, days, problems,
          activity: s.act || {},
          streak: s.streak || 0, best_streak: s.bestStreak || 0,
          last_studied: s.lastStudied || null,
          xp: typeof Points !== "undefined" ? Points.total() : 0
        })
      });
      this._pending = false;
    } catch (e) { /* nothing more we can do as the page goes away */ }
  },

  /* The lab call has to carry a token that is actually still valid, so
     ask the client for the session -- it refreshes an expired one. The
     localStorage read below stays for the sync path, which is fired from
     pagehide where there is no time to await anything. */
  async token() {
    try {
      const { data } = await this.client.auth.getSession();
      if (data && data.session && data.session.access_token) return data.session.access_token;
    } catch (e) { /* fall through to the stored copy */ }
    return this._token();
  },

  _token() {
    try {
      const k = Object.keys(localStorage).find(x => x.startsWith("sb-") && x.endsWith("-auth-token"));
      return k ? (JSON.parse(localStorage.getItem(k)).access_token || "") : "";
    } catch { return ""; }
  },

  /* ---------- auth actions ----------
     Google only. No password to invent or reset, and no confirmation
     email — which matters because Supabase's built-in SMTP is rate
     limited to a handful of messages an hour. */
  async signIn() {
    return this.client.auth.signInWithOAuth({
      provider: "google",
      // Always return to the site root. Supabase only honours a redirect
      // that is on its allow-list, and location.pathname varies (/, 
      // /index.html, /day/13/) — asking for one stable URL means one
      // entry to configure. The gate restores the deep link afterwards.
      options: { redirectTo: Auth.siteRoot() }
    });
  },

  /* The site root, derived from the brand link so it works whether the
     page is at /, /day/13/ or /playground/. */
  siteRoot() {
    const b = document.querySelector(".brand");
    return b ? new URL(b.getAttribute("href"), location.href).href : location.origin + "/";
  },

  async signOut() {
    await this.client.auth.signOut();
    localStorage.removeItem("sql-daybyday-v1");
    if (typeof Content !== "undefined") Content.clear();   // lessons are not yours once you sign out   // do not leave one user's progress for the next
    location.href = this.siteRoot();
  },

  /* ---------- UI ---------- */
  flag(state) {
    const e = document.getElementById("syncflag");
    if (!e) return;
    e.dataset.state = state;
    e.textContent = state === "saving" ? "Saving…" : state === "offline" ? "Offline — saved locally" : "Synced";
  },

  paint() {
    const slot = document.getElementById("authslot");
    if (!slot) return;
    if (!this.client) {
      slot.innerHTML = `<span class="authnote" title="Add Supabase keys in assets/config.js to sync across devices">Local only</span>`;
      return;
    }
    if (this.user) {
      const name = this.user.user_metadata?.display_name || this.user.email.split("@")[0];
      slot.innerHTML =
        `<span id="syncflag" data-state="synced">Synced</span>
         <button class="btn" id="signout" type="button">${name} · Sign out</button>`;
      document.getElementById("signout").onclick = () => this.signOut();
    } else {
      slot.innerHTML = `<button class="btn gbtn" id="signin" type="button">${GOOGLE_MARK} Sign in</button>`;
      document.getElementById("signin").onclick = () => this.signIn();
    }
  }
};


/* Auth.init() is driven by Gate.run() so ordering is explicit. */
if (!document.body || document.body.dataset.page !== "landing") {
  document.addEventListener("DOMContentLoaded", () => Auth.init());

/* pagehide covers tab close, navigation and mobile backgrounding;
   visibilitychange catches app-switching on phones. */
addEventListener("pagehide", () => Auth.flush());
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") Auth.flush();
});
}

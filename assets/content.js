/* Fetching a lesson.

   The catalogue that ships with the page knows a day exists, what it is
   called and how many problems it has. It does not contain the lesson.
   That arrives from the database, and only for someone with an account.

   Cached in localStorage afterwards, so re-reading a day you have opened
   before costs nothing and works without a connection. The cache is
   keyed by day and cleared on sign-out along with everything else. */

const Content = {
  KEY: "sql-lesson-",

  cached(day) {
    try {
      const raw = localStorage.getItem(Content.KEY + day);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },

  async fetchDay(day) {
    const url = `${SUPABASE_CONFIG.url}/rest/v1/content`
              + `?day=eq.${encodeURIComponent(day)}&select=body,sol`;
    const res = await fetch(url, {
      headers: {
        "apikey": SUPABASE_CONFIG.anonKey,
        "Authorization": `Bearer ${await Auth.token()}`,
        "Accept": "application/json"
      }
    });
    if (!res.ok) {
      throw new Error(res.status === 401 || res.status === 403
        ? "Sign in to read this lesson."
        : `Could not load the lesson (${res.status}).`);
    }
    const rows = await res.json();
    if (!rows.length) throw new Error("That lesson is not in the database yet.");
    return rows[0];
  },

  /* Returns {body, sol}. Serves the cached copy immediately when there is
     one -- a lesson you have already read should not need the network. */
  async day(n) {
    const hit = Content.cached(n);
    if (hit) return hit;
    const row = await Content.fetchDay(n);
    try { localStorage.setItem(Content.KEY + n, JSON.stringify(row)); }
    catch (e) { /* storage full or blocked; fetching again is fine */ }
    return row;
  },

  /* Merges a fetched lesson into the catalogue entry and the solution
     map, so everything downstream reads the same shapes it always did
     and does not need to know the content arrived separately. */
  apply(n, row) {
    const day = DAYS.find(d => d.d === n);
    if (day) Object.assign(day, row.body);
    Object.assign(SOL, row.sol || {});
    return day;
  },

  clear() {
    Object.keys(localStorage)
      .filter(k => k.startsWith(Content.KEY))
      .forEach(k => localStorage.removeItem(k));
  }
};

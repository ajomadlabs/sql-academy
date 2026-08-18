/* Who sees what.

   Signed out  ->  the landing page
   Signed in   ->  the course

   Progress belongs to an account now, so there is no anonymous mode. But
   once you are in, everything still runs from localStorage and syncs in
   the background — losing connectivity mid-lesson must never lose a tick. */

const Gate = {
  show() {
    const app = document.getElementById("app");
    if (app) app.hidden = false;
    const lp = document.getElementById("landing");
    if (lp) lp.hidden = true;
  },

  async run() {
    // Local-only builds (no Supabase keys) skip the gate entirely, so the
    // site still works if someone clones it without a project.
    if (!window.SUPABASE_CONFIG || SUPABASE_CONFIG.url.includes("YOUR_")) {
      document.body.dataset.gate = "open";
      Gate.show();
      return true;
    }

    await Auth.init();

    if (Auth.user) {
      document.body.dataset.gate = "in";
      // the container ships hidden so a signed-out visitor never sees a
      // flash of the dashboard; nothing was revealing it again
      Gate.show();
      const back = sessionStorage.getItem("after-signin");
      if (back && back !== location.pathname) {
        sessionStorage.removeItem("after-signin");
        location.replace(back);
        return false;
      }
      sessionStorage.removeItem("after-signin");
      return true;
    }

    document.body.dataset.gate = "out";
    // routes stay hidden via CSS for signed-out visitors — they would
    // only bounce straight back here
    if (document.body.dataset.page === "landing") {
      Landing.mount();
    } else {
      // came in on a deep link — send them to the landing page, but
      // remember where they were headed
      sessionStorage.setItem("after-signin", location.pathname);
      location.replace(new URL("./", document.querySelector(".brand").href).href);
    }
    return false;
  }
};

const Landing = {
  mount() {
    const root = document.getElementById("landing");
    if (!root) return;
    root.hidden = false;
    const app = document.getElementById("app");
    if (app) app.hidden = true;

    root.querySelectorAll("[data-signin]").forEach(b =>
      b.addEventListener("click", e => {
        e.preventDefault();
        // keep whatever deep link brought them here
        if (!sessionStorage.getItem("after-signin") &&
            !location.pathname.endsWith("/sql-academy/") &&
            !location.pathname.endsWith("/index.html"))
          sessionStorage.setItem("after-signin", location.pathname);
        Auth.signIn();
      }));
  }
};

/* Landing page tier list, built from the same data the course uses so it
   can never advertise a curriculum that does not exist. */
Landing.tiers = function () {
  const box = document.getElementById("lp-tiers");
  if (!box || typeof TIERS === "undefined") return;
  box.innerHTML = TIERS.map(T => {
    const ds = DAYS.filter(d => d.mod === T.id);
    const probs = ds.reduce((n, d) => n + (d.np || 0), 0);
    return `<div class="lp-tier">
      <div class="lp-tier-h">
        <span class="tier-n">Module ${T.id}</span>
        <b>${T.name}</b>
        <span class="lp-tier-m">${ds.length} days &middot; ${probs} problems</span>
      </div>
      <p>${ds.map(d => d.title).slice(0, 3).join(" &middot; ")}${ds.length > 3 ? " &middot; …" : ""}</p>
    </div>`;
  }).join("");
};
const _mount = Landing.mount.bind(Landing);
Landing.mount = function () {
  _mount();
  Landing.tiers();
  const st = document.getElementById("lp-stats");
  if (st) {
    const probs = DAYS.reduce((n, d) => n + (d.np || 0), 0);
    st.textContent = `${DAYS.length} days \u00b7 ${probs} problems \u00b7 a real Postgres in your browser`;
  }
  document.querySelectorAll(".lp-go").forEach(b => {
    b.innerHTML = GOOGLE_MARK + " Continue with Google";
  });
};

/* The dashboard must not render before we know who is looking, otherwise
   a signed-out visitor sees a flash of someone else's leftover progress.

   A render failure used to leave a blank page with nothing in the console
   for the user, so failures now surface on the page itself. */
(async () => {
  const allowed = await Gate.run();
  if (!allowed) return;
  try {
    await new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "assets/dashboard.js?v=" + (window.__DASH_V || "1");
      s.onload = res;
      s.onerror = () => rej(new Error("dashboard.js failed to load"));
      document.body.appendChild(s);
    });
  } catch (err) {
    const app = document.getElementById("app");
    if (app) app.insertAdjacentHTML("afterbegin",
      `<div class="ide-err" style="margin:40px 0">Could not load the course. ` +
      `Try a hard refresh (Cmd/Ctrl + Shift + R). <br><small>${err.message}</small></div>`);
  }
})();

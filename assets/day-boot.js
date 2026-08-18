/* A day page cannot draw itself until it knows who is asking and has the
   lesson, and neither is true when the scripts finish loading. So the
   page renders nothing until the gate resolves and the content arrives,
   then loads day.js -- which finds the shapes it has always expected and
   does not need to know they came over the network. */
(async () => {
  const n = +document.body.dataset.day;
  const fail = (msg, detail) => {
    const b = document.getElementById("daybody");
    if (b) b.innerHTML = `<div class="ide-err" style="margin:32px 0">${msg}` +
      (detail ? `<br><small>${detail}</small>` : "") + `</div>`;
  };

  let allowed;
  try { allowed = await Gate.run(); }
  catch (e) { return fail("Could not check your sign-in.", e.message); }
  if (!allowed) return;                       // gate is redirecting

  try {
    const row = await Content.day(n);
    Content.apply(n, row);
  } catch (e) {
    return fail("This lesson could not be loaded.", e.message);
  }

  await new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = `../../assets/day.js?v=${window.__DAY_V || "1"}`;
    s.onload = res;
    s.onerror = () => rej(new Error("day.js failed to load"));
    document.body.appendChild(s);
  }).catch(e => fail("Could not load the page.", e.message));

  if (typeof window.onGateReady === "function") window.onGateReady();
})();

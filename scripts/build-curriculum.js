/* The lesson sources live in content/, which is not committed: this
   repository is public, and a course whose lessons sit in it is not
   gated by anything. The built output goes to the database instead.

   That makes content/ the one thing here without a backup in version
   control -- keep it somewhere safe, or a rebuild becomes an export from
   Supabase rather than a build. */
const fs=require('fs');
const m={};
// SOURCE is the original 35-day content; this script is the single
// place the module ordering is defined, so it must never read its
// own output or the mapping is applied twice.
const SOURCE = process.env.SRC || 'content/source-days.js';
new Function('g', fs.readFileSync(SOURCE,'utf8')+'\ng.DAYS=DAYS;g.SOL=SOL;')(m);
const n={};
new Function('g', fs.readFileSync('content/new-days.js','utf8')+'\ng.NEW_DAYS=NEW_DAYS;g.NEW_SOL=NEW_SOL;')(n);
const f={};
new Function('g', fs.readFileSync('content/module5.js','utf8')+'\ng.M5_DAYS=M5_DAYS;g.M5_SOL=M5_SOL;')(f);
n.NEW_DAYS = n.NEW_DAYS.concat(f.M5_DAYS);
Object.assign(n.NEW_SOL, f.M5_SOL);

const byId = {};
[...m.DAYS, ...n.NEW_DAYS].forEach(d => byId[d.d] = d);

// module -> class -> ordered old day ids
const PLAN = [
 {name:"Databases and SQL", classes:[
   {name:"Fundamentals",              days:[101]},
   {name:"Tables, data and control",  days:[8, 10, 11, 9, 102]}]},
 {name:"Querying data", classes:[
   {name:"Retrieval and aggregation", days:[1, 2, 5, 6, 12, 103]},
   {name:"Joins and subqueries",      days:[3, 4, 104, 7, 105, 14]}]},
 {name:"Advanced SQL", classes:[
   {name:"Window functions",          days:[106, 15, 16, 18, 19, 17, 22]},
   {name:"Views and CTEs",            days:[13, 20, 21]},
   {name:"Pivots and routines",       days:[107, 34]}]},
 {name:"Performance and modelling", classes:[
   {name:"How a query runs",          days:[23, 24, 25, 26]},
   {name:"Rewrites",                  days:[27, 28]},
   {name:"Data modelling",            days:[29, 30, 31]},
   {name:"Concurrency",               days:[32, 33, 35]}]},
 {name:"Interview problems", classes:[
   {name:"The project",                days:[201]},
   {name:"Warm-up",                    days:[202]},
   {name:"Medium",                     days:[203, 204]},
   {name:"Hard",                       days:[205, 206]}]},
];

const MODULES=[], OUT=[], SOL={};
const HUES=["var(--t0)","var(--t1)","var(--t2)","var(--t3)","var(--t4)"];
let day=0, dropped=[];
PLAN.forEach((M,mi)=>{
  const mod={id:mi+1, name:M.name, c:HUES[mi], classes:[]};
  M.classes.forEach((C,ci)=>{
    const cls={id:`${mi+1}.${ci+1}`, name:C.name, days:[]};
    C.days.forEach(oldId=>{
      const d=byId[oldId];
      if(!d){ dropped.push(oldId); return; }
      day++;
      const src = oldId>100 ? n.NEW_SOL : m.SOL;
      (d.practice||[]).forEach((_,i)=>{ const s=src[`p${oldId}_${i}`]; if(s) SOL[`p${day}_${i}`]=s; });
      const {t, ...rest} = d;   // drop the pre-restructure tier so nothing groups by it
      OUT.push(Object.assign({}, rest, {d:day, mod:mi+1, cls:cls.id}));
      cls.days.push(day);
    });
    mod.classes.push(cls);
  });
  MODULES.push(mod);
});

/* ---------- reclassify: practice vs rehearse ----------
   A practice problem is one you can open an editor and solve. Anything
   without reference SQL is a talking or study prompt and moves to the
   day's rehearse list, where it reads as a prompt instead of sitting in
   a problem list with no editor and no way to check it.

   The split is derived, not listed by hand, so it cannot drift as
   content changes. */
/* Deeper lessons, written module by module. Each entry replaces that
   day's concepts and references and adds a real-world scenario. Kept
   separate from the original source so what was rewritten, and what is
   still the first draft, stays obvious. */
const deep = {};
['m1', 'm2', 'm3', 'm4', 'm5'].forEach(mod => {
  const f = `content/lessons-${mod}.js`;
  if (!fs.existsSync(f)) return;
  const g = {};
  new Function('g', fs.readFileSync(f, 'utf8') + `\ng.OUT = ${mod.toUpperCase()};`)(g);
  Object.assign(deep, g.OUT);
});

const pt = {};
new Function('g', fs.readFileSync('content/curriculum-patch.js','utf8')+'\ng.CONVERT=CONVERT;g.ADD=ADD;g.NOGRADE=NOGRADE;g.SOLFIX=SOLFIX;g.EFFECT=EFFECT;g.HINT=HINT;g.SELFCONTAINED=SELFCONTAINED;g.EXPECT=EXPECT;g.REWORD=REWORD;g.REWORD_REHEARSE=REWORD_REHEARSE;g.XREF=XREF;')(pt);

// rewrite the problems that were phrased as "run this and explain"
const strip = s => String(s).replace(/<[^>]+>/g, '');
Object.entries(pt.CONVERT).forEach(([id, c]) => {
  const [, day, idx] = id.match(/^p(\d+)_(\d+)$/).map(Number);
  const d = OUT.find(x => x.d === day);
  if (!d) throw new Error(`patch ${id}: day ${day} not found`);
  const p = (d.practice || [])[idx];
  if (!p) throw new Error(`patch ${id}: problem ${idx} not found`);
  if (!strip(p.q).startsWith(strip(c.q0)))
    throw new Error(`patch ${id}: expected "${c.q0}" but found "${strip(p.q).slice(0,60)}"`);
  d.practice[idx] = { q: c.q, h: c.h };
  SOL[id] = { a: c.a, n: c.n };
});

Object.entries(pt.SOLFIX).forEach(([id, f]) => {
  const [, day, idx] = id.match(/^p(\d+)_(\d+)$/).map(Number);
  const d = OUT.find(x => x.d === day);
  const p = d && (d.practice || [])[idx];
  if (!p) throw new Error(`solfix ${id}: not found`);
  if (!strip(p.q).startsWith(strip(f.q0)))
    throw new Error(`solfix ${id}: expected "${f.q0}" but found "${strip(p.q).slice(0,60)}"`);
  SOL[id] = Object.assign({}, SOL[id], { a: f.a }, f.n ? { n: f.n } : {});
});

pt.NOGRADE.forEach(({id, q0}) => {
  const [, day, idx] = id.match(/^p(\d+)_(\d+)$/).map(Number);
  const d = OUT.find(x => x.d === day);
  const p = d && (d.practice || [])[idx];
  if (!p) throw new Error(`nograde ${id}: not found`);
  if (!strip(p.q).startsWith(strip(q0)))
    throw new Error(`nograde ${id}: expected "${q0}" but found "${strip(p.q).slice(0,60)}"`);
  if (!SOL[id]) throw new Error(`nograde ${id}: no solution`);
  SOL[id].nograde = true;
});

// new problems for the days left thin once the prompts moved out
Object.entries(pt.ADD).forEach(([day, spec]) => {
  const d = OUT.find(x => x.d === Number(day));
  if (!d) throw new Error(`add: day ${day} not found`);
  if (d.title !== spec.title)
    throw new Error(`add day ${day}: expected "${spec.title}" but found "${d.title}"`);
  spec.problems.forEach(pr => {
    const i = d.practice.length;
    d.practice.push({ q: pr.q, h: pr.h });
    SOL[`p${day}_${i}`] = { a: pr.a, n: pr.n };
  });
});

/* Split, renumber, and record where every id moved. Progress is stored
   against these ids, so a silent renumber would hand someone credit for
   problems they never solved -- the map lets the client migrate. */
const MIGRATION = {};
OUT.forEach(d => {
  const keep = [], rehearse = [], newSol = {};
  (d.practice || []).forEach((p, i) => {
    const id = `p${d.d}_${i}`, s = SOL[id];
    if (s && s.a) {
      const ni = keep.length;
      keep.push(p);
      newSol[`p${d.d}_${ni}`] = s;
      if (ni !== i) MIGRATION[id] = `p${d.d}_${ni}`;
    } else {
      rehearse.push(Object.assign({}, p, s && s.n ? { n: s.n } : {}));
      MIGRATION[id] = null;   // no longer a problem you can solve
    }
    delete SOL[id];
  });
  Object.assign(SOL, newSol);
  d.practice = keep;
  if (rehearse.length) d.rehearse = rehearse;
});

/* Apply the rewritten lessons before the cross-reference pass, so any
   day reference written into new prose is checked by the same guard. */
Object.entries(deep).forEach(([day, v]) => {
  const d = OUT.find(x => x.d === Number(day));
  if (!d) throw new Error(`deep lesson: day ${day} not found`);
  if (v.concepts) d.concepts = v.concepts;
  if (v.scenario) d.scenario = v.scenario;
  if (v.refs)     d.refs     = v.refs;
});
const deepened = Object.keys(deep).length;

/* Cross-day references, fixed over the whole body of a day. */
pt.XREF.forEach(({day, find, to}) => {
  const d = OUT.find(x => x.d === day);
  if (!d) throw new Error(`xref: day ${day} not found`);
  let hits = 0;
  const swap = t => {
    if (typeof t !== "string" || !t.includes(find)) return t;
    hits++; return t.split(find).join(to);
  };
  (d.concepts || []).forEach(c => { c.p = swap(c.p); c.h = swap(c.h); if (c.out) c.out = swap(c.out); });
  (d.gotchas  || []).forEach(g => { g.p = swap(g.p); g.t = swap(g.t); });
  (d.practice || []).forEach(x => { x.q = swap(x.q); x.h = swap(x.h); });
  (d.rehearse || []).forEach(x => { x.q = swap(x.q); x.h = swap(x.h); });
  d.why = swap(d.why); d.cp = swap(d.cp);
  if (!hits) throw new Error(`xref day ${day}: "${find}" not found`);
});

/* Rehearse prompts only exist after the split, so their rewording waits
   until here. Matched on the opening words for the same reason the other
   patches are: a reorder should fail the build, not patch the wrong one. */
Object.entries(pt.REWORD_REHEARSE).forEach(([day, items]) => {
  const d = OUT.find(x => x.d === Number(day));
  if (!d || !d.rehearse) throw new Error(`reword rehearse: day ${day} has none`);
  items.forEach(w => {
    const r = d.rehearse.find(x => strip(x.q).startsWith(strip(w.q0)));
    if (!r) throw new Error(`reword rehearse day ${day}: "${w.q0}" not found`);
    r.q = w.q;
  });
});

/* Effect checks are keyed by final problem ids, so they attach after the
   split has renumbered everything -- before it, p4_2 is a different
   problem entirely, which is what the assertion below is for. */
/* attach the effect checks (setup + verification query) */
Object.entries(pt.REWORD).forEach(([id, w]) => {
  const [, day, idx] = id.match(/^p(\d+)_(\d+)$/).map(Number);
  const d = OUT.find(x => x.d === day);
  const p = d && (d.practice || [])[idx];
  if (!p) throw new Error(`reword ${id}: not found`);
  if (!strip(p.q).startsWith(strip(w.q0)))
    throw new Error(`reword ${id}: expected "${w.q0}" but found "${strip(p.q).slice(0,60)}"`);
  p.q = w.q;
  if (w.h) p.h = w.h;
  // A reworded question often needs a different answer. Leaving the old
  // one in place is worse than not rewording at all: the question asks
  // for one thing and the check expects another.
  if (w.a) SOL[id] = Object.assign({}, SOL[id], { a: w.a });
  if (w.n) SOL[id] = Object.assign({}, SOL[id], { n: w.n });
});

Object.entries(pt.EXPECT).forEach(([id, e]) => {
  const [, day, idx] = id.match(/^p(\d+)_(\d+)$/).map(Number);
  const d = OUT.find(x => x.d === day);
  const p = d && (d.practice || [])[idx];
  if (!p) throw new Error(`expect ${id}: not found`);
  if (!strip(p.q).startsWith(strip(e.q0)))
    throw new Error(`expect ${id}: expected "${e.q0}" but found "${strip(p.q).slice(0,60)}"`);
  SOL[id] = Object.assign({}, SOL[id], { expect: e.code });
  delete SOL[id].nograde;          // it is graded now, on the error
});

Object.entries(pt.SELFCONTAINED).forEach(([id, f]) => {
  const [, day, idx] = id.match(/^p(\d+)_(\d+)$/).map(Number);
  const d = OUT.find(x => x.d === day);
  const p = d && (d.practice || [])[idx];
  if (!p) throw new Error(`selfcontained ${id}: not found`);
  if (!strip(p.q).startsWith(strip(f.q0)))
    throw new Error(`selfcontained ${id}: expected "${f.q0}" but found "${strip(p.q).slice(0,60)}"`);
  SOL[id] = Object.assign({}, SOL[id], { a: f.a });
});

Object.entries(pt.HINT).forEach(([id, hh]) => {
  const [, day, idx] = id.match(/^p(\d+)_(\d+)$/).map(Number);
  const d = OUT.find(x => x.d === day);
  const p = d && (d.practice || [])[idx];
  if (!p) throw new Error(`hint ${id}: not found`);
  if (!strip(p.q).startsWith(strip(hh.q0)))
    throw new Error(`hint ${id}: expected "${hh.q0}" but found "${strip(p.q).slice(0,60)}"`);
  p.h = hh.h;
});

Object.entries(pt.EFFECT).forEach(([id, e]) => {
  const [, day, idx] = id.match(/^p(\d+)_(\d+)$/).map(Number);
  const d = OUT.find(x => x.d === day);
  const p = d && (d.practice || [])[idx];
  if (!p) throw new Error(`effect ${id}: not found`);
  if (!strip(p.q).startsWith(strip(e.q0)))
    throw new Error(`effect ${id}: expected "${e.q0}" but found "${strip(p.q).slice(0,60)}"`);
  if (!SOL[id] || !SOL[id].a) throw new Error(`effect ${id}: no reference answer`);
  SOL[id] = Object.assign({}, SOL[id], { pre: e.pre, verify: e.verify });
});


/* Which problems are worth sending to the real database.

   Derived from the answer rather than listed by hand: if it reads a plan
   or builds an index, the exercise is about cost, and cost is exactly
   what fifty thousand in-browser rows cannot show you. Everything else
   stays local, where it is instant and can be graded. */
let labbed = 0;
OUT.forEach(d => {
  (d.practice || []).forEach((p, i) => {
    const a = (SOL[`p${d.d}_${i}`] || {}).a || "";
    const bare = a.replace(/--[^\n]*/g, "");
    // Two sessions at once exist only on the real database, so these
    // cannot fall back to the browser at all -- there is no dblink there.
    if (/\bdblink|lab_txn\.|lab\.open_session/i.test(bare)) {
      p.lab = true;
      p.labOnly = true;
      labbed++;
    } else if (/\bEXPLAIN\b/i.test(bare) || /\bCREATE\s+(UNIQUE\s+)?INDEX\b/i.test(bare)) {
      p.lab = true;
      labbed++;
    }
  });
});
const only = OUT.reduce((n,d)=>n+(d.practice||[]).filter(p=>p.labOnly).length,0);
console.log("offered on the remote database:", labbed, "problems |", only, "of them remote-only");

// days in the old set that no longer appear anywhere
const used=new Set(PLAN.flatMap(M=>M.classes.flatMap(c=>c.days)));
const unused=m.DAYS.map(d=>d.d).filter(id=>!used.has(id));

/* ---------- what ships publicly, and what does not ----------

   The landing page and the dashboard have to work before anyone signs
   in, so titles, counts and the module structure stay in a public file.
   The lessons themselves -- the explanations, the problems and every
   reference solution -- move to the database, where reading them
   requires an account.

   Splitting on counts rather than the arrays themselves is what keeps
   the public half at a few kilobytes: the dashboard needs to know a day
   has six problems, not what they are. */
const CATALOG = OUT.map(d => ({
  d: d.d, title: d.title, goal: d.goal, hrs: d.hrs, mod: d.mod, cls: d.cls,
  np: (d.practice || []).length,
  nr: (d.rehearse || []).length
}));

const CONTENT = OUT.map(d => {
  const sol = {};
  (d.practice || []).forEach((_, i) => {
    const k = `p${d.d}_${i}`;
    if (SOL[k]) sol[k] = SOL[k];
  });
  return {
    day: d.d,
    // Listed explicitly rather than spread, so nothing from the catalogue
    // leaks into the gated half by accident -- which does mean a new field
    // has to be added here or it silently never reaches the page.
    body: { why: d.why, concepts: d.concepts, gotchas: d.gotchas,
            scenario: d.scenario,
            practice: d.practice, rehearse: d.rehearse, refs: d.refs, cp: d.cp },
    sol
  };
});

const catalogJs =
"/* Public catalogue: enough to show what the course is and where you are,\n"+
"   and nothing you could learn from. Generated -- edit the plan in\n"+
"   scripts/ and regenerate. The lessons live in the database. */\n\n"+
"const MODULES = " + JSON.stringify(MODULES,null,1) + ";\n\n"+
"const TIERS = MODULES.map(m => ({id:m.id, name:m.name, c:m.c,\n"+
"  days:`Days ${Math.min(...m.classes.flatMap(c=>c.days))}\\u2013${Math.max(...m.classes.flatMap(c=>c.days))}`}));\n\n"+
"const DAYS = " + JSON.stringify(CATALOG) + ";\n\n"+
"/* Filled in per day once the lesson has been fetched. */\n"+
"const SOL = {};\n\n"+
"/* Problem ids shifted when talking prompts moved out of practice.\n"+
"   null means the id is no longer a solvable problem. */\n"+
"const PROBLEM_MIGRATION = " + JSON.stringify(MIGRATION) + ";\n";
fs.writeFileSync('assets/catalog.js', catalogJs);

/* The full set stays out of the published directory. It is what the
   verification harness and the upload script read, and it must not be
   fetchable from the site. */
fs.mkdirSync('build', {recursive: true});
const fullJs =
"const MODULES = " + JSON.stringify(MODULES,null,1) + ";\n"+
"const TIERS = MODULES.map(m => ({id:m.id, name:m.name, c:m.c}));\n"+
"const DAYS = " + JSON.stringify(OUT) + ";\n"+
"const SOL = " + JSON.stringify(SOL) + ";\n"+
"const PROBLEM_MIGRATION = " + JSON.stringify(MIGRATION) + ";\n";
fs.writeFileSync('build/data.js', fullJs);
fs.writeFileSync('build/content.json', JSON.stringify(CONTENT));

console.log("lessons rewritten in depth:", deepened, "of", OUT.length);
console.log("public catalogue:", Math.round(catalogJs.length/1024)+" KB | gated content:", Math.round(JSON.stringify(CONTENT).length/1024)+" KB");
console.log("modules:", MODULES.length, "| classes:", MODULES.reduce((a,x)=>a+x.classes.length,0), "| days:", OUT.length);
console.log("practice:", OUT.reduce((a,d)=>a+(d.practice||[]).length,0), "| solutions:", Object.keys(SOL).length,
            "| rehearse:", OUT.reduce((a,d)=>a+(d.rehearse||[]).length,0));
const effect = Object.values(SOL).filter(s => s.verify).length;
const expected = Object.values(SOL).filter(s => s.expect).length;
/* Mirrors Grader.gradeable: every statement a SELECT, however many. */
const single = Object.values(SOL).filter(s => {
  if (!s.a || s.verify || s.expect || s.nograde) return false;
  const parts = s.a.replace(/--[^\n]*/g, "").trim().split(";").map(x => x.trim()).filter(Boolean);
  return parts.length > 0 && parts.every(x => /^\s*(select|with)\b/i.test(x));
}).length;
console.log("checkable:", single + effect + expected,
            `(${single} by result, ${effect} by effect, ${expected} by expected error)`,
            "| eye-checked:", Object.keys(SOL).length - single - effect - expected);
const thin = OUT.filter(d=>(d.practice||[]).length < 4).map(d=>`${d.d}(${(d.practice||[]).length})`);
console.log("days with fewer than 4 problems:", thin.length?thin.join(" "):"none");
console.log("dropped (not found):", dropped.length?dropped:"none");
console.log("old days not placed:", unused.length?unused:"none");

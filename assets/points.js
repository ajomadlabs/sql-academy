/* XP and levels.

   Points only ever come from work that is actually hard: solving a
   problem, finishing a day, closing out a tier, holding a streak.
   Nothing is awarded for opening a page or spending time on the site,
   because that would reward the wrong behaviour — and she can already
   see straight through a number that goes up for doing nothing. */

const XP = {
  PROBLEM:  10,   // × 176 = 1,760
  DAY:      50,   // ×  35 = 1,750
  TIER:    150,   // ×   5 =   750
  STREAK7: 100    // every 7 consecutive days
};

/* Level names follow the curriculum, so the label itself tells you
   roughly how far in you are. */
const LEVELS = [
  { at:    0, name: "SELECT"    },
  { at:  400, name: "JOIN"      },
  { at:  900, name: "GROUP BY"  },
  { at: 1500, name: "SUBQUERY"  },
  { at: 2150, name: "WINDOW"    },
  { at: 2850, name: "CTE"       },
  { at: 3550, name: "INDEX"     },
  { at: 4250, name: "QUERY PLAN"},
  { at: 5000, name: "ARCHITECT" }
];

const Points = {
  /* Recomputed from state rather than incremented, so it is always
     consistent — no drift if an event is missed or replayed, and
     un-ticking something correctly takes the points back. */
  total() {
    let xp = 0;

    const problems = DAYS.reduce((n, d) =>
      n + Array.from({length: d.np || 0}, (_, i) => i)
            .filter(i => Progress.problemDone(`p${d.d}_${i}`)).length, 0);
    xp += problems * XP.PROBLEM;

    const days = Progress.daysDone();
    xp += days * XP.DAY;

    TIERS.forEach(T => {
      const ds = DAYS.filter(d => d.t === T.id);
      if (ds.length && ds.every(d => Progress.dayDone(d.d))) xp += XP.TIER;
    });

    xp += Math.floor((Progress.state.bestStreak || 0) / 7) * XP.STREAK7;

    return xp;
  },

  level(xp = this.total()) {
    let i = 0;
    for (let n = 0; n < LEVELS.length; n++) if (xp >= LEVELS[n].at) i = n;
    const cur  = LEVELS[i], next = LEVELS[i + 1] || null;
    return {
      index: i + 1,
      name: cur.name,
      xp,
      next,
      /* progress through the current level, 0–100 */
      pct: next ? Math.round((xp - cur.at) / (next.at - cur.at) * 100) : 100,
      toNext: next ? next.at - xp : 0
    };
  },

  /* What a single action is worth — used for the "+50 XP" in a toast. */
  forDay()     { return XP.DAY; },
  forProblem() { return XP.PROBLEM; }
};

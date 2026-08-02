// ── Time-based crowd heuristics per cafe (NUST schedule) ──
const CROWD_SCHEDULE = {
  '1': [ // C1 – Near NBS, busy at class breaks
    { start:7.5, end:9,   level:'moderate' },
    { start:9,   end:11,  level:'quiet'    },
    { start:12,  end:14,  level:'busy'     },
    { start:14,  end:16,  level:'moderate' },
    { start:16,  end:18,  level:'quiet'    },
  ],
  '2': [ // C2 – Near SEECS, night-owl crowd
    { start:9,   end:12,  level:'quiet'    },
    { start:12,  end:14,  level:'busy'     },
    { start:14,  end:18,  level:'moderate' },
    { start:18,  end:20,  level:'moderate' },
    { start:20,  end:23,  level:'busy'     },
  ],
  '3': [ // C3 – Central, steady all-day traffic
    { start:8,   end:10,  level:'moderate' },
    { start:10,  end:12,  level:'moderate' },
    { start:12,  end:14,  level:'busy'     },
    { start:14,  end:17,  level:'moderate' },
    { start:17,  end:19,  level:'quiet'    },
  ],
  '4': [ // Ratro – Near Liaquat Hostel, hostel crowd peaks at night
    { start:9,   end:12,  level:'quiet'    },
    { start:12,  end:14,  level:'moderate' },
    { start:14,  end:18,  level:'quiet'    },
    { start:18,  end:21,  level:'busy'     },
    { start:21,  end:24,  level:'moderate' },
  ],
};

const CROWD_EXPIRY_MS = 45 * 60 * 1000; // 45 minutes

function getCrowdLevel(cafeId) {
  const stored = localStorage.getItem('ce_crowd_' + cafeId);
  if (stored) {
    const r = JSON.parse(stored);
    const age = Date.now() - r.ts;
    if (age < CROWD_EXPIRY_MS) {
      return { level: r.level, source: 'user', ageMin: Math.floor(age / 60000) };
    }
    localStorage.removeItem('ce_crowd_' + cafeId);
  }

  const now = new Date();
  const day = now.getDay();
  if (day === 0 || day === 6) return { level: 'quiet', source: 'schedule' };

  const hour = now.getHours() + now.getMinutes() / 60;
  const slots = CROWD_SCHEDULE[cafeId] || [];
  for (const s of slots) {
    if (hour >= s.start && hour < s.end) return { level: s.level, source: 'schedule' };
  }
  return { level: 'quiet', source: 'schedule' };
}

function setCrowdReport(cafeId, level) {
  localStorage.setItem('ce_crowd_' + cafeId, JSON.stringify({ level, ts: Date.now() }));
}

// Returns crowd badge HTML for use in cards
function crowdBadgeHtml(cafeId) {
  const c = getCrowdLevel(cafeId);
  const label = { busy: 'Busy now', moderate: 'Moderate', quiet: 'Quiet now' }[c.level];
  const src   = c.source === 'user' ? `· ${c.ageMin}m ago` : '· Est.';
  return `<span class="crowd-badge crowd-${c.level}"><span class="crowd-dot"></span>${label} <span class="crowd-src">${src}</span></span>`;
}

window.getCrowdLevel  = getCrowdLevel;
window.setCrowdReport = setCrowdReport;
window.crowdBadgeHtml = crowdBadgeHtml;

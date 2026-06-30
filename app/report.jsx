/* ============================================================
   DASHDE — DASH-DE Assistant · Report Generation Mode (Part D)
   An overlay on top of the chat panel (D8): a scope-confirmation
   step (D3) then an expanded report modal (D4) with structured,
   analyst-grade prose, inline stat styling, and Copy/Word/PDF
   downloads (D6). Grounded in the same live Supabase rows the
   dashboard already holds (window.RECS); broader retrieval than a
   single chat answer (D7). Degrades to a fully data-driven
   deterministic report when the live model is unavailable, so the
   feature is demonstrable offline.
   ============================================================ */

const REPORT_PUBS = ['IMD WCY', 'IMD WDC', 'NRI', 'GARI', 'GAI'];
const PUB_FULL_FOR_SHORT = {
  'IMD WCY': 'IMD WCY', 'IMD WDC': 'IMD WDC', 'NRI': 'NRI',
  'GARI': 'Government AI Readiness Index', 'GAI': 'Global AI Index',
};
const PUB_LONGNAME = {
  'IMD WCY': 'IMD World Competitiveness Yearbook',
  'IMD WDC': 'IMD World Digital Competitiveness Ranking',
  'NRI': 'Network Readiness Index',
  'GARI': 'Government AI Readiness Index',
  'GAI': 'Tortoise Media Global AI Index',
};
const PUB_COLOR_FOR_SHORT = {
  'IMD WCY': '#0A6EA8', 'IMD WDC': '#1F7A4A', 'NRI': '#534AB7',
  'GARI': '#BE5A00', 'GAI': '#BE185D',
};

function rOrd(n) { return (window.ordinal ? window.ordinal(n) : 'th'); }
function ordStr(n) { return n == null ? '—' : n + rOrd(n); }

/* Per-publication config — mirrors the Overview tab's OV_PUBS so the report's headline
   ranks and top-tier pillars match exactly what the dashboard cards show. */
const REPORT_CFG = {
  'IMD WCY': { kind: 'series', pub: 'IMD WCY', indicator: 'Overall' },
  'IMD WDC': { kind: 'series', pub: 'IMD WDC', indicator: 'Overall' },
  'NRI': { kind: 'series', pub: 'NRI', indicator: 'Network Readiness Index' },
  'GAI': { kind: 'gai', pub: 'Global AI Index' },
  'GARI': { kind: 'gari', pub: 'Government AI Readiness Index' },
};

/* Top-tier pillars for an IMD/NRI publication at a year (rows whose sub === 'Overall',
   i.e. a pillar roll-up, not a leaf indicator) — same rule ovDiscoverPillars uses. */
function discoverTopPillars(pub, year, country) {
  const seen = [];
  for (const r of (window.RECS || [])) {
    if (r.p === pub && r.y === year && r.s === 'Overall' && (r.t === '' || r.t == null)
        && r.c === country && r.i !== 'Overall' && !seen.includes(r.i)) seen.push(r.i);
  }
  return seen;
}

function pubOverallSeries(short, country) {
  const c = REPORT_CFG[short];
  if (c.kind === 'gai') return (window.gaiOverallSeries ? window.gaiOverallSeries(country) : []).map(r => ({ year: r.y, rank: r.r, score: r.sc })).filter(o => o.rank != null);
  if (c.kind === 'gari') {
    const ys = (window.gariYears ? window.gariYears() : []).slice().sort((a, b) => a - b);
    return ys.map(y => { const r = window.gariOverallRow ? window.gariOverallRow(country, y) : null; return r ? { year: y, rank: r.rank, score: r.score } : null; }).filter(o => o && o.rank != null);
  }
  return (window.overallSeries ? window.overallSeries(c.pub, c.indicator, country) : []).filter(r => r.r != null).map(r => ({ year: r.y, rank: r.r, score: r.sc })).sort((a, b) => a.year - b.year);
}

function pubPillars(short, country, year, priorYear) {
  const c = REPORT_CFG[short];
  if (c.kind === 'gai') {
    return (window.gaiPillars ? window.gaiPillars() : []).map(p => {
      const cur = window.gaiPillarOverall ? window.gaiPillarOverall(p, country, year) : null;
      const pr = priorYear && window.gaiPillarOverall ? window.gaiPillarOverall(p, country, priorYear) : null;
      return cur && cur.r != null ? { name: p, rank: cur.r, score: cur.sc, priorRank: pr ? pr.r : null } : null;
    }).filter(Boolean);
  }
  if (c.kind === 'gari') {
    const era = year === 2025 ? '2025' : '2020-2024';
    // GARI's 2025 framework is not comparable to the 2020–2024 era — guard YoY deltas.
    const comparable = priorYear ? (era === '2025' ? priorYear === 2025 : (priorYear >= 2020 && priorYear <= 2024)) : false;
    return (window.gariPillars ? window.gariPillars(era) : []).map(p => {
      const cur = window.gariPillarOverall ? window.gariPillarOverall(p, country, year) : null;
      const pr = comparable && window.gariPillarOverall ? window.gariPillarOverall(p, country, priorYear) : null;
      return cur && cur.r != null ? { name: p, rank: cur.r, score: cur.sc, priorRank: pr ? pr.r : null } : null;
    }).filter(Boolean);
  }
  // IMD / NRI top-tier pillars
  const names = discoverTopPillars(c.pub, year, country);
  const prevNames = priorYear ? discoverTopPillars(c.pub, priorYear, country) : [];
  const comparable = priorYear && prevNames.length === names.length && names.every(n => prevNames.includes(n));
  return names.map(n => {
    const s = window.overallSeries ? window.overallSeries(c.pub, n, country) : [];
    const cur = s.find(r => r.y === year);
    const pr = comparable ? s.find(r => r.y === priorYear) : null;
    return cur && cur.r != null ? { name: n, rank: cur.r, score: cur.sc, priorRank: pr ? pr.r : null } : null;
  }).filter(Boolean);
}

/* ---------- Bounded retrieval for report mode (D7) ---------- */
/* For each requested publication: the country's overall rank/score across every
   available year (so a 5-year trend can be narrated, matching the Overview charts),
   plus the latest-year top-tier pillar breakdown with prior-year deltas. Headline
   ranks and pillars come from the same helpers the dashboard's own views use. */
function buildReportData(pubShorts, country) {
  const out = [];
  for (const short of pubShorts) {
    const c = REPORT_CFG[short];
    const longName = PUB_LONGNAME[short], color = PUB_COLOR_FOR_SHORT[short];
    if (!c) { out.push({ short, longName, color, missing: true }); continue; }
    const overall = pubOverallSeries(short, country);
    if (!overall.length) { out.push({ short, full: short, longName, color, missing: true }); continue; }
    const latestY = overall[overall.length - 1].year;
    const priorY = overall.length > 1 ? overall[overall.length - 2].year : null;
    const win = overall.slice(-5); // same 5-year window the Overview charts use
    const latest = overall.find(o => o.year === latestY) || null;
    const prior = priorY ? (overall.find(o => o.year === priorY) || null) : null;
    const pillars = pubPillars(short, country, latestY, priorY);
    out.push({ short, full: short, longName, color, years: overall.map(o => o.year),
      latestY, priorY, overall, win, latest, prior, pillars });
  }
  return out;
}

function scopeDescription(scope) {
  if (scope.mode === 'current') return scope.currentLabel || 'Current view';
  if (scope.mode === 'full') return 'Full dashboard — all publications';
  return scope.pubs.join(', ');
}
function scopeFileSlug(scope) {
  if (scope.mode === 'full') return 'Full_Dashboard';
  const list = scope.mode === 'current' ? scope.pubs : scope.pubs;
  return (list || []).join('_').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'Report';
}

/* ---------- Deterministic offline report (data-grounded fallback) ---------- */
/* Every numeric claim here is read directly from buildReportData — no narrative
   filler. Used when window.claude.complete is unavailable. Marker syntax mirrors
   what the model is asked to emit: [[up|2nd]] green, [[down|9th]] red, [[3rd]] neutral. */
function deterministicReport(data, scope, country) {
  const present = data.filter(d => !d.missing);
  const latestYear = Math.max(...present.map(d => d.latestY), 0) || (window.LATEST_YEAR || '');
  const pubList = present.map(d => d.short).join(' & ');
  const title = `${country}'s International Benchmark Position — ${latestYear} Summary`;
  const subtitle = `Drawing on ${present.map(d => `${d.short} ${d.latestY}`).join(', ')}`;

  const overviewBits = present.map(d => {
    if (!d.latest || d.latest.rank == null) return `In ${d.short}, a ${latestYear} overall ranking is not available in the dataset`;
    return `${ordStr(d.latest.rank)} in ${d.short} (${d.latestY})`;
  });
  const overview = `Across the ${present.length} ${present.length === 1 ? 'publication' : 'publications'} in this report, ${country} stands at ` +
    overviewBits.map(b => b).join('; ') + '. The sections below set out each in turn, with year-on-year movement and the multi-year pattern where the data supports it.';

  const sections = present.map(d => {
    const paras = [];
    if (!d.latest || d.latest.rank == null) {
      paras.push(`The dataset does not currently carry a ${d.latestY} overall ranking for ${country} in ${d.longName}, so a position statement is not possible for this publication.`);
    } else {
      let s = `In the ${d.longName} (${d.short}) ${d.latestY}, ${country} holds [[${ordStr(d.latest.rank)}]] overall`;
      if (d.prior && d.prior.rank != null) {
        const delta = d.prior.rank - d.latest.rank; // positive = improved (rank fell)
        if (delta > 0) s += `, an improvement of ${delta} ${delta === 1 ? 'place' : 'places'} from [[down|${ordStr(d.prior.rank)}]] in ${d.prior.year}`;
        else if (delta < 0) s += `, a decline of ${Math.abs(delta)} ${Math.abs(delta) === 1 ? 'place' : 'places'} from [[up|${ordStr(d.prior.rank)}]] in ${d.prior.year}`;
        else s += `, unchanged from ${d.prior.year}`;
      }
      s += '.';
      paras.push(s);

      if (d.win && d.win.length >= 3) {
        const first = d.win[0], last = d.win[d.win.length - 1];
        const span = last.year - first.year;
        const net = (first.rank != null && last.rank != null) ? first.rank - last.rank : null;
        const ranks = d.win.filter(w => w.rank != null).map(w => w.rank);
        const best = Math.min(...ranks), worst = Math.max(...ranks);
        let t = `Over the ${span + 1}-year window from ${first.year} to ${last.year}, ${country}'s position has `;
        if (net == null) t += 'moved within the available data';
        else if (net > 0) t += `improved by a net ${net} ${net === 1 ? 'place' : 'places'}`;
        else if (net < 0) t += `slipped by a net ${Math.abs(net)} ${Math.abs(net) === 1 ? 'place' : 'places'}`;
        else t += 'returned to where it began';
        t += best === worst ? '.' : `, ranging between [[${ordStr(best)}]] and [[${ordStr(worst)}]] across the period.`;
        paras.push(t);
      }

      if (d.pillars && d.pillars.length) {
        const ranked = d.pillars.filter(p => p.rank != null);
        if (ranked.length) {
          const strongest = ranked.reduce((a, b) => (b.rank < a.rank ? b : a));
          const weakest = ranked.reduce((a, b) => (b.rank > a.rank ? b : a));
          let p = `At pillar level in ${d.latestY}, ${country}'s strongest showing is in ${strongest.name} ([[${ordStr(strongest.rank)}]])`;
          if (weakest.name !== strongest.name) p += `, while ${weakest.name} ([[${ordStr(weakest.rank)}]]) is comparatively the lowest of the ${ranked.length} pillars assessed`;
          p += '.';
          // Note a notable mover if comparable prior data exists.
          const movers = ranked.filter(x => x.priorRank != null).map(x => ({ name: x.name, d: x.priorRank - x.rank }));
          if (movers.length) {
            const top = movers.reduce((a, b) => (Math.abs(b.d) > Math.abs(a.d) ? b : a));
            if (top.d !== 0) p += ` The largest pillar movement year-on-year is in ${top.name}, ${top.d > 0 ? 'up' : 'down'} ${Math.abs(top.d)} ${Math.abs(top.d) === 1 ? 'place' : 'places'}.`;
          }
          paras.push(p);
        }
      }
    }
    return { heading: `${d.longName} (${d.short})`, paragraphs: paras };
  });

  // Key takeaways — synthesised from the strongest reportable points.
  const takeaways = [];
  const withRank = present.filter(d => d.latest && d.latest.rank != null);
  const bestPub = withRank.length ? withRank.reduce((a, b) => (b.latest.rank < a.latest.rank ? b : a)) : null;
  if (bestPub) takeaways.push(`${country}'s highest placement in this report is [[${ordStr(bestPub.latest.rank)}]] in ${bestPub.short} (${bestPub.latestY}).`);
  const improvers = withRank.filter(d => d.prior && d.prior.rank != null && d.prior.rank > d.latest.rank);
  const decliners = withRank.filter(d => d.prior && d.prior.rank != null && d.prior.rank < d.latest.rank);
  if (improvers.length) takeaways.push(`Year-on-year gains are recorded in ${improvers.map(d => d.short).join(', ')}.`);
  if (decliners.length) takeaways.push(`Positions softened in ${decliners.map(d => d.short).join(', ')} relative to the prior year.`);
  if (!improvers.length && !decliners.length && withRank.length) takeaways.push('Positions are broadly stable year-on-year across the publications covered.');

  return { title, subtitle, overview, sections, takeaways,
    sourceNote: `This summary was generated from live data in the DASH-DE Supabase database as of ${reportDateStr()}. Figures should be verified against the original publications before any external use.`,
    generatedOffline: true };
}

function reportDateStr() {
  const d = new Date();
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}
function reportDateSlug() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* ---------- Model-backed report (D5 quality requirements) ---------- */
const REPORT_SYSTEM = [
  'You are the DASH-DE Assistant operating in REPORT mode. You write a properly-structured, analyst-grade',
  'narrative summary of international competitiveness ranking data for a Singapore government audience —',
  'suitable to drop into a briefing note. This is a document, not a chat reply.',
  '',
  'Publications: IMD WCY (World Competitiveness Yearbook), IMD WDC (World Digital Competitiveness),',
  'NRI (Network Readiness Index), GAI (Tortoise Global AI Index), GARI (Government AI Readiness Index).',
  'Ranks are positions where LOWER = BETTER.',
  '',
  'GROUNDING (strict): use ONLY values in the DATA block. Every numeric claim must trace to a value there.',
  'Do NOT characterise a trend or pattern (e.g. "a gradual softening") unless the multi-year values actually',
  'support it. No outside knowledge. If a value is absent, say so plainly rather than inventing it.',
  '',
  'WRITING QUALITY: full sentences and paragraphs throughout. No sentence fragments. Bullets are allowed',
  'ONLY in the Key Takeaways list — never as a substitute for prose elsewhere. Professional register, like a',
  'policy analyst, not conversational. Length scales with scope: roughly one solid paragraph per publication,',
  'plus the overview and takeaways — do not pad a single-publication report, do not reduce a full-dashboard',
  'report to one sentence per publication.',
  '',
  'INLINE STATS: wrap every rank or rank-change figure in markers so the renderer can colour them:',
  '  [[up|2nd]]  for a figure tied to an IMPROVEMENT (green), [[down|9th]] for a DECLINE (red),',
  '  [[3rd]]     for a neutral current standing (blue). Use the up/down form on the prior-year figure',
  '  when describing a change (e.g. "an improvement of one place from [[down|2nd]] in 2025").',
  '',
  'OUTPUT: return ONLY valid minified JSON, no markdown fences, of this exact shape:',
  '{"title":string,"subtitle":string,"overview":string,"sections":[{"heading":string,"paragraphs":[string,...]}],',
  '"takeaways":[string,...],"sourceNote":string}',
  'Title must name the scope and the latest year covered. Subtitle states which publications/years it draws from.',
  'sourceNote must state the data is live Supabase data as of generation and should be checked against originals.',
].join('\n');

async function generateReport(scope, country) {
  const pubs = scope.pubs && scope.pubs.length ? scope.pubs : REPORT_PUBS;
  const data = buildReportData(pubs, country);
  if (window.claude && window.claude.complete) {
    try {
      const payload = { scope: scopeDescription(scope), country, generatedDate: reportDateStr(), publications: data };
      const prompt = REPORT_SYSTEM + '\n\nDATA (JSON):\n' + JSON.stringify(payload) + '\n\nWrite the report now as JSON only.';
      const raw = await window.claude.complete({ messages: [{ role: 'user', content: prompt }] });
      const parsed = parseReportJSON(raw);
      if (parsed) return parsed;
    } catch (e) { /* fall through to deterministic */ }
  }
  return deterministicReport(data, scope, country);
}

function parseReportJSON(raw) {
  if (!raw) return null;
  let s = String(raw).trim();
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a < 0 || b < 0) return null;
  try {
    const o = JSON.parse(s.slice(a, b + 1));
    if (!o.title || !Array.isArray(o.sections)) return null;
    o.overview = o.overview || '';
    o.takeaways = Array.isArray(o.takeaways) ? o.takeaways : [];
    o.sourceNote = o.sourceNote || `Generated from live DASH-DE Supabase data as of ${reportDateStr()}. Verify against original publications before external use.`;
    return o;
  } catch (e) { return null; }
}

/* ---------- Stat-marker rendering (shared visual convention) ---------- */
/* React nodes for the on-screen modal. */
function renderStatNodes(text, keyp) {
  const parts = [];
  const re = /\[\[(?:(up|down)\|)?(.+?)\]\]/g;
  let m, last = 0, i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const dir = m[1] || '';
    parts.push(<span key={keyp + '_' + (i++)} className={'rep-stat' + (dir ? ' ' + dir : '')}>{m[2]}</span>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : [text];
}
/* Inline-styled HTML for Word/PDF (preserves bold + colour, D6). */
function statsToHTML(text) {
  return String(text).replace(/\[\[(?:(up|down)\|)?(.+?)\]\]/g, (full, dir, inner) => {
    const color = dir === 'up' ? '#1F7A4A' : dir === 'down' ? '#B42318' : '#0C447C';
    return `<b style="color:${color}">${escapeHTML(inner)}</b>`;
  });
}
/* Plain-text equivalent (Copy text, D6). */
function statsToPlain(text) { return String(text).replace(/\[\[(?:(?:up|down)\|)?(.+?)\]\]/g, '$1'); }
function escapeHTML(s) { return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

Object.assign(window, {
  buildReportData, deterministicReport, generateReport, scopeDescription, scopeFileSlug,
  renderStatNodes, statsToHTML, statsToPlain, reportDateStr, reportDateSlug, REPORT_PUBS, ordStr, escapeHTML,
});

/* ============================================================
   DASHDE — data layer + config
   Reads all rows live from the Supabase `international_benchmarks`
   table (via window.sb). The bundled dataset in window.DASHDE is
   used as a fallback when the live table is empty or unreachable,
   and supplies the static country→ISO flag map either way.
   ============================================================ */
let RECS = [];
let DEFS = {};
let ISO  = {};
let LAST_UPDATED = null; // Date of MAX(created_at) from international_benchmarks
let LAST_UPDATED_RAW = null; // raw created_at string, formatted in Asia/Singapore for display
let LATEST_YEAR = null;  // MAX(year) across loaded rows — data-vintage fallback when no created_at column exists
/* dataSource: 'supabase' (live rows) | 'seed-empty' (table empty) |
   'seed-offline' (read failed) | 'seed-noclient' (client missing) */
let DATA_SOURCE = { source: 'seed-noclient', count: 0, error: null };

const PUB_COLOR = {
  'IMD WCY': '#0A6EA8',
  'IMD WDC': '#1F7A4A',
  'NRI': '#0E7490',
  'Government AI Readiness Index': '#B45309',
  'Global AI Index': '#BE185D',
};
const PUB_FULL = {
  'IMD WCY': 'IMD World Competitiveness Yearbook',
  'IMD WDC': 'IMD World Digital Competitiveness Ranking',
  'NRI': 'Portulans Institute Network Readiness Index',
  'Government AI Readiness Index': 'Government AI Readiness Index',
  'Global AI Index': 'Tortoise Media Global AI Index',
};
const PUB_SHORT = { 'IMD WCY': 'IMD WCY', 'IMD WDC': 'IMD WDC', 'NRI': 'NRI', 'Government AI Readiness Index': 'GARI', 'Global AI Index': 'GAI' };
const PUB_URL = {
  'IMD WCY': 'https://www.imd.org/centers/wcc/world-competitiveness-center/rankings/world-competitiveness-ranking/',
  'IMD WDC': 'https://www.imd.org/centers/wcc/world-competitiveness-center/rankings/world-digital-competitiveness-ranking/',
  'NRI': 'https://networkreadinessindex.org/',
  'Government AI Readiness Index': 'https://oxfordinsights.com/ai-readiness/ai-readiness-index/',
  'Global AI Index': 'https://www.tortoisemedia.com/data/global-ai',
};

const NRI_PILLARS = ['Technology', 'People', 'Governance', 'Impact'];

const PILLARS = {
  'Digital Economy': [
    { id: 'tech-infra', tab: 'Tech Infrastructure', pub: 'IMD WCY', indicator: 'Technological Infrastructure', layout: 'flat' },
    { id: 'knowledge',  tab: 'Knowledge',           pub: 'IMD WDC', indicator: 'Knowledge',                     layout: 'grouped' },
    { id: 'technology', tab: 'Technology',          pub: 'IMD WDC', indicator: 'Technology',                    layout: 'grouped' },
    { id: 'future',     tab: 'Future Readiness',    pub: 'IMD WDC', indicator: 'Future readiness',              layout: 'grouped' },
    { id: 'nri',        tab: 'Network Readiness Index', pub: 'NRI', indicator: 'Network Readiness Index',       layout: 'nri' },
  ],
  'AI': [
    { id: 'gai', tab: 'Global AI Index', pub: 'Global AI Index', indicator: 'Overall', layout: 'gai' },
  ],
};

/* ---------- indices (rebuilt whenever RECS changes) ---------- */
const _idx = { overall: new Map(), byYear: new Map(), tableRows: new Map(), subSeries: new Map(), compare: new Map() };
function rebuildIndices() {
  _idx.overall.clear(); _idx.byYear.clear(); _idx.tableRows.clear(); _idx.subSeries.clear(); _idx.compare.clear();
  for (const r of RECS) {
    if (r.s === 'Overall' && r.t === '') {
      const k = `${r.p}|${r.i}|${r.c}`;
      (_idx.overall.get(k) || _idx.overall.set(k, []).get(k)).push(r);
      const k2 = `${r.p}|${r.i}|${r.y}`;
      (_idx.byYear.get(k2) || _idx.byYear.set(k2, []).get(k2)).push(r);
    }
    const k3 = `${r.p}|${r.i}|${r.c}|${r.y}`;
    (_idx.tableRows.get(k3) || _idx.tableRows.set(k3, []).get(k3)).push(r);
    const k4 = `${r.p}|${r.i}|${r.c}|${r.s}|${r.t}`;
    (_idx.subSeries.get(k4) || _idx.subSeries.set(k4, []).get(k4)).push(r);
    // compare index: all countries for a given indicator/year/sub/third (for top-N bar charts)
    const k5 = `${r.p}|${r.i}|${r.y}|${r.s}|${r.t}`;
    (_idx.compare.get(k5) || _idx.compare.set(k5, []).get(k5)).push(r);
  }
  for (const arr of _idx.overall.values()) arr.sort((a, b) => a.y - b.y);
  for (const arr of _idx.byYear.values()) arr.sort((a, b) => (a.r ?? 1e9) - (b.r ?? 1e9));
  for (const arr of _idx.subSeries.values()) arr.sort((a, b) => a.y - b.y);
  for (const arr of _idx.compare.values()) arr.sort((a, b) => (a.r ?? 1e9) - (b.r ?? 1e9));
}

/* Top-N country comparison for any indicator/sub/third at a given year (rank ascending).
   Pass limit = null (or Infinity) to return ALL ranked countries — equivalent to the
   un-limited Supabase query, since RECS already holds the full international_benchmarks table. */
function compareTop(pub, indicator, year, sub, third, limit = 10) {
  const arr = _idx.compare.get(`${pub}|${indicator}|${year}|${sub == null ? '' : sub}|${third == null ? '' : third}`) || [];
  const ranked = arr.filter(r => r.r != null);
  const out = (limit == null || !isFinite(limit)) ? ranked : ranked.slice(0, limit);
  return out.map(r => ({ country: r.c, rank: r.r, score: r.sc }));
}

/* Window of `size` countries centred on `focus` (default Singapore) for any
   indicator/sub/third at a given year, ordered by rank ascending. Mirrors the
   spec's "Singapore" view: 5 above + 5 below, padding above OR below to always
   reach exactly `size` total. No floor cap at rank 1 — the slice clamps only at
   the natural bounds of the ranked list. */
function compareWindow(pub, indicator, year, sub, third, focus = 'Singapore', size = 10) {
  const all = compareTop(pub, indicator, year, sub, third, null); // every ranked country, asc
  if (all.length <= size) return all;
  const idx = all.findIndex(r => r.country === focus);
  if (idx < 0) return all.slice(0, size);
  let start = idx - Math.floor(size / 2); // 5 above when size=10
  let end = start + size;
  if (start < 0) { start = 0; end = size; }
  if (end > all.length) { end = all.length; start = end - size; }
  return all.slice(start, end);
}

/* Sub-pillar rank matrix for an NRI pillar: one row per country, one column per
   sub-pillar group, each cell = that country's rank in the sub-pillar.
   mode 'all'  → every country with pillar data, ordered by overall pillar rank.
   mode 'sg'   → 10 countries centred on Singapore's overall pillar rank. */
function nriSubPillarMatrix(pillar, year, mode = 'all') {
  const subs = nriSubPillars(pillar, year); // ordered column groups
  const base = mode === 'sg'
    ? compareWindow('NRI', pillar, year, 'Overall', '', 'Singapore')
    : compareTop('NRI', pillar, year, 'Overall', '', null);
  const rows = base.map(c => {
    const cells = subs.map(sub => {
      const arr = _idx.subSeries.get(`NRI|${pillar}|${c.country}|${sub}|`) || [];
      const rec = arr.find(r => r.y === year) || null;
      return { sub, rank: rec ? rec.r : null, score: rec ? rec.sc : null };
    });
    return { country: c.country, overallRank: c.rank, isMe: c.country === 'Singapore', cells };
  });
  return { subs, rows };
}

/* ---------- live Supabase loader ---------- */
// Map a Supabase row (full schema) into the compact internal record shape.
function mapLiveRow(r) {
  return {
    y: Number(r.year),
    p: r.publication,
    i: r.indicator,
    s: r.sub_indicator == null ? '' : r.sub_indicator,
    t: r.third_tier_indicator == null ? '' : r.third_tier_indicator,
    c: r.country,
    r: r.rank == null ? null : Number(r.rank),
    sc: r.score == null ? null : Number(r.score),
  };
}
function buildDefsFromLive(rows) {
  const defs = {};
  for (const r of rows) {
    if (!r.definition) continue;
    const sub = r.sub_indicator == null ? '' : r.sub_indicator;
    const third = r.third_tier_indicator == null ? '' : r.third_tier_indicator;
    const k = `${r.publication}||${r.indicator}||${sub}||${third}`;
    if (!defs[k]) defs[k] = { d: r.definition, u: '' };
  }
  return defs;
}
// Fetch every row from international_benchmarks, paginating past the 1000-row cap.
async function fetchAllBenchmarks() {
  if (!window.sb) return null;
  const PAGE = 1000;
  const all = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await window.sb
      .from('international_benchmarks')
      .select('*')
      .order('year', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || !data.length) break;
    all.push(...data);
    if (data.length < PAGE) break;
  }
  return all;
}
// Authoritative "last updated" = MAX(created_at) of the international_benchmarks
// table, fetched with the exact spec query (NOT new Date() / release year).
async function fetchLastUpdated() {
  if (!window.sb) { console.log('[DASHDE] last-updated: no Supabase client'); return null; }
  try {
    const { data, error } = await window.sb
      .from('international_benchmarks')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    console.log('[DASHDE] Last updated query result:', { data, error });
    if (error) {
      // Expected on the current live schema (no created_at column) — warn, don't error.
      console.warn('[DASHDE] Last updated unavailable:', error.message || error, '— falling back to dataset year');
      throw error;
    }
    if (data && data.created_at) {
      console.log('[DASHDE] Raw timestamp:', data.created_at);
      LAST_UPDATED_RAW = data.created_at;
      const t = Date.parse(data.created_at);
      if (!isNaN(t)) {
        console.log('[DASHDE] Date object UTC ISO:', new Date(t).toISOString());
        console.log('[DASHDE] Formatted SGT date:', formatLastUpdated(data.created_at));
        return new Date(t);
      }
      console.warn('[DASHDE] created_at present but unparseable:', data.created_at);
    } else {
      console.warn('[DASHDE] created_at is null/absent on newest row — column likely unpopulated');
    }
  } catch (e) {
    console.warn('[DASHDE] last-updated query failed:', e.message || e);
  }
  return null;
}
// Boot-time load: prefer live Supabase data, fall back to the bundled seed.
async function loadData() {
  const seed = window.DASHDE || { recs: [], defs: {}, iso: {} };
  ISO = seed.iso || {}; // static lookup — same either way
  let live = null, err = null;
  try {
    live = await fetchAllBenchmarks();
  } catch (e) {
    err = e;
    console.warn('[DASHDE] Supabase read failed, using bundled seed:', e.message || e);
  }
  if (live && live.length) {
    RECS = live.map(mapLiveRow);
    DEFS = buildDefsFromLive(live);
    // MAX(created_at) — data recency, not page-load time (spec)
    let maxTs = 0;
    for (const r of live) { const t = r.created_at ? Date.parse(r.created_at) : NaN; if (!isNaN(t) && t > maxTs) maxTs = t; }
    LAST_UPDATED = maxTs ? new Date(maxTs) : null;
    // Data-vintage fallback: newest year present (used when the table carries no created_at column).
    let maxYr = 0;
    for (const r of live) { const y = +r.year; if (!isNaN(y) && y > maxYr) maxYr = y; }
    LATEST_YEAR = maxYr || null;
    DATA_SOURCE = { source: 'supabase', count: RECS.length, error: null };
  } else {
    RECS = seed.recs || [];
    DEFS = seed.defs || {};
    DATA_SOURCE = {
      source: err ? 'seed-offline' : (window.sb ? 'seed-empty' : 'seed-noclient'),
      count: RECS.length,
      error: err ? (err.message || String(err)) : null,
    };
  }
  // Authoritative last-updated date via the dedicated spec query (overrides the
  // row-scan estimate when available; works even on the bundled seed fallback).
  try { const ts = await fetchLastUpdated(); if (ts) LAST_UPDATED = ts; } catch (e) {}
  rebuildIndices();
  // refresh window globals consumed by other (separately-scoped) babel modules
  Object.assign(window, { RECS, DEFS, ISO, DATA_SOURCE, LAST_UPDATED, LAST_UPDATED_RAW, LATEST_YEAR });
  return DATA_SOURCE;
}

/* Format a raw created_at timestamp as a DD MMM YYYY date AS IT APPEARS in
   Singapore (Asia/Singapore), anchoring component extraction to that timezone so
   timestamps near the UTC midnight boundary don't show the previous/next calendar
   day. JS Date always stores UTC ms internally; Intl renders it in the target zone. */
function formatLastUpdated(rawTimestamp) {
  if (!rawTimestamp) return '—';
  const date = new Date(rawTimestamp);
  if (isNaN(date)) return '—';
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Singapore',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  return formatter.format(date);
}

/* "Last updated: DD MMM YYYY" rendered in Asia/Singapore time from MAX(created_at).
   When the table has no created_at column (the live schema currently lacks one),
   fall back to the dataset's latest year so the footer shows real vintage rather
   than a bare dash. */
function lastUpdatedStr() {
  if (LAST_UPDATED_RAW || (LAST_UPDATED instanceof Date && !isNaN(LAST_UPDATED))) {
    return `Last updated: ${formatLastUpdated(LAST_UPDATED_RAW || LAST_UPDATED)}`;
  }
  if (LATEST_YEAR) return `Last updated: ${LATEST_YEAR} dataset`;
  return 'Last updated: —';
}

/* Render children straight into <body> — used for fixed-position tooltips and
   slide-out panels so they escape the scaled 16:9 canvas (a CSS transform would
   otherwise become their containing block and break viewport coordinates). */
function BodyPortal({ children }) {
  return ReactDOM.createPortal(children, document.body);
}

/* ---------- helpers ---------- */
function ordinal(n) {
  if (n == null) return '—';
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return (s[(v - 20) % 10] || s[v] || s[0]);
}
function flagUrl(country) { const c = ISO[country]; return c ? `https://flagcdn.com/${c}.svg` : null; }
function fmtScore(v) {
  if (v == null) return '—';
  const a = Math.abs(v);
  if (a >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (a >= 1e4) return Math.round(v / 1e3) + 'K';
  if (Number.isInteger(v)) return String(v);
  return (Math.round(v * 100) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 });
}
function defOf(pub, indicator, sub, third) {
  const d = DEFS[`${pub}||${indicator}||${sub}||${third}`];
  return d ? d.d : '';
}

/* overall series for a pillar+country, sorted ascending year */
function overallSeries(pub, indicator, country) {
  return (_idx.overall.get(`${pub}|${indicator}|${country}`) || []);
}
/* years available for a pillar */
function yearsFor(pillar) {
  if (pillar.layout === 'gai') return gaiYears();
  const ind = pillar.layout === 'nri' ? 'Network Readiness Index' : pillar.indicator;
  const set = new Set();
  for (const r of RECS) if (r.p === pillar.pub && r.i === ind && r.s === 'Overall') set.add(r.y);
  return [...set].sort((a, b) => b - a);
}
/* countries ranked for a pillar+year */
function countriesFor(pillar, year) {
  if (pillar.layout === 'gai') return gaiOverallRanking(year);
  const ind = pillar.layout === 'nri' ? 'Network Readiness Index' : pillar.indicator;
  return (_idx.byYear.get(`${pillar.pub}|${ind}|${year}`) || []).map(r => ({ country: r.c, rank: r.r }));
}
function overallRow(pillar, country, year) {
  const ind = pillar.layout === 'nri' ? 'Network Readiness Index' : pillar.indicator;
  return overallSeries(pillar.pub, ind, country).find(r => r.y === year) || null;
}

/* ---------- the data hook (mirrors spec's useIndicatorData) ---------- */
function useIndicatorData(pillar, country, year) {
  const [state, setState] = React.useState({ loading: true, error: null, data: null });
  React.useEffect(() => {
    if (!pillar) { setState({ loading: false, error: null, data: null }); return; }
    let alive = true;
    setState(s => ({ ...s, loading: true }));
    // simulate async fetch + skeleton (150ms per spec)
    const t = setTimeout(() => {
      if (!alive) return;
      try {
        const ind = pillar.layout === 'nri' ? 'Network Readiness Index' : pillar.indicator;
        const series = overallSeries(pillar.pub, ind, country);
        const cur = series.find(r => r.y === year) || null;
        const prev = series.find(r => r.y === year - 1) || null;
        const recent5 = series.filter(r => r.y <= year).slice(-5);
        const table = buildTableModel(pillar, country, year);
        const countries = countriesFor(pillar, year);
        const compare = countries.slice(0, 10);
        setState({ loading: false, error: null, data: { cur, prev, recent5, series, table, countries, compare } });
      } catch (e) {
        setState({ loading: false, error: e.message || 'error', data: null });
      }
    }, 160);
    return () => { alive = false; clearTimeout(t); };
  }, [pillar && pillar.id, country, year]);
  return state;
}

/* ---------- table model builders ---------- */
function yoy(curScore, prevScore) {
  if (curScore == null || prevScore == null) return null;
  return Math.round((curScore - prevScore) * 1000) / 1000;
}
function makeRow(opts) {
  // opts: {kind, label, pub, indicator, sub, third, country, year, depth, hasDef}
  const { pub, indicator, sub, third, country, year } = opts;
  const series = _idx.subSeries.get(`${pub}|${indicator}|${country}|${sub}|${third}`) || [];
  const cur = series.find(r => r.y === year) || null;
  const prev = series.find(r => r.y === year - 1) || null;
  const def = defOf(pub, indicator, sub, third);
  return {
    kind: opts.kind,            // 'overall' | 'group' | 'pillar' | 'leaf'
    label: opts.label,
    depth: opts.depth || 0,
    rank: cur ? cur.r : null,
    prevRank: prev ? prev.r : null,
    rankDelta: (cur && prev && cur.r != null && prev.r != null) ? (prev.r - cur.r) : null,
    score: cur ? cur.sc : null,
    prevScore: prev ? prev.sc : null,
    delta: cur && prev ? yoy(cur.sc, prev.sc) : null,
    def, pub, indicator, sub, third, series,
    hasDef: opts.kind === 'leaf' && !!def,
    canPopup: opts.kind !== 'pillar' && cur != null,
  };
}

function buildTableModel(pillar, country, year) {
  const rows = [];
  const all = _idx.tableRows.get(`${pillar.pub}|${pillar.indicator}|${country}|${year}`) || [];

  if (pillar.layout === 'flat') {
    rows.push(makeRow({ kind: 'overall', label: 'Overall', pub: pillar.pub, indicator: pillar.indicator, sub: 'Overall', third: '', country, year }));
    const leaves = all.filter(r => r.s !== 'Overall');
    for (const r of leaves) rows.push(makeRow({ kind: 'leaf', label: r.s, pub: pillar.pub, indicator: pillar.indicator, sub: r.s, third: '', country, year, depth: 0 }));
    return rows;
  }

  if (pillar.layout === 'grouped') {
    rows.push(makeRow({ kind: 'overall', label: 'Overall', pub: pillar.pub, indicator: pillar.indicator, sub: 'Overall', third: '', country, year }));
    const groups = [...new Set(all.filter(r => r.s !== 'Overall').map(r => r.s))];
    for (const g of groups) {
      rows.push({ kind: 'header', label: g, depth: 0 });
      const grp = all.filter(r => r.s === g);
      const gOverall = grp.find(r => /^overall\s*-/i.test(r.t));
      if (gOverall) rows.push(makeRow({ kind: 'group', label: 'Overall – ' + g, pub: pillar.pub, indicator: pillar.indicator, sub: g, third: gOverall.t, country, year, depth: 1 }));
      for (const r of grp) {
        if (/^overall\s*-/i.test(r.t) || r.t === '') continue;
        rows.push(makeRow({ kind: 'leaf', label: r.t, pub: pillar.pub, indicator: pillar.indicator, sub: g, third: r.t, country, year, depth: 1 }));
      }
    }
    return rows;
  }

  if (pillar.layout === 'nri') {
    for (const P of NRI_PILLARS) {
      const prows = _idx.tableRows.get(`NRI|${P}|${country}|${year}`) || [];
      if (!prows.length) continue;
      const pOverall = prows.find(r => r.s === 'Overall');
      rows.push({ kind: 'pillar', label: P, depth: 0,
        rank: pOverall ? pOverall.r : null, score: pOverall ? pOverall.sc : null });
      const groups = [...new Set(prows.filter(r => r.s !== 'Overall').map(r => r.s))];
      for (const g of groups) {
        const grp = prows.filter(r => r.s === g);
        const gOverall = grp.find(r => r.t === '');
        rows.push(makeRow({ kind: 'group', label: g, pub: 'NRI', indicator: P, sub: g, third: '', country, year, depth: 1 }));
        for (const r of grp) {
          if (r.t === '') continue;
          rows.push(makeRow({ kind: 'leaf', label: r.t, pub: 'NRI', indicator: P, sub: g, third: r.t, country, year, depth: 2 }));
        }
      }
    }
    return rows;
  }
  return rows;
}

/* ============================================================
   NRI (Network Readiness Index) — special layout data helpers
   Only 2025 data exists: no YoY, no trend, no sparkline.
   ============================================================ */
const NRI_COLORS = { Technology: '#0A6EA8', People: '#1F7A4A', Governance: '#534AB7', Impact: '#C4880A' };
const NRI_SUBLABEL = { 'Future Technologies': 'Future Tech', 'SDG Contribution': 'SDG', 'Quality of Life': 'Quality of Life' };

// overall NRI rank/score row for a country/year
function nriOverall(country, year) {
  return overallSeries('NRI', 'Network Readiness Index', country).find(r => r.y === year) || null;
}
// the 4 pillar cards: each with overall rank/score + prior-year rank + its 3 sub-group rank pills
function nriPillarData(country, year) {
  return NRI_PILLARS.map(P => {
    const rows = _idx.tableRows.get(`NRI|${P}|${country}|${year}`) || [];
    const overall = rows.find(r => r.s === 'Overall' && r.t === '');
    const prevRows = _idx.tableRows.get(`NRI|${P}|${country}|${year - 1}`) || [];
    const prevOverall = prevRows.find(r => r.s === 'Overall' && r.t === '');
    const subs = rows.filter(r => r.s !== 'Overall' && r.t === '')
      .map(r => ({ name: r.s, rank: r.r, score: r.sc }));
    return { pillar: P, color: NRI_COLORS[P], rank: overall ? overall.r : null, score: overall ? overall.sc : null,
      prevRank: prevOverall ? prevOverall.r : null, subs };
  });
}
// top-N country comparison for a pillar (uses Overall rows of that pillar)
function nriCompare(P, year, sortBy = 'rank', limit = 10) {
  const list = (_idx.byYear.get(`NRI|${P}|${year}`) || []).map(r => ({ country: r.c, rank: r.r, score: r.sc }));
  const sorted = sortBy === 'score'
    ? [...list].sort((a, b) => (b.score ?? -1e9) - (a.score ?? -1e9))
    : [...list].sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9));
  return sorted.slice(0, limit);
}
// three-level table rows for a single selected NRI pillar (prior-year aware:
// overall / sub-pillar / leaf rows all carry prevRank, prevScore + YoY via makeRow)
function nriPillarTable(P, country, year) {
  const rows = _idx.tableRows.get(`NRI|${P}|${country}|${year}`) || [];
  const out = [];
  const pOverall = makeRow({ kind: 'group', label: P, pub: 'NRI', indicator: P, sub: 'Overall', third: '', country, year });
  out.push({ ...pOverall, kind: 'nri-pillar', label: P });
  out.push({ ...pOverall, kind: 'nri-overall1', label: `Overall – ${P}` });
  const subs = [...new Set(rows.filter(r => r.s !== 'Overall').map(r => r.s))];
  for (const g of subs) {
    const gOverall = makeRow({ kind: 'group', label: `Overall – ${g}`, pub: 'NRI', indicator: P, sub: g, third: '', country, year });
    out.push({ kind: 'nri-subhdr', label: g });
    out.push({ ...gOverall, kind: 'nri-overall2', label: `Overall – ${g}` });
    for (const r of rows.filter(r => r.s === g)) {
      if (r.t === '') continue;
      out.push(makeRow({ kind: 'leaf', label: r.t, pub: 'NRI', indicator: P, sub: g, third: r.t, country, year, depth: 2 }));
    }
  }
  return out;
}

/* NRI line chart country colours (spec) */
const NRI_COUNTRY_COLOR = {
  'Singapore': '#0C3B6E', 'United States': '#1F7A4A', 'Switzerland': '#534AB7',
  'Netherlands': '#C4880A', 'Germany': '#885230', 'Denmark': '#C4460A',
  'Finland': '#0F5C8C', 'Sweden': '#6B5C9E',
};
const NRI_FALLBACK_COLORS = ['#0F5C8C', '#6B5C9E', '#885230', '#1F7A4A', '#534AB7', '#C4880A', '#C4460A'];
function nriCountryColor(country, i) {
  return NRI_COUNTRY_COLOR[country] || NRI_FALLBACK_COLORS[i % NRI_FALLBACK_COLORS.length];
}

/* Ordered list of sub-pillar group names for an NRI pillar (e.g. Access, Content, Future Technologies). */
function nriSubPillars(pillar, year) {
  const seen = [];
  for (const r of RECS) {
    if (r.p === 'NRI' && r.i === pillar && r.y === year && r.s !== 'Overall' && r.t === '' && !seen.includes(r.s)) seen.push(r.s);
  }
  return seen;
}

/* Sub-pillar rank profile across the top-N countries (by this pillar's overall rank). */
function nriProfile(pillar, year, limit = 5) {
  const subs = nriSubPillars(pillar, year);
  const top = nriCompare(pillar, year, 'rank', limit).map(c => c.country);
  if (!top.includes('Singapore') && top.length) { top.pop(); top.unshift('Singapore'); }
  const series = top.map((country, i) => {
    const pts = subs.map(sub => {
      const arr = _idx.subSeries.get(`NRI|${pillar}|${country}|${sub}|`) || [];
      const rec = arr.find(r => r.y === year) || null;
      return { sub, rank: rec ? rec.r : null, score: rec ? rec.sc : null };
    });
    return { country, color: nriCountryColor(country, i), isMe: country === 'Singapore', pts };
  });
  return { subs, series };
}

/* Top-N country comparison for a single NRI third-tier indicator. */
function nriThirdCompare(pillar, sub, third, year, limit = 5) {
  return compareTop('NRI', pillar, year, sub, third, limit)
    .map((c, i) => ({ ...c, color: nriCountryColor(c.country, i), isMe: c.country === 'Singapore' }));
}

/* ============================================================
   GAI (Global AI Index) — Tortoise Media
   Single-edition (2024). The composite "Overall" row uses
   sub_indicator = null (mapped to s=''), unlike IMD/NRI whose
   pillar overalls use s='Overall'. The three dimensions
   (Implementation / Innovation / Investment) hold only
   sub-indicators — there is NO dimension-level rollup rank.
   Every value below is derived from RECS (the live table); the
   only static GAI config is colour/label/URL in PUB_* maps.
   ============================================================ */
const GAI_PUB = 'Global AI Index';

/* distinct edition years for GAI, newest first */
function gaiYears() {
  const set = new Set();
  for (const r of RECS) if (r.p === GAI_PUB && r.i === 'Overall' && r.s === '' && r.t === '') set.add(r.y);
  return [...set].sort((a, b) => b - a);
}
/* composite-overall series for a country (Overall indicator, no sub/third) */
function gaiOverallSeries(country) {
  return (_idx.subSeries.get(`${GAI_PUB}|Overall|${country}||`) || []).slice().sort((a, b) => a.y - b.y);
}
function gaiOverallRow(country, year) {
  return gaiOverallSeries(country).find(r => r.y === year) || null;
}
/* every country's composite-overall row at a year, ordered by rank ascending */
function gaiOverallRanking(year) {
  return compareTop(GAI_PUB, 'Overall', year, null, '', null); // [{country,rank,score}]
}
/* dimensions ("pillars"): distinct indicators excluding Overall, in data order */
function gaiPillars() {
  const seen = [];
  for (const r of RECS) if (r.p === GAI_PUB && r.i !== 'Overall' && !seen.includes(r.i)) seen.push(r.i);
  return seen;
}
/* a pillar's own rollup row (indicator=pillar, sub_indicator=null) for a country/year,
   if the publication carries pillar-level ranks; null otherwise (renders as —). */
function gaiPillarOverall(pillar, country, year) {
  const arr = _idx.subSeries.get(`${GAI_PUB}|${pillar}|${country}||`) || [];
  return arr.find(r => r.y === year) || null;
}
/* a pillar's sub-pillars for one country/year, alphabetical (excludes the pillar rollup) */
function gaiPillarSubs(pillar, country, year) {
  const rows = _idx.tableRows.get(`${GAI_PUB}|${pillar}|${country}|${year}`) || [];
  return rows.filter(r => r.t === '' && r.s !== '' && r.s !== 'Overall')
    .map(r => ({ sub: r.s, rank: r.r, score: r.sc, def: defOf(GAI_PUB, pillar, r.s, ''), dim: pillar }))
    .sort((a, b) => a.sub.localeCompare(b.sub));
}
/* every distinct GAI sub-pillar name across all pillars (for the Sub-pillar filter),
   with a sub→pillar lookup so a selection can resolve its parent pillar. */
function gaiAllSubPillars(year) {
  const seen = [], parent = {};
  for (const r of RECS) {
    if (r.p !== GAI_PUB || r.i === 'Overall' || r.t !== '' || !r.s || r.s === 'Overall') continue;
    if (year && r.y !== year) continue;
    if (!seen.includes(r.s)) { seen.push(r.s); parent[r.s] = r.i; }
  }
  seen.sort((a, b) => a.localeCompare(b));
  return { subs: seen, parent };
}
/* grouped table model: composite Overall (All view only), then each pillar header,
   that pillar's own rollup row, and its sub-pillar leaves. */
function gaiTableModel(country, year, dimFilter) {
  const rows = [];
  const all = !dimFilter || dimFilter === 'All';
  if (all) {
    const ov = gaiOverallRow(country, year);
    rows.push({ kind: 'overall', label: 'Overall', dim: 'Overall', rank: ov ? ov.r : null, score: ov ? ov.sc : null });
  }
  const dims = gaiPillars().filter(d => all || d === dimFilter);
  for (const dim of dims) {
    rows.push({ kind: 'header', label: dim, dim });
    const po = gaiPillarOverall(dim, country, year);
    rows.push({ kind: 'poverall', label: 'Overall', dim, rank: po ? po.r : null, score: po ? po.sc : null });
    for (const s of gaiPillarSubs(dim, country, year)) {
      rows.push({ kind: 'leaf', label: s.sub, dim, sub: s.sub, rank: s.rank, score: s.score, hasDef: !!s.def, def: s.def });
    }
  }
  return rows;
}
/* country comparison for the composite Overall or a specific dimension sub-indicator.
   dim='Overall',sub=null → composite; dim=dimension,sub=name → that sub-indicator. */
function gaiCompare(dim, sub, year, mode = 'all', focus = 'Singapore') {
  const s = sub == null ? null : sub;
  return mode === 'sg'
    ? compareWindow(GAI_PUB, dim, year, s, '', focus)
    : compareTop(GAI_PUB, dim, year, s, '', null);
}

/* ---------- IMD publication-level "Overall" helpers (Overall – IMD page) ----------
   Reads the international_benchmarks rows where indicator='Overall' and
   sub_indicator='Overall' for a publication (IMD WCY / IMD WDC). Overall rank
   data currently begins at 2024; this list extends automatically as more years
   are added to Supabase. */
function imdOverallYears(pub) {
  const set = new Set();
  for (const r of RECS) if (r.p === pub && r.i === 'Overall' && r.s === 'Overall' && r.t === '') set.add(r.y);
  return [...set].sort((a, b) => b - a);
}

/* ============================================================
   GARI (Government AI Readiness Index) — Oxford Insights
   2019 legacy is PERMANENTLY excluded; in-scope eras are 2020–2024
   (3 stable pillars, deep-dive pages) and 2025 (6 new pillars,
   consolidated grid only). Every query filters year >= 2020.
   Mirrors NRI shape: pillar overall rows use s='Overall'; the
   top-level Overall indicator is i='Overall' (scanned directly so
   it works whether its sub_indicator maps to '' or 'Overall'). */
const GARI_PUB = 'Government AI Readiness Index';
const GARI_PILLARS_2024 = ['Government', 'Technology Sector', 'Data and Infrastructure'];
const GARI_PILLARS_2025 = ['Policy Capacity', 'AI Infrastructure', 'Governance', 'Public Sector Adoption', 'Development & Diffusion', 'Resilience'];

function gariEra(year) { return year === 2025 ? '2025' : '2020-2024'; }
function gariYears() {
  const set = new Set();
  for (const r of RECS) if (r.p === GARI_PUB && r.i === 'Overall' && r.y >= 2020 && r.t === '') set.add(r.y);
  return [...set].sort((a, b) => b - a);
}
function gariEraYears(era) {
  return gariYears().filter(y => era === '2025' ? y === 2025 : (y >= 2020 && y <= 2024));
}
function gariPillars(era) {
  const years = era === '2025' ? [2025] : [2020, 2021, 2022, 2023, 2024];
  const present = new Set();
  for (const r of RECS) if (r.p === GARI_PUB && r.i !== 'Overall' && years.includes(r.y)) present.add(r.i);
  const canon = era === '2025' ? GARI_PILLARS_2025 : GARI_PILLARS_2024;
  const ordered = canon.filter(p => present.has(p));
  for (const p of present) if (!ordered.includes(p)) ordered.push(p);
  return ordered;
}
function gariOverallRanking(year) {
  const seen = new Set(), out = [];
  for (const r of RECS) {
    if (r.p === GARI_PUB && r.i === 'Overall' && r.y === year && r.t === '' && r.r != null && !seen.has(r.c)) {
      seen.add(r.c); out.push({ country: r.c, rank: r.r, score: r.sc });
    }
  }
  return out.sort((a, b) => a.rank - b.rank);
}
function gariOverallWindow(year, focus = 'Singapore', size = 10) {
  const all = gariOverallRanking(year);
  if (all.length <= size) return all;
  const i = all.findIndex(r => r.country === focus);
  if (i < 0) return all.slice(0, size);
  let s = i - Math.floor(size / 2), e = s + size;
  if (s < 0) { s = 0; e = size; }
  if (e > all.length) { e = all.length; s = e - size; }
  return all.slice(s, e);
}
function gariOverallRow(country, year) {
  return gariOverallRanking(year).find(r => r.country === country) || null;
}
function gariOverallSeries(country, fromY = 2020, toY = 2024) {
  const byYear = new Map();
  for (const r of RECS) {
    if (r.p === GARI_PUB && r.i === 'Overall' && r.c === country && r.t === '' && r.y >= fromY && r.y <= toY && r.r != null) {
      if (!byYear.has(r.y)) byYear.set(r.y, { y: r.y, r: r.r, sc: r.sc });
    }
  }
  return [...byYear.values()].sort((a, b) => a.y - b.y);
}
function gariPillarOverall(pillar, country, year) {
  for (const r of RECS) if (r.p === GARI_PUB && r.i === pillar && r.c === country && r.y === year && r.s === 'Overall' && r.t === '') return { r: r.r, sc: r.sc };
  return null;
}
function gariPillarSeries(pillar, country) {
  return overallSeries(GARI_PUB, pillar, country).filter(r => r.y >= 2020 && r.y <= 2024).slice().sort((a, b) => a.y - b.y);
}
function gariPillarSubs(pillar, country, year) {
  const out = [];
  for (const r of RECS) if (r.p === GARI_PUB && r.i === pillar && r.c === country && r.y === year && r.t === '' && r.s !== 'Overall' && r.s !== '') out.push({ sub: r.s, rank: r.r, score: r.sc });
  return out.sort((a, b) => a.sub.localeCompare(b.sub));
}
function gariCompare(indicator, sub, year, mode = 'all', focus = 'Singapore') {
  return mode === 'sg'
    ? compareWindow(GARI_PUB, indicator, year, sub, '', focus)
    : compareTop(GARI_PUB, indicator, year, sub, '', null);
}
function gariSubIndTable(pillar, country, year) {
  const py = year - 1;
  const pick = (s) => {
    let cur = null, prev = null;
    for (const r of RECS) if (r.p === GARI_PUB && r.i === pillar && r.c === country && r.s === s && r.t === '') { if (r.y === year) cur = r; else if (r.y === py) prev = r; }
    return { rank: cur ? cur.r : null, score: cur ? cur.sc : null, prevRank: prev ? prev.r : null, prevScore: prev ? prev.sc : null };
  };
  const rows = [{ kind: 'header', label: pillar }];
  rows.push({ kind: 'overall', label: 'Overall – ' + pillar, ...pick('Overall') });
  const subs = [];
  for (const r of RECS) if (r.p === GARI_PUB && r.i === pillar && r.c === country && r.y === year && r.t === '' && r.s !== 'Overall' && r.s !== '' && !subs.includes(r.s)) subs.push(r.s);
  subs.sort((a, b) => a.localeCompare(b));
  for (const s of subs) rows.push({ kind: 'leaf', label: s, ...pick(s) });
  return rows;
}
function gariPillarMatrix(pillar, year, mode = 'all', focus = 'Singapore') {
  const subs = [];
  for (const r of RECS) if (r.p === GARI_PUB && r.i === pillar && r.y === year && r.t === '' && r.s !== 'Overall' && r.s !== '' && !subs.includes(r.s)) subs.push(r.s);
  subs.sort((a, b) => a.localeCompare(b));
  const base = gariCompare(pillar, 'Overall', year, mode, focus);
  const subMaps = subs.map(s => {
    const m = new Map();
    for (const c of compareTop(GARI_PUB, pillar, year, s, '', null)) m.set(c.country, c);
    return m;
  });
  const rows = base.map(c => ({
    country: c.country, isMe: c.country === 'Singapore',
    cells: subs.map((s, i) => { const rec = subMaps[i].get(c.country); return { sub: s, rank: rec ? rec.rank : null, score: rec ? rec.score : null }; }),
  }));
  return { subs, rows };
}
function gari2025Cards(country = 'Singapore') {
  return gariPillars('2025').map(p => {
    const ov = gariPillarOverall(p, country, 2025);
    return { pillar: p, score: ov ? ov.sc : null, rank: ov ? ov.r : null, subs: gariPillarSubs(p, country, 2025).map(s => s.sub) };
  });
}
/* live counts for the 2025 framework header (countries / pillars / dimensions) */
function gari2025Counts() {
  const countries = new Set(), pillars = new Set(), dims = new Set();
  for (const r of RECS) {
    if (r.p !== GARI_PUB || r.y !== 2025) continue;
    if (r.i === 'Overall' && r.t === '' && r.c) countries.add(r.c);
    if (r.i !== 'Overall') pillars.add(r.i);
    if (r.i !== 'Overall' && r.s !== 'Overall' && r.s !== '' && r.s != null) dims.add(r.s);
  }
  return { countries: countries.size, pillars: pillars.size, dimensions: dims.size };
}
/* era label shown beneath each GARI Level-2 pillar tab (e.g. "GARI (2020-2024)") */
const GARI_ERA_LABEL = { '2020-2024': 'GARI (2020-2024)', '2025': 'GARI (2025)' };
function gariEraLabel(era) { return GARI_ERA_LABEL[era] || 'GARI'; }

Object.assign(window, {
  RECS, DEFS, ISO, PUB_COLOR, PUB_FULL, PUB_SHORT, PUB_URL, PILLARS, NRI_PILLARS, imdOverallYears,
  ordinal, flagUrl, fmtScore, defOf, overallSeries, yearsFor, countriesFor,
  overallRow, useIndicatorData, buildTableModel,
  loadData, rebuildIndices, lastUpdatedStr, formatLastUpdated, compareTop, compareWindow, nriSubPillarMatrix, fetchLastUpdated, BodyPortal,
  NRI_COLORS, NRI_SUBLABEL, nriOverall, nriPillarData, nriCompare, nriPillarTable,
  NRI_COUNTRY_COLOR, nriCountryColor, nriSubPillars, nriProfile, nriThirdCompare,
  gaiYears, gaiOverallSeries, gaiOverallRow, gaiOverallRanking, gaiPillars,
  gaiPillarSubs, gaiPillarOverall, gaiAllSubPillars, gaiTableModel, gaiCompare,
  GARI_PUB, GARI_PILLARS_2024, GARI_PILLARS_2025, gariEra, gariYears, gariEraYears,
  gariPillars, gariOverallRanking, gariOverallWindow, gariOverallRow, gariOverallSeries,
  gariPillarOverall, gariPillarSeries, gariPillarSubs, gariCompare, gariSubIndTable,
  gariPillarMatrix, gari2025Cards, gari2025Counts, gariEraLabel,
});

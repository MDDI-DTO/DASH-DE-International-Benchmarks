/* ============================================================
   DASHDE — OVERVIEW tab (rebuilt + polished)
   Responsive grid of compact publication cards, grouped by domain.

   Expanded panel chart type is per-publication:
     IMD WCY  -> single-line ranking trend
     IMD WDC  -> multi-line ranking trend (one line per pillar)
     NRI      -> combined bar (pillars) + line (Overall NRI) trend
     GAI/GARI -> rank-profile bar chart (rank-left, name-on-bar)

   All figures derive at runtime from window.RECS / lib helpers;
   OV_META supplies source-line text; OV_PILLAR_DEFS / OV_PILLAR_ICONS
   provide fallback definitions + decorative icons.
   ============================================================ */

const OV_PUBS = {
  'Digital Economy': [
    {
      pub: 'IMD WCY', full: 'IMD World Competitiveness Yearbook', short: 'IMD WCY',
      accent: '#0A6EA8', subject: 'IMD WCY indicators', chart: 'line-single',
      overall: { kind: 'series', pub: 'IMD WCY', indicator: 'Overall' },
      pillars: [{ indicator: 'Technological Infrastructure', label: 'Technological Infrastructure' }],
    },
    {
      pub: 'IMD WDC', full: 'IMD World Digital Competitiveness Ranking', short: 'IMD WDC',
      accent: '#1F7A4A', subject: 'IMD WDC pillars', chart: 'line-multi',
      overall: { kind: 'series', pub: 'IMD WDC', indicator: 'Overall' },
      pillars: [
        { indicator: 'Knowledge', label: 'Knowledge', color: '#1F7A4A' },
        { indicator: 'Technology', label: 'Technology', color: '#E07B00' },
        { indicator: 'Future readiness', label: 'Future Readiness', color: '#7C3ABE' },
      ],
    },
    {
      pub: 'NRI', full: 'Network Readiness Index', short: 'NRI',
      accent: '#534AB7', subject: 'NRI pillars', chart: 'nri-grouped',
      overall: { kind: 'series', pub: 'NRI', indicator: 'Network Readiness Index' },
      pillars: [
        { indicator: 'Technology', label: 'Technology' },
        { indicator: 'People', label: 'People' },
        { indicator: 'Governance', label: 'Governance' },
        { indicator: 'Impact', label: 'Impact' },
      ],
    },
  ],
  'AI': [
    {
      pub: 'Global AI Index', full: 'Global AI Index', short: 'GAI',
      accent: '#BE185D', subject: 'GAI pillars', chart: 'bar',
      overall: { kind: 'gai' }, gaiSub: true, pillars: null,
    },
    {
      pub: 'Government AI Readiness Index', full: 'Government AI Readiness Index', short: 'GARI',
      accent: '#B45309', subject: 'GARI pillars', chart: 'bar',
      overall: { kind: 'gari' }, pillars: null,
    },
  ],
};

/* Source-line metadata (frequency:null omits the "· {Frequency}" segment). */
const OV_META = {
  'IMD WCY': { publisher: 'IMD World Competitiveness Center', frequency: 'Annual' },
  'IMD WDC': { publisher: 'IMD World Competitiveness Center', frequency: 'Annual' },
  'NRI': { publisher: 'Portulans Institute', frequency: 'Annual' },
  'Global AI Index': { publisher: 'Tortoise Media', frequency: null },
  'Government AI Readiness Index': { publisher: 'Oxford Insights', frequency: 'Annual' },
};

const OV_DOMAIN_COLOR = { 'Digital Economy': '#0A6EA8', 'AI': '#B45309' };

/* Fallback pillar definitions (used when the Supabase `definition` column is empty
   for a pillar row). Keys are either "{publication}::{pillar}" (for names that recur
   across publications with different meanings) or a bare pillar name. */
const OV_PILLAR_DEFS = {
  // NRI
  'NRI::Technology': 'Availability, affordability and reach of the core technologies that underpin a country\u2019s network economy \u2014 access, content and future technologies.',
  'People': 'How effectively individuals, businesses and governments use ICT \u2014 spanning digital skills and participation.',
  'NRI::Governance': 'The institutional environment for the network economy \u2014 trust, regulation and inclusion.',
  'Impact': 'The economic, societal and SDG-related outcomes a country derives from its network readiness.',
  // GAI sub-pillars (displayed on the GAI card)
  'Global AI Index::Talent': 'Availability of skilled AI practitioners and the depth of the national AI talent pool.',
  'Global AI Index::Infrastructure': 'Reliability and scale of the digital and computing infrastructure that supports AI.',
  'Global AI Index::Operating Environment': 'The regulatory context and public opinion shaping how AI is developed and adopted.',
  'Global AI Index::Research': 'Volume and quality of AI research output and academic activity.',
  'Global AI Index::Development': 'Development of AI algorithms, platforms and foundational tooling.',
  'Global AI Index::Government Strategy': 'Depth of national government commitment to AI through strategy and spending.',
  'Global AI Index::Commercial': 'Level of AI investment, start-up activity and commercial adoption.',
  // GARI 2025 framework
  'AI Infrastructure': 'Digital and data infrastructure required to build and run AI systems.',
  'Development & Diffusion': 'Maturity of the AI sector and how widely AI spreads across the economy.',
  'Government AI Readiness Index::Governance': 'Ethical, legal and regulatory frameworks governing responsible AI use.',
  'Policy Capacity': 'Government\u2019s capacity to design and deliver effective AI policy and strategy.',
  'Public Sector Adoption': 'Extent to which government bodies adopt and deploy AI in public services.',
  'Resilience': 'Adaptive capacity and safeguards that let a country withstand AI-related risks.',
  // GARI 2020-2024 pillars
  'Government': 'Government vision, governance and digital capacity to adopt AI.',
  'Technology Sector': 'Maturity, innovation and human capital of the domestic technology sector.',
  'Data and Infrastructure': 'Availability of data and the technical infrastructure needed for AI.',
};

/* Decorative per-pillar icons (Fix 7). Keyed "{publication}::{pillar}" where a name
   recurs across publications, else by bare pillar name. */
const OV_PILLAR_ICONS = {
  'Technological Infrastructure': '\uD83D\uDEF0\uFE0F',
  'IMD WDC::Technology': '\uD83D\uDCBB', 'Knowledge': '\uD83C\uDF93', 'Future Readiness': '\uD83D\uDE80',
  'NRI::Technology': '\uD83C\uDF10', 'People': '\uD83D\uDC65', 'NRI::Governance': '\u2696\uFE0F', 'Impact': '\uD83D\uDCC8',
  'Global AI Index::Talent': '\uD83D\uDC65', 'Global AI Index::Infrastructure': '\uD83C\uDFD7\uFE0F',
  'Global AI Index::Operating Environment': '\uD83C\uDF10', 'Global AI Index::Research': '\uD83D\uDD2C',
  'Global AI Index::Development': '\uD83D\uDEE0\uFE0F', 'Global AI Index::Government Strategy': '\uD83C\uDFDB\uFE0F',
  'Global AI Index::Commercial': '\uD83D\uDCBC',
  'AI Infrastructure': '\uD83D\uDDC4\uFE0F', 'Development & Diffusion': '\uD83D\uDE80',
  'Government AI Readiness Index::Governance': '\u2696\uFE0F', 'Policy Capacity': '\uD83D\uDCE2',
  'Public Sector Adoption': '\uD83C\uDFDB\uFE0F', 'Resilience': '\uD83D\uDEE1\uFE0F',
  'Government': '\uD83C\uDFDB\uFE0F', 'Technology Sector': '\uD83C\uDFED', 'Data and Infrastructure': '\uD83D\uDDC4\uFE0F',
};
function ovIcon(pub, name) { return OV_PILLAR_ICONS[pub + '::' + name] || OV_PILLAR_ICONS[name] || ''; }

/* Rolling 5-year trend window: keep only the most recent 5 years ending at the
   latest available year (inclusive). Computed live from the supplied year list —
   never hardcoded — so the window rolls forward automatically as new years land.
   Shared by every Overview trend chart (single-line, multi-line, NRI combo). */
function ovTrendWindow(years) {
  const sorted = [...new Set(years)].sort((a, b) => a - b);
  if (!sorted.length) return sorted;
  const latest = sorted[sorted.length - 1];
  return sorted.filter(y => y > latest - 5);
}

/* NRI combined-chart colours */
const OV_NRI_PILLAR_COLORS = { 'Technology': '#534AB7', 'People': '#7B72CC', 'Governance': '#9D96D9', 'Impact': '#C0BBE8' };
const OV_NRI_OVERALL_COLOR = '#3B2F8F';
function ovRgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }

/* ---------- small helpers ---------- */
function ovOrd(n) { return n == null ? '' : (window.ordinal ? window.ordinal(n) : ''); }
function ovOrd2(n) { if (n == null) return ''; const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
function ovSeries(pub, indicator) {
  return (window.overallSeries ? window.overallSeries(pub, indicator, 'Singapore') : [])
    .filter(r => r.r != null).map(r => ({ y: r.y, r: r.r, sc: r.sc }));
}
function ovDef(pub, indicator) {
  let d = window.defOf ? (window.defOf(pub, indicator, 'Overall', '') || window.defOf(pub, indicator, '', '')) : '';
  if (!d) d = OV_PILLAR_DEFS[pub + '::' + indicator] || OV_PILLAR_DEFS[indicator] || '';
  return d || '';
}
function ovDiscoverPillars(pub, year) {
  const seen = [];
  for (const r of (window.RECS || [])) {
    if (r.p === pub && r.y === year && r.s === 'Overall' && (r.t === '' || r.t == null)
        && r.c === 'Singapore' && r.i !== 'Overall' && !seen.includes(r.i)) seen.push(r.i);
  }
  return seen.map(i => ({ indicator: i, label: i }));
}
function ovPillarSet(pub, year) {
  if (year == null) return new Set();
  return new Set(ovDiscoverPillars(pub, year).map(p => p.indicator));
}
function ovPillarsComparable(pub, curYear, prevYear) {
  const cur = ovPillarSet(pub, curYear), prev = ovPillarSet(pub, prevYear);
  if (!cur.size || !prev.size) return false;
  return cur.size === prev.size && [...cur].every(p => prev.has(p));
}
function ovSubRanks(pub, indicator, year) {
  const out = [];
  for (const r of (window.RECS || [])) {
    if (r.p === pub && r.i === indicator && r.c === 'Singapore' && r.y === year
        && r.s !== 'Overall' && (r.t === '' || r.t == null) && r.r != null) {
      out.push({ name: r.s, rank: r.r });
    }
  }
  return out.sort((a, b) => a.rank - b.rank);
}

/* ---------- headline rank for a publication ---------- */
function ovOverall(cfg) {
  const o = cfg.overall || {};
  if (o.kind === 'gai') {
    const ys = (window.gaiYears ? window.gaiYears() : []).slice().sort((a, b) => a - b);
    const y = ys.length ? ys[ys.length - 1] : null;
    const row = (y != null && window.gaiOverallRow) ? window.gaiOverallRow('Singapore', y) : null;
    return { rank: row ? row.r : null, prev: null, year: y };
  }
  if (o.kind === 'gari') {
    const ys = (window.gariYears ? window.gariYears() : []).slice().sort((a, b) => a - b);
    const y = ys.length ? ys[ys.length - 1] : null;
    const cur = (y != null && window.gariOverallRow) ? window.gariOverallRow('Singapore', y) : null;
    const prev = (y != null && window.gariOverallRow) ? window.gariOverallRow('Singapore', y - 1) : null;
    return { rank: cur ? cur.rank : null, prev: prev ? prev.rank : null, year: y };
  }
  const s = ovSeries(o.pub, o.indicator);
  if (!s.length) return { rank: null, prev: null, year: null };
  const y = Math.max(...s.map(r => r.y));
  const cur = s.find(r => r.y === y) || null;
  const prev = s.find(r => r.y === y - 1) || null;
  return { rank: cur ? cur.r : null, prev: prev ? prev.r : null, year: y };
}

/* ---------- model builders ---------- */
function ovBuildGAI(cfg) {
  const years = (window.gaiYears ? window.gaiYears() : []).slice().sort((a, b) => a - b);
  const latestYear = years.length ? years[years.length - 1] : null;
  const rowsRaw = [];
  for (const r of (window.RECS || [])) {
    if (r.p === 'Global AI Index' && r.c === 'Singapore' && r.y === latestYear
        && r.i !== 'Overall' && (r.t === '' || r.t == null) && r.s && r.s !== 'Overall' && r.r != null) {
      const sbDef = window.defOf ? (window.defOf('Global AI Index', r.i, r.s, '') || '') : '';
      rowsRaw.push({
        indicator: r.i + ' \u00b7 ' + r.s, label: r.s, parent: r.i, sub: r.s,
        definition: sbDef || OV_PILLAR_DEFS['Global AI Index::' + r.s] || OV_PILLAR_DEFS[r.s] || '',
        cur: r.r, prev: null, score: r.sc, series: [{ y: r.y, r: r.r }],
      });
    }
  }
  const rows = rowsRaw.sort((a, b) => a.cur - b.cur);
  return {
    cfg, latestYear, prevYear: null, multiYear: false, hasPrevYear: false, comparable: false,
    years: [latestYear], yearSpan: String(latestYear), overall: ovOverall(cfg), rows,
    highlights: ovHighlights(cfg, rows, latestYear, null, false),
  };
}

function ovBuildPub(cfg) {
  let pillars = cfg.pillars;
  let years = [];
  for (const r of (window.RECS || [])) {
    if (r.p === cfg.pub && r.s === 'Overall' && (r.t === '' || r.t == null) && r.c === 'Singapore') years.push(r.y);
  }
  years = [...new Set(years)].sort((a, b) => a - b);
  const latestYear = years.length ? years[years.length - 1] : null;
  const prevYear = latestYear != null ? latestYear - 1 : null;
  if (!pillars) pillars = ovDiscoverPillars(cfg.pub, latestYear);

  const rows = pillars.map(p => {
    const s = ovSeries(cfg.pub, p.indicator);
    const cur = s.find(x => x.y === latestYear) || null;
    const prev = s.find(x => x.y === prevYear) || null;
    return {
      indicator: p.indicator, label: p.label, color: p.color,
      definition: ovDef(cfg.pub, p.indicator),
      series: s, cur: cur ? cur.r : null, prev: prev ? prev.r : null, score: cur ? cur.sc : null,
    };
  }).filter(r => r.cur != null);

  const multiYear = years.length >= 2;
  const hasPrevYear = multiYear && ovPillarSet(cfg.pub, prevYear).size > 0;
  const comparable = hasPrevYear && ovPillarsComparable(cfg.pub, latestYear, prevYear);
  if (!comparable) for (const r of rows) r.prev = null;

  const sortedRows = [...rows].sort((a, b) => a.cur - b.cur);
  // Trend charts are capped to a rolling 5-year window ending at the latest year.
  const trendYears = ovTrendWindow(years);
  const yearSpan = trendYears.length ? `${trendYears[0]}\u2013${trendYears[trendYears.length - 1]}` : String(latestYear);

  return {
    cfg, latestYear, prevYear, multiYear, hasPrevYear, comparable, years: trendYears, yearSpan,
    overall: ovOverall(cfg), rows: sortedRows,
    highlights: ovHighlights(cfg, rows, latestYear, prevYear, comparable && multiYear),
  };
}

/* ---------- Strength / Area to watch / Trend ---------- */
function ovHighlights(cfg, rows, latestYear, prevYear, multiYear) {
  const out = {};
  if (!rows.length) return out;
  const singlePillar = rows.length === 1;

  const best = rows.reduce((a, b) => (b.cur < a.cur ? b : a), rows[0]);
  out.strength = `${best.label} ${singlePillar ? 'leads at' : 'is Singapore\u2019s strongest ' + cfg.short + ' pillar at'} ${best.cur}${ovOrd(best.cur)} globally.`;

  let decline = null;
  for (const r of rows) {
    if (r.prev != null && r.cur > r.prev) { const mag = r.cur - r.prev; if (!decline || mag > decline.mag) decline = { r, mag }; }
  }
  const worst = rows.reduce((a, b) => (b.cur > a.cur ? b : a), rows[0]);
  if (singlePillar) {
    const subs = ovSubRanks(cfg.pub, rows[0].indicator, latestYear);
    const wsub = subs.length ? subs[subs.length - 1] : null;
    out.watch = wsub
      ? `${wsub.name.replace(/\s*\[Survey\]\s*/i, '').trim()} trails at ${wsub.rank}${ovOrd(wsub.rank)} \u2014 the weakest ${cfg.short} indicator.`
      : `${worst.label} ranks ${worst.cur}${ovOrd(worst.cur)} \u2014 the area most worth monitoring.`;
  } else if (decline && decline.mag >= 4) {
    const r = decline.r;
    out.watch = `${r.label} fell from ${r.prev}${ovOrd(r.prev)} to ${r.cur}${ovOrd(r.cur)} year-on-year \u2014 the steepest drop.`;
  } else {
    out.watch = `${worst.label} lags at ${worst.cur}${ovOrd(worst.cur)} \u2014 the weakest of Singapore\u2019s ${cfg.short} pillars.`;
  }

  if (multiYear) { const t = ovTrend(rows, latestYear); if (t) out.trend = t; }
  return out;
}

function ovTrend(rows, latestYear) {
  let pick = null;
  for (const r of rows) {
    const s = r.series;
    if (!s || s.length < 2) continue;
    const ranks = s.map(x => x.r);
    const bestRank = Math.min(...ranks);
    const bestPt = s.find(x => x.r === bestRank);
    const first = s[0], last = s[s.length - 1];
    if (bestPt.y !== last.y && last.r - bestRank >= 3) {
      const score = last.r - bestRank;
      if (!pick || score > pick.score) pick = { type: 'peak', r, bestPt, last, score };
      continue;
    }
    if (last.r === bestRank && first.r - last.r >= 3) {
      const score = first.r - last.r;
      if (!pick || score > pick.score) pick = { type: 'improve', r, first, last, score };
      continue;
    }
    if (Math.max(...ranks) <= 3) {
      const score = s.length;
      if (!pick || (pick.type === 'top' && score > pick.score)) pick = pick && pick.type !== 'top' ? pick : { type: 'top', r, first, last, score };
      continue;
    }
    if (last.r === Math.max(...ranks) && last.r - first.r >= 3) {
      const score = last.r - first.r;
      if (!pick || score > pick.score) pick = { type: 'decline', r, first, last, score };
    }
  }
  if (!pick) return null;
  const L = pick.r.label;
  if (pick.type === 'peak')
    return `${L} peaked at ${pick.bestPt.r}${ovOrd(pick.bestPt.r)} in ${pick.bestPt.y} before slipping to ${pick.last.r}${ovOrd(pick.last.r)} in ${pick.last.y}.`;
  if (pick.type === 'improve')
    return `${L} climbed from ${pick.first.r}${ovOrd(pick.first.r)} (${pick.first.y}) to ${pick.last.r}${ovOrd(pick.last.r)} (${pick.last.y}) \u2014 steady gains.`;
  if (pick.type === 'top')
    return `${L} has held within the global top 3 every year since ${pick.first.y}.`;
  return `${L} slid from ${pick.first.r}${ovOrd(pick.first.r)} to ${pick.last.r}${ovOrd(pick.last.r)} since ${pick.first.y}.`;
}

/* ---------- YoY indicator (blank when no comparable prior year) ---------- */
function ovYoY(cur, prev) {
  if (cur == null || prev == null) return null;
  if (cur < prev) return <span className="ovx-yoy up">{'\u2191'}<i>{prev - cur}</i></span>;
  if (cur > prev) return <span className="ovx-yoy down">{'\u2193'}<i>{cur - prev}</i></span>;
  return <span className="ovx-yoy flat">{'\u2014'}</span>;
}

/* Shared rank-label drawer for the Chart.js trend charts (Part A). styleFn(dataset)
   returns {font, color, offset}. Labels that converge at the same x are stacked
   upward so overlapping series stay legible (A2); layout padding (A1) reserves the
   room each label needs at the chart edges. */
function ovDrawRankLabels(chart, styleFn) {
  const { ctx } = chart;
  const items = [];
  chart.data.datasets.forEach((dataset, i) => {
    const meta = chart.getDatasetMeta(i);
    if (!meta || meta.hidden) return;
    const st = styleFn(dataset) || {};
    meta.data.forEach((el, j) => {
      const value = dataset.data[j];
      if (value == null) return;
      items.push({ x: el.x, value, font: st.font, color: st.color, labelY: el.y - (st.offset || 6) });
    });
  });
  // Group by rounded x and push colliding labels upward to keep a minimum gap, so
  // two series sharing the same rank in the same year no longer print on top of
  // each other (A2).
  const MIN_GAP = 13;
  const groups = new Map();
  for (const it of items) { const k = Math.round(it.x); (groups.get(k) || groups.set(k, []).get(k)).push(it); }
  for (const arr of groups.values()) {
    arr.sort((a, b) => b.labelY - a.labelY); // bottom-most label first, stays put
    for (let i = 1; i < arr.length; i++) {
      if (arr[i - 1].labelY - arr[i].labelY < MIN_GAP) arr[i].labelY = arr[i - 1].labelY - MIN_GAP;
    }
  }
  for (const it of items) {
    ctx.save();
    ctx.font = it.font;
    ctx.fillStyle = it.color;
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(ovOrd2(it.value), it.x, it.labelY);
    ctx.restore();
  }
}

/* ============================================================
   Chart.js line trend (single or multi line, inverted rank axis)
   ============================================================ */
function OvLineChart({ model }) {
  const ref = React.useRef(null);
  const chartRef = React.useRef(null);
  React.useEffect(() => {
    if (!window.Chart || !ref.current) return;
    const cfg = model.cfg;
    const years = model.years;
    const single = cfg.chart === 'line-single';
    const datasets = model.rows.map(r => {
      const map = {}; r.series.forEach(p => { map[p.y] = p.r; });
      return {
        label: r.label,
        data: years.map(y => (map[y] != null ? map[y] : null)),
        borderColor: r.color || cfg.accent,
        backgroundColor: single ? ovRgba(cfg.accent, 0.07) : 'transparent',
        fill: single,
        borderWidth: 2,
        pointRadius: single ? 5 : 4, pointHoverRadius: single ? 7 : 6,
        pointBackgroundColor: r.color || cfg.accent, pointBorderColor: '#fff', pointBorderWidth: 1.5,
        tension: 0.25, spanGaps: true,
      };
    });
    const shownRanks = model.rows.flatMap(r => r.series.filter(p => years.includes(p.y)).map(p => p.r)).filter(v => v != null);
    const maxRank = (shownRanks.length ? Math.max(...shownRanks) : 4) + 1;
    const rankLabels = {
      id: 'rankLabels',
      afterDatasetsDraw(chart) {
        ovDrawRankLabels(chart, (dataset) => ({
          font: '500 10px ' + getComputedStyle(document.body).fontFamily,
          color: dataset.borderColor, offset: 8,
        }));
      },
    };
    chartRef.current = new window.Chart(ref.current.getContext('2d'), {
      type: 'line', data: { labels: years, datasets }, plugins: [rankLabels],
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        layout: { padding: { top: 24, right: 34, bottom: 8, left: 8 } },
        interaction: { mode: 'nearest', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#15233a', padding: 9, cornerRadius: 7, titleFont: { size: 11 }, bodyFont: { size: 11 }, displayColors: false,
            callbacks: { title: items => 'Year ' + items[0].label, label: ctx => `${ctx.dataset.label} \u00b7 Rank ${ctx.parsed.y}` },
          },
        },
        scales: {
          y: {
            reverse: true, min: 1, max: maxRank,
            title: { display: true, text: 'Rank', font: { size: 10 }, color: '#94a1b0' },
            ticks: { stepSize: Math.max(1, Math.round(maxRank / 5)), font: { size: 10 }, color: '#94a1b0', precision: 0 },
            grid: { color: 'rgba(16,40,64,0.06)' },
          },
          x: { ticks: { font: { size: 10 }, color: '#94a1b0', maxRotation: 0, autoSkipPadding: 12 }, grid: { display: false } },
        },
      },
    });
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [model]);
  if (!window.Chart) return <div className="ovx-chart-fallback">Chart library unavailable.</div>;
  return <div className="ov-canvas-wrap"><canvas ref={ref} /></div>;
}

/* ============================================================
   NRI combined chart
   ============================================================ */
function OvNRIGroupedChart({ model }) {
  const ref = React.useRef(null);
  const chartRef = React.useRef(null);
  React.useEffect(() => {
    if (!window.Chart || !ref.current) return;
    const years = model.years;
    const overallSer = ovSeries('NRI', 'Network Readiness Index');
    const overallMap = {}; overallSer.forEach(p => { overallMap[p.y] = p.r; });
    const order = ['Technology', 'People', 'Governance', 'Impact'];
    const pillarRows = order.map(n => model.rows.find(r => r.indicator === n || r.label === n)).filter(Boolean);
    const rankFor = (row, yr) => { const p = row.series.find(s => s.y === yr); return p && p.r != null ? p.r : null; };

    const barDatasets = pillarRows.map(row => {
      const color = OV_NRI_PILLAR_COLORS[row.indicator] || OV_NRI_PILLAR_COLORS[row.label] || model.cfg.accent;
      return {
        type: 'bar', label: row.label, data: years.map(yr => rankFor(row, yr)),
        backgroundColor: ovRgba(color, 0.78), borderColor: color, borderWidth: 1,
        borderRadius: 2, categoryPercentage: 0.78, barPercentage: 0.92, order: 1, _labelColor: color,
      };
    });
    const lineDataset = {
      type: 'line', label: 'Overall NRI', data: years.map(yr => (overallMap[yr] != null ? overallMap[yr] : null)),
      borderColor: OV_NRI_OVERALL_COLOR, backgroundColor: 'transparent', borderWidth: 2.5,
      pointBackgroundColor: OV_NRI_OVERALL_COLOR, pointBorderColor: '#fff', pointBorderWidth: 1.5,
      pointRadius: 5, pointHoverRadius: 7, tension: 0.25, spanGaps: false, order: 0, _labelColor: OV_NRI_OVERALL_COLOR,
    };
    const datasets = [...barDatasets, lineDataset];
    const allVals = datasets.flatMap(d => d.data).filter(v => v != null);
    const maxRank = (allVals.length ? Math.max(...allVals) : 5) + 3;
    const rankLabels = {
      id: 'nriComboLabels',
      afterDatasetsDraw(chart) {
        ovDrawRankLabels(chart, (dataset) => {
          const isLine = dataset.type === 'line';
          return {
            font: (isLine ? '700 10px ' : '600 9px ') + getComputedStyle(document.body).fontFamily,
            color: dataset._labelColor || '#4b5563', offset: isLine ? 9 : 4,
          };
        });
      },
    };
    chartRef.current = new window.Chart(ref.current.getContext('2d'), {
      type: 'bar', data: { labels: years, datasets }, plugins: [rankLabels],
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        layout: { padding: { top: 24, right: 34, bottom: 2, left: 8 } },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#15233a', padding: 9, cornerRadius: 7, titleFont: { size: 11 }, bodyFont: { size: 11 },
            callbacks: { title: items => 'Year ' + items[0].label, label: ctx => ctx.parsed.y == null ? null : `${ctx.dataset.label} \u00b7 Rank ${ctx.parsed.y}${ovOrd(ctx.parsed.y)}` },
          },
        },
        scales: {
          y: {
            reverse: false, min: 1, max: maxRank,
            title: { display: true, text: 'Rank (lower = better)', font: { size: 10 }, color: '#94a1b0' },
            ticks: { stepSize: 3, font: { size: 10 }, color: '#94a1b0', precision: 0 }, grid: { color: 'rgba(16,40,64,0.06)' },
          },
          x: { ticks: { font: { size: 10.5, weight: '500' }, color: '#4b5563', maxRotation: 0, autoSkip: false }, grid: { display: false } },
        },
      },
    });
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [model]);
  if (!window.Chart) return <div className="ovx-chart-fallback">Chart library unavailable.</div>;
  return <div className="ov-canvas-wrap"><canvas ref={ref} /></div>;
}

/* ============================================================
   Rank-profile bar chart (GAI / GARI). Width scales by RANK
   within the set (best fills, worst at a ~16% floor) so it reads
   best -> worst monotonically. No numeric label inside the bar
   (Fix 4) — just the pillar name; the rank ordinal is the only
   rank number, shown in its own left column.
   ============================================================ */
function ovBarRows(model) {
  if (model.rows.length === 1 && model.rows[0].indicator) {
    const subs = ovSubRanks(model.cfg.pub, model.rows[0].indicator, model.latestYear);
    if (subs.length > 1) return subs.map(s => ({ label: s.name.replace(/\s*\[Survey\]\s*/i, '').trim(), rank: s.rank }));
  }
  return model.rows.filter(r => r.cur != null).slice().sort((a, b) => a.cur - b.cur).map(r => ({ label: r.label, rank: r.cur }));
}
function OvBar({ rank, name, pct, accent }) {
  const fillRef = React.useRef(null);
  const nameRef = React.useRef(null);
  const [outside, setOutside] = React.useState(false);
  React.useLayoutEffect(() => {
    const f = fillRef.current, n = nameRef.current;
    if (!f || !n) return;
    const measure = () => setOutside((n.scrollWidth + 24) > f.offsetWidth);
    measure();
    const ro = new ResizeObserver(measure); ro.observe(f);
    return () => ro.disconnect();
  }, [name, pct]);
  return (
    <div className="ovx-bar-row">
      <div className="ovx-bar-rank">{rank}<sup>{ovOrd(rank)}</sup></div>
      <div className="ovx-bar-track">
        <div className="ovx-bar-fill" ref={fillRef} style={{ width: pct + '%', background: accent }} />
        <span ref={nameRef} className={'ovx-bar-name' + (outside ? ' out' : '')}
          style={outside ? { left: `calc(${pct}% + 9px)` } : undefined}>{name}</span>
      </div>
    </div>
  );
}
function OvRankBars({ rows, accent }) {
  const ranks = rows.map(r => r.rank);
  const minR = Math.min(...ranks), maxR = Math.max(...ranks);
  return (
    <div className="ovx-bars">
      {rows.map((r, i) => {
        const pct = maxR === minR ? 100 : Math.max(16, Math.min(100, 100 - ((r.rank - minR) / (maxR - minR)) * 84));
        return <OvBar key={r.label + i} rank={r.rank} name={r.label} pct={pct} accent={accent} />;
      })}
    </div>
  );
}

function OvBadge({ kind, label, text }) {
  return (
    <div className={'ovx-badge ' + kind}>
      <span className="ovx-badge-tag">{label}</span>
      <span className="ovx-badge-txt">{text}</span>
    </div>
  );
}

/* expanded panel = Key Highlights badges + per-publication chart */
function OvCardPanel({ model }) {
  const { cfg } = model;
  const h = model.highlights || {};
  const isBar = cfg.chart === 'bar';

  let chartTitle, chartSub, legend = null;
  if (isBar) {
    chartTitle = `${cfg.subject} \u00b7 Singapore rank profile (${model.latestYear})`;
    chartSub = 'Each bar reflects Singapore\u2019s rank for that pillar.';
    legend = [{ label: 'Singapore\u2019s pillar rank', color: cfg.accent }];
  } else if (cfg.chart === 'line-single') {
    chartTitle = `${model.rows[0].label} \u00b7 Singapore ranking trend (${model.yearSpan})`;
    chartSub = '';
  } else if (cfg.chart === 'line-multi') {
    chartTitle = `${cfg.short} pillars \u00b7 Singapore ranking trend (${model.yearSpan})`;
    chartSub = '';
    legend = model.rows.map(r => ({ label: r.label, color: r.color || cfg.accent }));
  } else { // nri-grouped
    chartTitle = `${cfg.short} \u00b7 Singapore ranking trend (${model.yearSpan})`;
    const pillarYears = model.rows.flatMap(r => r.series.map(p => p.y));
    const pillarStart = pillarYears.length ? Math.min(...pillarYears) : null;
    const windowStart = model.years.length ? model.years[0] : null;
    // Keep the pillar-availability note ONLY when pillar data starts later than the
    // visible 5-year window (i.e. it has something useful to add); otherwise omit.
    chartSub = (pillarStart != null && windowStart != null && pillarStart > windowStart)
      ? `Pillar data available from ${pillarStart}` : '';
    const order = ['Technology', 'People', 'Governance', 'Impact'];
    legend = order.map(n => model.rows.find(r => r.indicator === n || r.label === n)).filter(Boolean)
      .map(r => ({ label: r.label, color: OV_NRI_PILLAR_COLORS[r.indicator] || OV_NRI_PILLAR_COLORS[r.label] || cfg.accent }));
    legend.push({ label: 'Overall NRI', color: OV_NRI_OVERALL_COLOR });
  }

  return (
    <div className="ovx-panel">
      <div className="ovx-badges">
        {h.strength && <OvBadge kind="strength" label="Strength" text={h.strength} />}
        {h.watch && <OvBadge kind="watch" label="Area to watch" text={h.watch} />}
        {h.trend && <OvBadge kind="trend" label="Trend" text={h.trend} />}
      </div>

      <div className="ovx-chart">
        <div className="ovx-chart-head">
          <div className="ovx-chart-titles">
            <div className="ovx-chart-title">{chartTitle}</div>
            {chartSub && <div className="ovx-chart-sub">{chartSub}</div>}
          </div>
          {legend && (
            <div className="ovx-chart-legend">
              {legend.map(it => (
                <span className="ovx-leg" key={it.label}><span className="ovx-leg-dot" style={{ background: it.color }} />{it.label}</span>
              ))}
            </div>
          )}
        </div>
        {isBar
          ? <OvRankBars rows={ovBarRows(model)} accent={cfg.accent} />
          : <div className="ovx-chart-canvas" style={{ height: 224 }}>
              {cfg.chart === 'nri-grouped' ? <OvNRIGroupedChart model={model} /> : <OvLineChart model={model} />}
            </div>}
        <div className="ovx-chart-foot">Source: {cfg.short} {model.latestYear} · Classification: Official (Open)</div>
      </div>
    </div>
  );
}

/* ============================================================
   Pillar definition tooltip (hover/tap)
   ============================================================ */
function OvInfoIcon({ definition }) {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState({ x: 0, y: 0, above: false });
  const ref = React.useRef(null);
  const place = React.useCallback(() => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const W = 260;
    let x = r.left + r.width / 2 - W / 2;
    x = Math.max(10, Math.min(x, window.innerWidth - W - 10));
    const above = (window.innerHeight - r.bottom) < 150;
    setPos({ x, y: above ? r.top - 8 : r.bottom + 8, above });
  }, []);
  const show = () => { place(); setOpen(true); };
  const hide = () => setOpen(false);
  return (
    <span className="ovx-info" ref={ref} tabIndex={0} aria-label="Pillar definition"
      onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}
      onClick={e => { e.stopPropagation(); open ? hide() : show(); }}>
      <svg viewBox="0 0 16 16" width="12.5" height="12.5" aria-hidden="true">
        <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <line x1="8" y1="7" x2="8" y2="11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="8" cy="4.4" r="0.95" fill="currentColor" />
      </svg>
      {open && window.BodyPortal && (
        <window.BodyPortal>
          <div className="ovx-tip" style={{ left: pos.x, top: pos.y, transform: pos.above ? 'translateY(-100%)' : 'none' }}>{definition}</div>
        </window.BodyPortal>
      )}
    </span>
  );
}

/* Shared pillar row — aligned name | rank | YoY columns across all cards */
function OvPillarRow({ pub, name, definition, rank, yoy }) {
  const icon = ovIcon(pub, name);
  return (
    <div className="ovx-pr">
      <div className="ovx-pr-name">
        {icon && <span className="ovx-pr-icon" aria-hidden="true">{icon}</span>}
        <span className="ovx-pr-label">{name}</span>
        {definition ? <OvInfoIcon definition={definition} /> : null}
      </div>
      <div className="ovx-pr-rank">{rank}<sup>{ovOrd(rank)}</sup></div>
      <div className="ovx-pr-yoy">{yoy}</div>
    </div>
  );
}

/* ============================================================
   Publication card
   ============================================================ */
function OvCard({ model, open, onToggle }) {
  const { cfg } = model;
  const meta = OV_META[cfg.pub] || {};
  const url = (window.PUB_URL && window.PUB_URL[cfg.pub]) || '#';
  const ov = model.overall || { rank: null, prev: null, year: null };
  const cardRef = React.useRef(null);

  // Scroll the freshly-expanded card near the top of the scroll container so the
  // person doesn't have to hunt for the revealed content (Fix 5).
  React.useEffect(() => {
    if (!open || !cardRef.current) return;
    const scroller = cardRef.current.closest('.site');
    if (!scroller) return;
    const id = requestAnimationFrame(() => {
      const cr = cardRef.current.getBoundingClientRect();
      const sr = scroller.getBoundingClientRect();
      const top = scroller.scrollTop + (cr.top - sr.top) - 16;
      scroller.scrollTo({ top, behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  return (
    <div className={'ovx-card' + (open ? ' open' : '')} ref={cardRef}>
      <div className="ovx-accent" style={{ background: cfg.accent }} />

      <div className="ovx-title">{cfg.full} ({cfg.short})</div>

      <div className="ovx-src">
        <a className="ovx-src-link" style={{ color: cfg.accent }} href={url} target="_blank" rel="noopener noreferrer">{cfg.short}</a>
        {meta.publisher && <><span className="ovx-src-sep">·</span><span>{meta.publisher}</span></>}
        {meta.frequency && <><span className="ovx-src-sep">·</span><span>{meta.frequency}</span></>}
      </div>

      <div className="ovx-overall">
        <div className="ovx-overall-rank">
          {ov.rank != null ? <>{ov.rank}<sup>{ovOrd(ov.rank)}</sup></> : '\u2014'}
        </div>
        <div className="ovx-overall-meta">
          <div className="ovx-overall-label">{cfg.short} overall{ov.year ? ' \u00b7 ' + ov.year : ''}</div>
          <div className="ovx-overall-arrow">{ovYoY(ov.rank, ov.prev)}</div>
        </div>
      </div>

      <div className="ovx-pillars">
        {model.rows.map(r => (
          <OvPillarRow key={r.indicator} pub={cfg.pub} name={r.label} definition={r.definition}
            rank={r.cur} yoy={model.comparable ? ovYoY(r.cur, r.prev) : null} />
        ))}
      </div>

      <button className={'ovx-expand' + (open ? ' open' : '')} onClick={onToggle} aria-expanded={open}>
        <span>{open ? 'Hide details' : 'Expand to see more details'}</span>
        <svg className="ovx-chev" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && <OvCardPanel model={model} />}
    </div>
  );
}

/* ============================================================
   OVERVIEW VIEW
   ============================================================ */
function OverviewView() {
  const models = React.useMemo(() => {
    const byDomain = {};
    for (const domain of Object.keys(OV_PUBS)) {
      byDomain[domain] = OV_PUBS[domain].map(cfg => cfg.gaiSub ? ovBuildGAI(cfg) : ovBuildPub(cfg)).filter(m => m.rows.length);
    }
    return byDomain;
  }, []);

  // single-open accordion (expanding one collapses any other) keeps page length down
  const [openPub, setOpenPub] = React.useState(null);
  const lastUpdated = window.lastUpdatedStr ? window.lastUpdatedStr() : 'Last updated: \u2014';

  return (
    <div className="site ov-fluid">
      {Object.keys(OV_PUBS).map(domain => (
        <section className="ov-domain" key={domain}>
          <div className="ov-domain-head" style={{ '--dc': OV_DOMAIN_COLOR[domain] }}>
            <span className="ov-domain-name">{domain}</span>
            <span className="ov-domain-rule" />
          </div>
          <div className="ovx-grid">
            {(models[domain] || []).map(m => (
              <OvCard key={m.cfg.pub} model={m}
                open={openPub === m.cfg.pub}
                onToggle={() => setOpenPub(p => (p === m.cfg.pub ? null : m.cfg.pub))} />
            ))}
          </div>
        </section>
      ))}

      <div className="ov-foot">
        <span className="ov-foot-class">Classification: Official (Open)</span>
        <span className="ov-foot-updated">{lastUpdated}</span>
      </div>
    </div>
  );
}

Object.assign(window, { OverviewView, OvCard, OvPillarRow, ovIcon, OV_PILLAR_ICONS });

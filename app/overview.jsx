/* ============================================================
   DASHDE — OVERVIEW tab
   At-a-glance summary of Singapore's performance across every
   tracked publication. Scrollable page (mirrors the NRI tab).
   All figures are derived at runtime from the Supabase-loaded
   benchmark records (window.RECS / lib helpers) — nothing here
   is hardcoded; the numbers follow whatever the table holds.
   ============================================================ */

/* ---------- publication configuration ----------
   `pillars` lists the indicator rows (sub_indicator = 'Overall')
   that make up each publication's pillar set, with display labels.   */
const OV_PUBS = {
  'Digital Economy': [
    {
      pub: 'IMD WCY',
      full: 'IMD World Competitiveness Yearbook',
      short: 'IMD WCY',
      accent: '#0A6EA8',
      chart: 'line-single',
      subject: 'Tech Infrastructure',
      pillars: [{ indicator: 'Technological Infrastructure', label: 'Technological Infrastructure' }],
    },
    {
      pub: 'IMD WDC',
      full: 'IMD World Digital Competitiveness Ranking',
      short: 'IMD WDC',
      accent: '#1F7A4A',
      chart: 'line-multi',
      subject: 'IMD WDC pillars',
      pillars: [
        { indicator: 'Knowledge', label: 'Knowledge', color: '#1F7A4A' },
        { indicator: 'Technology', label: 'Technology', color: '#E07B00' },
        { indicator: 'Future readiness', label: 'Future Readiness', color: '#7C3ABE' },
      ],
    },
    {
      pub: 'NRI',
      full: 'Network Readiness Index',
      short: 'NRI',
      accent: '#534AB7',
      chart: 'nri-grouped',
      subject: 'NRI pillars',
      pillars: [
        { indicator: 'Network Readiness Index', label: 'Overall NRI', color: '#534AB7' },
        { indicator: 'Technology', label: 'Technology', color: '#534AB7' },
        { indicator: 'People', label: 'People', color: '#534AB7' },
        { indicator: 'Governance', label: 'Governance', color: '#534AB7' },
        { indicator: 'Impact', label: 'Impact', color: '#534AB7' },
      ],
    },
  ],
  'AI': [
    {
      pub: 'Global AI Index',
      full: 'Global AI Index',
      short: 'GAI',
      accent: '#BE185D',
      chart: 'bar',
      subject: 'GAI pillars',
      barColor: '#BE185D',
      // GAI pillars carry no rollup rank — the rank profile is built from the
      // ranked sub-pillars at runtime (see ovBuildGAI). Single edition (2024).
      gaiSub: true,
      pillars: null,
    },
    {
      pub: 'Government AI Readiness Index',
      full: 'Government AI Readiness Index',
      short: 'GARI',
      accent: '#B45309',
      chart: 'bar',
      subject: 'AI pillars',
      barColor: '#B45309',
      // pillars discovered from Supabase at runtime (see ovBuildPub)
      pillars: null,
    },
  ],
};

const OV_DOMAIN_COLOR = { 'Digital Economy': '#0A6EA8', 'AI': '#B45309' };

/* ---------- small helpers ---------- */
function ovOrd(n) { return n == null ? '' : (window.ordinal ? window.ordinal(n) : ''); }
function ovSeries(pub, indicator) {
  // Overall (sub_indicator='Overall', third='') rank series for Singapore, asc by year.
  return (window.overallSeries ? window.overallSeries(pub, indicator, 'Singapore') : [])
    .filter(r => r.r != null).map(r => ({ y: r.y, r: r.r }));
}
function ovTotalCountries(pub, indicator, year) {
  const all = window.compareTop ? window.compareTop(pub, indicator, year, 'Overall', '', null) : [];
  return all.length;
}
/* discover the pillar indicators for a publication straight from RECS */
function ovDiscoverPillars(pub, year) {
  const seen = [];
  for (const r of (window.RECS || [])) {
    if (r.p === pub && r.y === year && r.s === 'Overall' && (r.t === '' || r.t == null)
        && r.c === 'Singapore' && r.i !== 'Overall' && !seen.includes(r.i)) seen.push(r.i);
  }
  return seen.map(i => ({ indicator: i, label: i }));
}
/* the set of pillar indicator names a publication carries in a given year, taken
   straight from the data. Used to test whether two adjacent years are
   STRUCTURALLY comparable (same pillar set) before offering a YoY comparison —
   a pillar restructuring (e.g. GARI 2024 3-pillar → 2025 6-pillar) is detected
   here at runtime rather than via a hardcoded year check. */
function ovPillarSet(pub, year) {
  if (year == null) return new Set();
  return new Set(ovDiscoverPillars(pub, year).map(p => p.indicator));
}
/* leaf sub-indicator ranks for a single-pillar publication (Singapore, year) */
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

/* ---------- build the full model for one publication ---------- */
/* GAI is single-edition and its pillars have no rollup rank, so the rank profile
   is assembled from the ranked sub-pillars (the only GAI rows that carry a rank).
   Same model shape as ovBuildPub so OvBlock / OvBarProfile render it unchanged. */
function ovBuildGAI(cfg) {
  const years = (window.gaiYears ? window.gaiYears() : []).slice().sort((a, b) => a - b);
  const latestYear = years.length ? years[years.length - 1] : null;
  const rowsRaw = [];
  for (const r of (window.RECS || [])) {
    if (r.p === 'Global AI Index' && r.c === 'Singapore' && r.y === latestYear
        && r.i !== 'Overall' && (r.t === '' || r.t == null) && r.s && r.s !== 'Overall' && r.r != null) {
      const total = window.compareTop ? window.compareTop('Global AI Index', r.i, latestYear, r.s, '', null).length : 0;
      rowsRaw.push({ indicator: r.i + ' · ' + r.s, label: r.s, parent: r.i, sub: r.s,
        color: cfg.barColor, series: [{ y: r.y, r: r.r }], cur: r.r, prev: null, total });
    }
  }
  const rows = rowsRaw.sort((a, b) => a.cur - b.cur);
  return {
    cfg, latestYear, prevYear: null, multiYear: false, hasPrevYear: false, comparable: false, years: [latestYear], allYears: years,
    yearSpan: String(latestYear), rows,
    highlights: ovHighlights(cfg, rows, latestYear, null, false),
  };
}

/* ---------- build the full model for one publication ---------- */
function ovBuildPub(cfg) {
  let pillars = cfg.pillars;
  // determine latest year from the first known pillar (or any record)
  const probe = (pillars && pillars[0]) ? pillars[0].indicator : cfg.pub;
  let years = [];
  for (const r of (window.RECS || [])) {
    if (r.p === cfg.pub && r.s === 'Overall' && (r.t === '' || r.t == null) && r.c === 'Singapore') years.push(r.y);
  }
  years = [...new Set(years)].sort((a, b) => a - b);
  const latestYear = years.length ? years[years.length - 1] : null;
  const prevYear = latestYear != null ? latestYear - 1 : null;
  if (!pillars) pillars = ovDiscoverPillars(cfg.pub, latestYear);

  // pillar rows (rank + YoY) and series
  const rows = pillars.map(p => {
    const s = ovSeries(cfg.pub, p.indicator);
    const cur = s.find(x => x.y === latestYear) || null;
    const prev = s.find(x => x.y === prevYear) || null;
    return {
      indicator: p.indicator, label: p.label, color: p.color, dash: p.dash,
      series: s, cur: cur ? cur.r : null, prev: prev ? prev.r : null,
    };
  }).filter(r => r.cur != null);
  // sort pillars by rank for AI (so bars read best→worst); keep declared order otherwise
  const sortedRows = cfg.chart === 'bar' && cfg.barColor ? [...rows].sort((a, b) => a.cur - b.cur) : rows;

  const multiYear = years.length >= 2;

  // Structural YoY comparability: the previous year is only a valid YoY baseline
  // if it shares the SAME pillar set as the current year. A pillar restructuring
  // (e.g. GARI's 2024 3-pillar → 2025 6-pillar break) makes adjacent years
  // non-comparable, so all YoY wording/arrows on this card fall back to neutral.
  // This is a runtime set comparison — no hardcoded year — so if a future year
  // re-adopts the current pillar set, YoY wording returns automatically.
  const curPillarSet = ovPillarSet(cfg.pub, latestYear);
  const prevPillarSet = ovPillarSet(cfg.pub, prevYear);
  const hasPrevYear = multiYear && prevPillarSet.size > 0;
  const comparable = hasPrevYear
    && curPillarSet.size === prevPillarSet.size
    && [...curPillarSet].every(p => prevPillarSet.has(p));
  // When not structurally comparable, drop each row's prior-year rank so the
  // pillar YoY arrows, the "area to watch" decline and the trend highlight all
  // omit the cross-boundary comparison rather than comparing differently-defined
  // pillars that happen to share (or not share) names across the break.
  if (!comparable) {
    for (const r of rows) r.prev = null;
  }

  // Trend (line) charts show only the 5 most recent years (spec). Equivalent to
  // the Supabase `.order('year',{ascending:false}).limit(5)` then reversed: take
  // the tail of the ascending year list. Single-year pubs (NRI/AI) collapse to 1.
  const chartYears = years.slice(-5);
  const yearSpan = `${chartYears[0]}\u2013${chartYears[chartYears.length - 1]}`;

  return {
    cfg, latestYear, prevYear, multiYear, hasPrevYear, comparable, years: chartYears, allYears: years, yearSpan,
    rows: sortedRows,
    highlights: ovHighlights(cfg, rows, latestYear, prevYear, comparable && multiYear),
  };
}

/* ---------- Strength / Area to watch / Trend ---------- */
function ovHighlights(cfg, rows, latestYear, prevYear, multiYear) {
  const out = {};
  const singlePillar = rows.length === 1;

  // STRENGTH — minimum rank pillar (always shown)
  const best = rows.reduce((a, b) => (b.cur < a.cur ? b : a), rows[0]);
  out.strength = `${best.label} ${singlePillar ? 'leads at' : 'is Singapore\u2019s strongest ' + cfg.short + ' pillar at'} ${best.cur}${ovOrd(best.cur)} globally.`;

  // AREA TO WATCH — worst rank, OR largest single-year decline if more notable
  let decline = null;
  for (const r of rows) {
    if (r.prev != null && r.cur > r.prev) {
      const mag = r.cur - r.prev;
      if (!decline || mag > decline.mag) decline = { r, mag };
    }
  }
  const worst = rows.reduce((a, b) => (b.cur > a.cur ? b : a), rows[0]);
  if (singlePillar) {
    // single pillar (e.g. IMD WCY) — surface the weakest underlying sub-indicator
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

  // TREND — only when ≥2 years of data exist
  if (multiYear) out.trend = ovTrend(rows, latestYear);
  return out;
}

function ovTrend(rows, latestYear) {
  let pick = null; // { type, r, score, ... }
  for (const r of rows) {
    const s = r.series;
    if (s.length < 2) continue;
    const ranks = s.map(x => x.r);
    const bestRank = Math.min(...ranks);
    const bestPt = s.find(x => x.r === bestRank);
    const first = s[0], last = s[s.length - 1];
    // peak-and-drop: best year is not the latest, and it has slipped notably since
    if (bestPt.y !== last.y && last.r - bestRank >= 3) {
      const score = last.r - bestRank;
      if (!pick || score > pick.score) pick = { type: 'peak', r, bestPt, last, score };
      continue;
    }
    // sustained improvement: latest is the best, gained ≥3 places over the span
    if (last.r === bestRank && first.r - last.r >= 3) {
      const score = first.r - last.r;
      if (!pick || score > pick.score) pick = { type: 'improve', r, first, last, score };
      continue;
    }
    // sustained top-tier presence
    if (Math.max(...ranks) <= 3) {
      const score = s.length;
      if (!pick || (pick.type === 'top' && score > pick.score)) pick = pick && pick.type !== 'top' ? pick : { type: 'top', r, first, last, score };
      continue;
    }
    // sustained decline
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

/* ============================================================
   Chart.js line chart (single or multi line, inverted rank axis)
   ============================================================ */
function OvLineChart({ model }) {
  const ref = React.useRef(null);
  const chartRef = React.useRef(null);
  React.useEffect(() => {
    if (!window.Chart || !ref.current) return;
    const cfg = model.cfg;
    const years = model.years;
    const datasets = model.rows.map(r => {
      const map = {}; r.series.forEach(p => { map[p.y] = p.r; });
      return {
        label: r.label,
        data: years.map(y => (map[y] != null ? map[y] : null)),
        borderColor: r.color || cfg.accent,
        backgroundColor: cfg.chart === 'line-single' ? 'rgba(10,110,168,0.07)' : 'transparent',
        fill: cfg.chart === 'line-single',
        borderDash: r.dash || [],
        borderWidth: 2,
        pointRadius: cfg.chart === 'line-single' ? 5 : 4,
        pointHoverRadius: cfg.chart === 'line-single' ? 7 : 6,
        pointBackgroundColor: r.color || cfg.accent,
        pointBorderColor: '#fff',
        pointBorderWidth: 1.5,
        tension: 0.25,
        spanGaps: true,
      };
    });
    // y-axis adapts to the data: min 1, max = highest displayed rank + 1 buffer.
    // (Previously a fixed floor of 5 left a large empty band below top-tier ranks.)
    const shownRanks = model.rows.flatMap(r => r.series.filter(p => years.includes(p.y)).map(p => p.r)).filter(v => v != null);
    const maxRank = (shownRanks.length ? Math.max(...shownRanks) : 4) + 1;
    // Custom plugin: draw the rank value just above every data point, in the
    // line's own colour (10px / 500 / centred), so each node is self-labelling.
    const rankLabels = {
      id: 'rankLabels',
      afterDatasetsDraw(chart) {
        const { ctx } = chart;
        chart.data.datasets.forEach((dataset, i) => {
          const meta = chart.getDatasetMeta(i);
          if (!meta || meta.hidden) return;
          meta.data.forEach((point, j) => {
            const value = dataset.data[j];
            if (value == null) return;
            ctx.save();
            ctx.font = '500 10px ' + getComputedStyle(document.body).fontFamily;
            ctx.fillStyle = dataset.borderColor;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(ovOrd2(value), point.x, point.y - 8);
            ctx.restore();
          });
        });
      },
    };
    chartRef.current = new window.Chart(ref.current.getContext('2d'), {
      type: 'line',
      data: { labels: years, datasets },
      plugins: [rankLabels],
      options: {
        responsive: true, maintainAspectRatio: false,
        layout: { padding: { top: 18, right: 12, bottom: 2, left: 2 } },
        interaction: { mode: 'nearest', intersect: false },
        plugins: {
          legend: {
            display: false, position: 'bottom',
            labels: { boxWidth: 26, boxHeight: 1, font: { size: 11 }, color: '#4b5563', padding: 14, usePointStyle: false },
          },
          tooltip: {
            backgroundColor: '#15233a', padding: 9, cornerRadius: 7, titleFont: { size: 11 }, bodyFont: { size: 11 },
            displayColors: false,
            callbacks: {
              title: items => 'Year ' + items[0].label,
              label: ctx => `${ctx.dataset.label} \u00b7 Rank ${ctx.parsed.y}`,
            },
          },
        },
        scales: {
          y: {
            reverse: true, min: 1, max: maxRank,
            title: { display: true, text: 'Rank', font: { size: 10 }, color: '#94a1b0' },
            ticks: { stepSize: Math.max(1, Math.round(maxRank / 5)), font: { size: 10 }, color: '#94a1b0', precision: 0 },
            grid: { color: 'rgba(16,40,64,0.06)' },
          },
          x: {
            ticks: { font: { size: 10 }, color: '#94a1b0', maxRotation: 0, autoSkipPadding: 12 },
            grid: { display: false },
          },
        },
      },
    });
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [model]);
  if (!window.Chart) return <div className="ov-narr-fallback" style={{ padding: 30, textAlign: 'center' }}>Chart library unavailable.</div>;
  return <div className="ov-canvas-wrap"><canvas ref={ref} /></div>;
}

/* ============================================================
   Horizontal bar profile (NRI / AI) — bars fill full height,
   length = inverse of rank. Hover tooltip "[Pillar] · Rank N".
   ============================================================ */
function OvBarProfile({ model }) {
  const [tip, setTip] = React.useState(null);
  const cfg = model.cfg;
  const rows = model.rows.map(r => {
    const total = (r.total != null) ? r.total : ovTotalCountries(cfg.pub, r.indicator, model.latestYear);
    const pct = total > 1 ? (1 - (r.cur - 1) / (total - 1)) * 100 : 100;
    return { ...r, total, pct: Math.max(8, pct) };
  });
  return (
    <div className="ov-bars">
      {rows.map(r => (
        <div key={r.indicator} className="ov-bar-row">
          <span className="ov-bar-label" title={r.label}>{r.label}</span>
          <div className="ov-bar-track">
            <div className="ov-bar-fill" style={{ width: r.pct + '%', background: cfg.barColor || r.color }}
              onMouseMove={e => setTip({ x: e.clientX, y: e.clientY, t: `${r.label} \u00b7 Rank ${r.cur}` })}
              onMouseLeave={() => setTip(null)}>
              <span className="ov-bar-rank">{r.cur}<sup>{ovOrd(r.cur)}</sup></span>
            </div>
          </div>
        </div>
      ))}
      {tip && window.BodyPortal && (
        <window.BodyPortal>
          <div className="chart-tip" style={{ left: Math.min(tip.x + 14, window.innerWidth - 200), top: tip.y + 14 }}>{tip.t}</div>
        </window.BodyPortal>
      )}
    </div>
  );
}

/* ============================================================
   NRI combo chart (Overview)
   X-axis = years (2021–2025). Grouped BARS for the 4 pillars
   (2022–2025; 2021 is null → no bar), plus a LINE for the
   Overall NRI rank across all years. Y-axis is NOT inverted
   (rank 1 at the bottom), so a shorter bar = a better rank.
   ============================================================ */
const OV_NRI_PILLAR_COLORS = {
  'Technology': '#534AB7', 'People': '#7B72CC', 'Governance': '#9D96D9', 'Impact': '#C0BBE8',
};
const OV_NRI_OVERALL_COLOR = '#3B2F8F';
function ovRgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function OvNRIGroupedChart({ model }) {
  const ref = React.useRef(null);
  const chartRef = React.useRef(null);
  React.useEffect(() => {
    if (!window.Chart || !ref.current) return;
    const years = model.years; // ascending, ≤5 (2021–2025)
    // Overall NRI row (the line) + the 4 pillar rows (the grouped bars)
    const overallRow = model.rows.find(r => r.indicator === 'Network Readiness Index');
    const pillarOrder = ['Technology', 'People', 'Governance', 'Impact'];
    const pillarRows = pillarOrder
      .map(name => model.rows.find(r => r.indicator === name || r.label === name))
      .filter(Boolean);

    const rankFor = (row, yr) => { const p = row.series.find(s => s.y === yr); return p && p.r != null ? p.r : null; };

    // grouped bar datasets — one per pillar; 2021 (or any missing year) → null = no bar
    const barDatasets = pillarRows.map(row => {
      const color = OV_NRI_PILLAR_COLORS[row.indicator] || OV_NRI_PILLAR_COLORS[row.label] || model.cfg.accent;
      return {
        type: 'bar', label: row.label,
        data: years.map(yr => rankFor(row, yr)),
        backgroundColor: ovRgba(color, 0.75), borderColor: color, borderWidth: 1,
        borderRadius: 2, categoryPercentage: 0.78, barPercentage: 0.92, order: 1,
        _labelColor: color,
      };
    });
    // overall NRI line dataset — all years, drawn on top of the bars
    const lineDataset = {
      type: 'line', label: 'Overall NRI',
      data: years.map(yr => (overallRow ? rankFor(overallRow, yr) : null)),
      borderColor: OV_NRI_OVERALL_COLOR, backgroundColor: 'transparent', borderWidth: 2.5,
      pointBackgroundColor: OV_NRI_OVERALL_COLOR, pointBorderColor: '#fff', pointBorderWidth: 1.5,
      pointRadius: 5, pointHoverRadius: 7, tension: 0.25, spanGaps: false, order: 0,
      _labelColor: OV_NRI_OVERALL_COLOR,
    };
    const datasets = [...barDatasets, lineDataset];

    const allVals = datasets.flatMap(d => d.data).filter(v => v != null);
    const maxRank = (allVals.length ? Math.max(...allVals) : 5) + 3; // +3 headroom (spec)

    // ordinal rank label above every bar top and every line point
    const rankLabels = {
      id: 'nriComboLabels',
      afterDatasetsDraw(chart) {
        const { ctx } = chart;
        chart.data.datasets.forEach((dataset, i) => {
          const meta = chart.getDatasetMeta(i);
          if (!meta || meta.hidden) return;
          const isLine = dataset.type === 'line';
          meta.data.forEach((el, j) => {
            const value = dataset.data[j];
            if (value == null) return;
            ctx.save();
            ctx.font = (isLine ? '700 10px ' : '600 9px ') + getComputedStyle(document.body).fontFamily;
            ctx.fillStyle = dataset._labelColor || '#4b5563';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(ovOrd2(value), el.x, el.y - (isLine ? 9 : 4));
            ctx.restore();
          });
        });
      },
    };

    chartRef.current = new window.Chart(ref.current.getContext('2d'), {
      type: 'bar',
      data: { labels: years, datasets },
      plugins: [rankLabels],
      options: {
        responsive: true, maintainAspectRatio: false,
        layout: { padding: { top: 18, right: 8, bottom: 2, left: 2 } },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: false, position: 'bottom',
            labels: { boxWidth: 11, boxHeight: 11, font: { size: 10 }, color: '#4b5563', padding: 12, usePointStyle: false },
          },
          tooltip: {
            backgroundColor: '#15233a', padding: 9, cornerRadius: 7, titleFont: { size: 11 }, bodyFont: { size: 11 },
            callbacks: {
              title: items => 'Year ' + items[0].label,
              label: ctx => ctx.parsed.y == null ? null : `${ctx.dataset.label} · Rank ${ctx.parsed.y}${ovOrd(ctx.parsed.y)}`,
            },
          },
        },
        scales: {
          y: {
            reverse: false, min: 1, max: maxRank,
            title: { display: true, text: 'Rank (lower = better)', font: { size: 10 }, color: '#94a1b0' },
            ticks: { stepSize: 3, font: { size: 10 }, color: '#94a1b0', precision: 0 },
            grid: { color: 'rgba(16,40,64,0.06)' },
          },
          x: {
            ticks: { font: { size: 10.5, weight: '500' }, color: '#4b5563', maxRotation: 0, autoSkip: false },
            grid: { display: false },
          },
        },
      },
    });
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [model]);
  if (!window.Chart) return <div className="ov-narr-fallback" style={{ padding: 30, textAlign: 'center' }}>Chart library unavailable.</div>;
  return <div className="ov-canvas-wrap"><canvas ref={ref} /></div>;
}
/* ordinal that always shows the suffix (e.g. 4 → "4th", 15 → "15th") */
function ovOrd2(n) {
  if (n == null) return '';
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/* ============================================================
   Publication block — single full-width card per publication:
   header → pillar ranks → key highlights → collapsible chart
   ============================================================ */
const OV_CHART_H = { 'line-single': 200, 'line-multi': 220, 'nri-grouped': 260, 'bar': 200 };

/* Custom legend items for multi-series Overview charts (IMD WDC line + NRI combo).
   Single-series / bar charts return null (no legend). */
function ovLegendItems(model) {
  const cfg = model.cfg;
  if (cfg.chart === 'line-multi') {
    return model.rows.map(r => ({ label: r.label, color: r.color || cfg.accent }));
  }
  if (cfg.chart === 'nri-grouped') {
    const order = ['Technology', 'People', 'Governance', 'Impact'];
    const items = order
      .map(name => model.rows.find(r => r.indicator === name || r.label === name))
      .filter(Boolean)
      .map(r => ({ label: r.label, color: OV_NRI_PILLAR_COLORS[r.indicator] || OV_NRI_PILLAR_COLORS[r.label] || cfg.accent }));
    items.push({ label: 'Overall NRI', color: OV_NRI_OVERALL_COLOR });
    return items;
  }
  return null;
}

function OvBlock({ model }) {
  const { cfg } = model;
  const [open, setOpen] = React.useState(false);

  const yearNote = !model.hasPrevYear
    ? `Rankings as of ${model.latestYear} \u00b7 first year tracked \u2014 no YoY available`
    : model.comparable
      ? `Rankings as of ${model.latestYear} \u00b7 YoY change vs ${model.prevYear}`
      : `Rankings as of ${model.latestYear} \u00b7 no YoY change available due to restructuring of pillars`;

  // NRI / AI carry a rank-profile chart; IMD pubs carry a year trend line.
  const isProfile = cfg.chart === 'bar' || cfg.chart === 'nri-grouped';
  const triggerLabel = isProfile ? 'View rank profile chart' : 'View ranking trend chart';
  const chartH = OV_CHART_H[cfg.chart] || 200;

  // Chart titles/subtitles — year ranges derived dynamically from the model.
  const chartTitle = cfg.chart === 'bar'
    ? `${cfg.subject} \u00b7 Singapore rank profile (${model.latestYear})`
    : cfg.chart === 'nri-grouped'
      ? `NRI \u00b7 Singapore ranking trend (${model.yearSpan})`
      : `${cfg.subject} \u00b7 Singapore ranking trend (${model.yearSpan})`;
  const chartSub = cfg.chart === 'nri-grouped'
    ? 'Lower rank = better performance \u00b7 pillar data available from 2022'
    : 'Lower rank = better performance';
  const legend = ovLegendItems(model);

  return (
    <div className="ov-pubcard">
      <div className="ov-pubcard-accent" style={{ background: cfg.accent }} />

      {/* A) header */}
      <div className="ov-pc-header">
        <div className="ov-pc-title">{cfg.full} ({cfg.short})</div>
        <div className="ov-pc-yearnote">{yearNote}</div>
      </div>

      {/* B) pillar ranks row */}
      <div className="ov-pc-ranks">
        {model.rows.map(r => (
          <div key={r.indicator} className="ov-pc-rank">
            <span className="ov-pc-rank-label">{r.label}</span>
            <span className="ov-pc-rank-num">{r.cur}<sup>{ovOrd(r.cur)}</sup></span>
            <span className="ov-pc-rank-yoy">{ovYoY(r, model)}</span>
          </div>
        ))}
      </div>

      {/* C) key highlights */}
      <div className="ov-pc-highlights">
        <div className="ov-pc-hl-label">Key highlights · {model.latestYear}</div>
        <div className="ov-pc-hl-grid">
          <HlCol kind="strength" label="Strength" text={model.highlights.strength} />
          <HlCol kind="watch" label="Area to watch" text={model.highlights.watch} />
          {model.highlights.trend
            ? <HlCol kind="trend" label="Trend" text={model.highlights.trend} />
            : <div className="ov-pc-hl-col placeholder"><span className="ov-pc-hl-empty">No trend data yet</span></div>}
        </div>
      </div>

      {/* D) chart dropdown trigger */}
      <button className={'ov-pc-trigger' + (open ? ' open' : '')} onClick={() => setOpen(o => !o)}
        aria-expanded={open}>
        <span className="ov-pc-trigger-left">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18" /><path d="M7 14l4-4 3 3 5-6" />
          </svg>
          {triggerLabel}
        </span>
        <svg className="ov-pc-chevron" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* E) chart section (mounted only when open → chart destroyed on collapse) */}
      {open && (
        <div className="ov-pc-chart">
          <div className="ov-pc-chart-head">
            <div className="ov-pc-chart-titles">
              <div className="ov-pc-chart-title">{chartTitle}</div>
              <div className="ov-pc-chart-sub">{chartSub}</div>
            </div>
            {legend && (
              <div className="ov-pc-legend">
                {legend.map(it => (
                  <span className="ov-pc-leg" key={it.label}>
                    <span className="ov-pc-leg-sw" style={{ background: it.color }} />
                    {it.label}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="ov-pc-chart-canvas" style={{ height: chartH }}>
            {cfg.chart === 'bar' ? <OvBarProfile model={model} />
              : cfg.chart === 'nri-grouped' ? <OvNRIGroupedChart model={model} />
                : <OvLineChart model={model} />}
          </div>
          <div className="ov-pc-chart-foot">Source: {cfg.short} {model.latestYear} · Classification: Official (Open)</div>
        </div>
      )}
    </div>
  );
}

function ovYoY(r, model) {
  if (!model.multiYear || r.prev == null) return <span className="ov-yoy-flat">{model.latestYear} only</span>;
  if (r.cur < r.prev) return <span className="ov-yoy-up">↑ from {r.prev}{ovOrd(r.prev)} in {model.prevYear}</span>;
  if (r.cur > r.prev) return <span className="ov-yoy-down">↓ from {r.prev}{ovOrd(r.prev)} in {model.prevYear}</span>;
  return <span className="ov-yoy-flat">— unchanged</span>;
}

function HlCol({ kind, label, text }) {
  return (
    <div className="ov-pc-hl-col">
      <span className={'ov-pc-badge ' + kind}>{label}</span>
      <span className="ov-pc-hl-txt">{text}</span>
    </div>
  );
}

/* ============================================================
   AI narrative panel — Claude-generated performance summary
   ============================================================ */
function OvNarrative({ year, contextText, isAdmin, userEmail }) {
  // status: 'loading' | 'ready' | 'failed'
  const [state, setState] = React.useState({ status: 'loading', text: '', updatedAt: null });
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [toast, setToast] = React.useState(null); // { type:'ok'|'err', msg }
  const NARR_KEY = 'overview_narrative';

  const flash = React.useCallback((type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 2800);
  }, []);

  // Format the Supabase updated_at as SGT by parsing the raw ISO string directly
  // (the stored value already carries the +08:00 offset). No Date() timezone
  // conversion — that was shifting the displayed time. → "DD MMM YYYY, HH:MM SGT".
  const fmtSGT = React.useCallback((raw) => {
    if (!raw) return '';
    try {
      const [datePart, timePart] = String(raw).split('T');
      const [y, m, d] = datePart.split('-');
      const time = (timePart || '').substring(0, 5);
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return `${d} ${months[parseInt(m, 10) - 1]} ${y}, ${time} SGT`;
    } catch (e) { return ''; }
  }, []);

  // Call Claude to generate the initial narrative (only used on first load / empty table).
  const generateViaClaude = React.useCallback(async () => {
    if (!window.claude || !window.claude.complete) throw new Error('no-claude');
    const system = "You are a policy analyst writing for a Singapore government digital benchmarking dashboard. "
      + "Write exactly 3 paragraphs of 3 sentences each. Paragraph 1: overall " + year + " digital and AI performance assessment. "
      + "Paragraph 2: key strengths with specific ranks and publication names. "
      + "Paragraph 3: areas needing attention \u2014 specifically highlight any governance gap if it appears across multiple publications. "
      + "No bullet points, headers, or markdown formatting. Reference publication names in full.";
    const reply = await window.claude.complete({
      messages: [{ role: 'user', content: system + "\n\nSingapore's ranking data:\n" + contextText }],
    });
    const text = String(reply || '').trim();
    if (!text) throw new Error('empty');
    return text;
  }, [year, contextText]);

  // Append a new narrative row (full edit history — every save is a new row).
  // updated_at is set automatically by the database (Asia/Singapore). Returns the
  // inserted row so callers can show the authoritative timestamp.
  const insertNarrative = React.useCallback(async (text, by) => {
    if (!window.sb) throw new Error('no-client');
    const { data, error } = await window.sb.from('narratives')
      .insert({ narrative_key: NARR_KEY, narrative_text: text, updated_by: by })
      .select();
    if (error) { console.error('Save error:', error); throw error; }
    return (data && data[0]) || null;
  }, []);

  // Boot load: most-recently-inserted stored narrative first, Claude only if none.
  React.useEffect(() => {
    let alive = true;
    (async () => {
      setState({ status: 'loading', text: '', updatedAt: null });
      // 1) try the latest stored narrative (updated_by is NOT selected — not displayed)
      try {
        if (window.sb) {
          const { data, error } = await window.sb.from('narratives')
            .select('narrative_text, updated_at')
            .eq('narrative_key', NARR_KEY)
            .order('updated_at', { ascending: false })
            .limit(1)
            .single();
          if (!alive) return;
          if (!error && data && data.narrative_text) {
            setState({ status: 'ready', text: data.narrative_text, updatedAt: data.updated_at });
            return;
          }
        }
      } catch (e) { /* fall through to generation */ }
      // 2) nothing stored — generate once, then save the result with updated_by='system'
      try {
        const text = await generateViaClaude();
        if (!alive) return;
        let row = null;
        try { row = await insertNarrative(text, 'system'); } catch (e) { /* display anyway */ }
        if (!alive) return;
        setState({ status: 'ready', text, updatedAt: row && row.updated_at });
      } catch (e) {
        if (!alive) return;
        setState({ status: 'failed', text: '', updatedAt: null });
      }
    })();
    return () => { alive = false; };
  }, [generateViaClaude, insertNarrative]);

  function startEdit() { setDraft(state.text); setEditing(true); }
  function cancelEdit() { setEditing(false); setDraft(''); }
  async function saveEdit() {
    setSaving(true);
    try {
      const row = await insertNarrative(draft, userEmail || null);
      setState({ status: 'ready', text: draft, updatedAt: row && row.updated_at });
      setEditing(false);
      flash('ok', 'Narrative saved');
    } catch (e) {
      flash('err', 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const paras = state.text.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);

  return (
    <div className="ov-narrative">
      {toast && <div className={'ov-narr-toast ' + (toast.type === 'ok' ? 'ok' : 'err')}>{toast.msg}</div>}
      <div className="ov-narr-head">
        <span className="ov-narr-badge">✦ AI-generated narrative</span>
        <span className="ov-narr-title">Performance summary · Singapore · {year}</span>
        {isAdmin && !editing && state.status === 'ready' && (
          <button className="ov-narr-edit" onClick={startEdit} title="Edit narrative" aria-label="Edit narrative">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>
        )}
      </div>

      {state.status === 'loading' ? (
        <div className="ov-narr-loading"><span className="ov-spinner" /> Generating performance summary…</div>
      ) : editing ? (
        <div className="ov-narr-editor">
          <textarea className="ov-narr-textarea" value={draft} onChange={e => setDraft(e.target.value)} />
          <div className="ov-narr-edit-actions">
            <button className="ov-narr-save" onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            <button className="ov-narr-cancel" onClick={cancelEdit} disabled={saving}>Cancel</button>
          </div>
        </div>
      ) : state.status === 'failed' ? (
        <div className="ov-narr-body"><p className="ov-narr-fallback">Unable to generate narrative \u2014 API connection required.</p></div>
      ) : (
        <div className="ov-narr-body">{paras.map((p, i) => <p key={i}>{p}</p>)}</div>
      )}
      {!editing && state.status === 'ready' && state.updatedAt && (
        <div className="ov-narr-meta">Last edited at {fmtSGT(state.updatedAt)}</div>
      )}
      {/* always-visible disclaimer (loading / loaded / fallback / edit all show this) */}
      <div className="ov-narr-disclaimer">Note: Generated AI narrative may be subjected to errors or hallucinations.</div>
    </div>
  );
}

/* ============================================================
   OVERVIEW VIEW — assembles domains, blocks, narrative, footer
   ============================================================ */
function OverviewView({ isAdmin, userEmail }) {
  const models = React.useMemo(() => {
    const byDomain = {};
    for (const domain of Object.keys(OV_PUBS)) {
      byDomain[domain] = OV_PUBS[domain].map(cfg => cfg.gaiSub ? ovBuildGAI(cfg) : ovBuildPub(cfg)).filter(m => m.rows.length);
    }
    return byDomain;
  }, []);

  const latestYear = React.useMemo(() => {
    let y = 2025;
    for (const d of Object.values(models)) for (const m of d) if (m.latestYear) y = Math.max(y, m.latestYear);
    return y;
  }, [models]);

  const narrativeContext = React.useMemo(() => {
    const lines = [];
    for (const domain of Object.keys(models)) {
      for (const m of models[domain]) {
        lines.push(`${m.cfg.full} (${m.cfg.short}), ${m.latestYear}:`);
        for (const r of m.rows) {
          const yo = (m.multiYear && r.prev != null) ? ` (was ${r.prev}${ovOrd(r.prev)} in ${m.prevYear})` : '';
          lines.push(`  - ${r.label}: ${r.cur}${ovOrd(r.cur)}${yo}`);
        }
      }
    }
    return lines.join('\n');
  }, [models]);

  const lastUpdated = window.lastUpdatedStr ? window.lastUpdatedStr() : 'Last updated: \u2014';

  return (
    <div className="site">
      <OvNarrative year={latestYear} contextText={narrativeContext} isAdmin={isAdmin} userEmail={userEmail} />

      {Object.keys(OV_PUBS).map(domain => (
        <div className="ov-domain" key={domain}>
          <div className="ov-domain-head" style={{ '--dc': OV_DOMAIN_COLOR[domain] }}>
            <span className="ov-domain-name">{domain}</span>
            <span className="ov-domain-rule" />
          </div>
          {models[domain].map(m => <OvBlock key={m.cfg.pub} model={m} />)}
        </div>
      ))}

      <div className="ov-foot">
        <span className="ov-foot-class">Classification: Official (Open)</span>
        <span className="ov-foot-updated">{lastUpdated}</span>
      </div>
    </div>
  );
}

Object.assign(window, { OverviewView, OvBlock, OvNarrative });

/* ============================================================
   DASHDE — Overall – IMD page
   Two publication sections (IMD WCY, IMD WDC), each:
     section divider · main card · filter bar · country rank chart.
   Then one global page footer. Reads live international_benchmarks
   via the shared helpers (indicator='Overall', sub_indicator='Overall').
   Self-contained: each section owns its Year / Country / view state.
   ============================================================ */

const OVERALL_DEF_FALLBACK = {
  'IMD WCY': 'The overall World Competitiveness ranking assesses how an economy manages its competencies to achieve long-term value creation, spanning economic performance, government efficiency, business efficiency and infrastructure.',
  'IMD WDC': 'The overall World Digital Competitiveness ranking measures the capacity and readiness of an economy to adopt and explore digital technologies as a key driver of economic transformation, across the knowledge, technology and future-readiness factors.',
};

const OVERALL_DIVIDER_LABEL = {
  'IMD WCY': 'IMD World Competitiveness Yearbook (IMD WCY)',
  'IMD WDC': 'IMD World Digital Competitiveness Ranking (IMD WDC)',
};

/* ---------- compact ranking sparkline (160×80, flag nodes, gradient fill) ---------- */
function OverallSparkline({ series, country, color, idp }) {
  const pts = (series || []).filter(p => p.r != null).slice(-8);
  const W = 160, H = 80, pl = 22, pr = 22, ptop = 22, pbot = 22, RAD = 9;
  if (!pts.length) return <div style={{ width: W, height: H }} />;
  const ranks = pts.map(p => p.r);
  const rMin = 1, rMax = Math.max(2, ...ranks);
  const x = i => pts.length === 1 ? W / 2 : pl + (i / (pts.length - 1)) * (W - pl - pr);
  const y = r => rMax === rMin ? ptop + (H - ptop - pbot) / 2 : ptop + ((r - rMin) / (rMax - rMin)) * (H - ptop - pbot);
  const flag = flagUrl(country);
  const baseY = H - pbot;
  const linePath = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.r)}`).join(' ');
  const areaPath = `M${x(0)},${baseY} ` + pts.map((p, i) => `L${x(i)},${y(p.r)}`).join(' ') + ` L${x(pts.length - 1)},${baseY} Z`;
  return (
    <svg width={W} height={H} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={idp + 'g'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.24" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        {pts.map((p, i) => <clipPath id={idp + 'c' + i} key={i}><circle cx={x(i)} cy={y(p.r)} r={RAD} /></clipPath>)}
      </defs>
      {pts.length > 1 && <path d={areaPath} fill={`url(#${idp}g)`} />}
      {pts.length > 1 && <path d={linePath} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />}
      {pts.map((p, i) => {
        const latest = i === pts.length - 1;
        return (
          <g key={i}>
            {flag && <image href={flag} x={x(i) - RAD} y={y(p.r) - RAD} width={RAD * 2} height={RAD * 2} clipPath={`url(#${idp}c${i})`} preserveAspectRatio="xMidYMid slice" />}
            <circle cx={x(i)} cy={y(p.r)} r={RAD} fill={flag ? 'none' : color} stroke="#fff" strokeWidth={latest ? 2 : 1} />
            <circle cx={x(i)} cy={y(p.r)} r={RAD + 0.5} fill="none" stroke={color} strokeWidth={latest ? 1.3 : 0.7} opacity={latest ? 1 : 0.5} />
            <text x={(window.clampLabelX || ((c)=>c))(x(i), `${p.r}${ordinal(p.r)}`, 9, W)} y={y(p.r) - RAD - 4} textAnchor="middle" style={{ fontSize: 9, fontWeight: 600, fill: 'var(--color-text-secondary)' }}>{p.r}{ordinal(p.r)}</text>
            <text x={(window.clampLabelX || ((c)=>c))(x(i), p.y, 8, W)} y={H - 5} textAnchor="middle" style={{ fontSize: 8, fill: 'var(--color-text-tertiary)' }}>{p.y}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ---------- main card (horizontal) ---------- */
function OverallMainCard({ pub, country, year }) {
  const color = PUB_COLOR[pub];
  const series = overallSeries(pub, 'Overall', country);
  const cur = series.find(r => r.y === year) || null;
  const prev = series.find(r => r.y === year - 1) || null;
  const def = defOf(pub, 'Overall', 'Overall', '') || OVERALL_DEF_FALLBACK[pub] || '';
  const yoy = rankYoYText(cur, prev);
  const recent5 = series.filter(r => r.y <= year).slice(-5);
  const startY = recent5.length ? recent5[0].y : year;
  const endY = recent5.length ? recent5[recent5.length - 1].y : year;
  return (
    <div className="panel header-card imd-header ov-imd-card">
      <div className="hc-accent" style={{ background: color }} />
      <div className="hc-left">
        <div className="hc-eyebrow">Digital Economy · Publication · Overall</div>
        <div className="hc-name"><span style={{ color }}>{PUB_FULL[pub]}</span> <span className="hc-country" style={{ color }}>· {country}</span></div>
        {def && <div className="hc-def">{def}</div>}
        <div className="hc-source"><SourceLink pub={pub} label={PUB_SHORT[pub]} /> · IMD · Annual</div>
        <div className="ov-imd-datanote">* Overall rank data available from 2024</div>
      </div>
      <div className="hc-rank">
        <div className="rank-line">
          <span className="rank-number">{cur && cur.r != null ? cur.r : '—'}</span>
          {cur && cur.r != null && <sup className="rank-ordinal">{ordinal(cur.r)}</sup>}
        </div>
        <div className="hc-block-label">Overall rank · {year}</div>
        <div className={'hc-yoy ' + yoy.cls}>{yoy.arrow && <span>{yoy.arrow}</span>}<span>{yoy.txt}</span></div>
      </div>
      <div className="hc-trend">
        <div className="hc-trend-label">Ranking trend · {startY}–{endY}</div>
        <RankTrendChart series={recent5} country={country} color={color} />
      </div>
    </div>
  );
}

/* ---------- one publication section ---------- */
function OverallPubSection({ pub }) {
  const years = imdOverallYears(pub);
  const [year, setYear] = React.useState(years[0] || 2025);
  const [country, setCountry] = React.useState('Singapore');
  const [view, setView] = React.useState('all'); // 'all' | 'sg'
  const color = PUB_COLOR[pub];

  const ranked = compareTop(pub, 'Overall', year, 'Overall', '', null); // every ranked country, asc
  const countryOpts = React.useMemo(
    () => ranked.map(r => r.country).sort((a, b) => a.localeCompare(b)),
    [pub, year, ranked.length]
  );

  // keep the focus country valid when the year changes
  React.useEffect(() => {
    if (ranked.length && !ranked.some(r => r.country === country)) {
      setCountry(ranked.some(r => r.country === 'Singapore') ? 'Singapore' : ranked[0].country);
    }
  }, [year]); // eslint-disable-line

  const all = view === 'all';
  const rows = all ? ranked : compareWindow(pub, 'Overall', year, 'Overall', '', country || 'Singapore');

  function reset() { setView('all'); setCountry('Singapore'); }

  return (
    <div className="ov-imd-section">
      <div className="ov-imd-divider">
        <span className="ov-imd-divider-label" style={{ color }}>{OVERALL_DIVIDER_LABEL[pub]}</span>
      </div>

      <OverallMainCard pub={pub} country={country} year={year} />

      {/* filter bar */}
      <div className="panel filterbar ov-imd-filter">
        <div className="flt">
          <label className="flt-label">Year</label>
          <div className="flt-select-wrap">
            <select className="flt-select" value={year} onChange={e => setYear(Number(e.target.value))}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <svg className="flt-caret" width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="#6B7280" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
        </div>
        <div className="flt">
          <label className="flt-label">Country</label>
          <div className="flt-select-wrap">
            <select className="flt-select" value={country} onChange={e => setCountry(e.target.value)}>
              {countryOpts.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <svg className="flt-caret" width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="#6B7280" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
        </div>
        <span className="ov-imd-hint">Click a country bar to switch focus · Hover over a bar for score details</span>
      </div>

      {/* country rank comparison chart */}
      <div className="panel ov-imd-chart">
        <div className="panel-head panel-head-row">
          <div className="ph-titles">
            <div className="panel-title">{PUB_SHORT[pub]} – Overall Country Rank Comparison ({year})</div>
            <div className="panel-sub">Click a country bar to switch focus · Hover over a bar for score details</div>
          </div>
          <div className="chart-head-ctrls">
            <ChartResetButton onReset={reset} />
            <ChartViewControl view={view} onView={setView} count={all ? rows.length : null} />
          </div>
        </div>
        <div className="panel-body">
          <CountryBarChart rows={rows} selectedCountry={country} onPick={setCountry} fixedRows={all} />
        </div>
        <ClassFoot pub={pub} year={year} />
      </div>
    </div>
  );
}

function OverallIMDView() {
  return (
    <>
      <OverallPubSection pub="IMD WCY" />
      <OverallPubSection pub="IMD WDC" />
      <div className="ov-imd-foot">
        <div className="ov-imd-foot-class">Classification: Official (Open)</div>
        <div className="ov-imd-foot-updated">{window.lastUpdatedStr ? window.lastUpdatedStr() : ''}</div>
      </div>
    </>
  );
}

Object.assign(window, { OverallIMDView, OverallPubSection, OverallMainCard, OverallSparkline });

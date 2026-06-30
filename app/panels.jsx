/* ============================================================
   DASHDE — panels & shared UI (scrollable rebuild)
   ClassFoot · PillarHeaderCard · FilterBar · ChartPanel
   ============================================================ */

/* Fallback pillar context (used only if the Overall row has no definition). */
const PILLAR_CONTEXT = {
  'tech-infra': 'Captures the technological infrastructure enabling digital competitiveness — telecommunications investment, mobile and wireless networks, internet bandwidth and secure servers. A sub-factor of the IMD World Competitiveness Yearbook.',
  'knowledge': 'Measures the intangible infrastructure underpinning digital transformation — talent, training & education, and scientific concentration. One of three factors in the IMD World Digital Competitiveness Ranking.',
  'technology': 'Assesses the overall context enabling development of digital technologies — regulatory framework, capital availability, and the technological framework. A factor of the IMD World Digital Competitiveness Ranking.',
  'future': 'Gauges a society\'s preparedness to exploit digital transformation — adaptive attitudes, business agility, and IT integration. A factor of the IMD World Digital Competitiveness Ranking.',
  'nri': 'A holistic measure of network readiness across four pillars — Technology, People, Governance and Impact — assessing how economies leverage information and communication technologies. Published by the Portulans Institute.',
  'gai': 'Benchmarks national capacity for artificial intelligence across three dimensions — Implementation, Innovation and Investment — spanning talent, infrastructure, the operating environment, research, development, government strategy and commercial activity. Published by Tortoise Media.',
};

/* ---------- linked publication short-name (source line) ---------- */
function SourceLink({ pub, label }) {
  const url = (window.PUB_URL && window.PUB_URL[pub]) || null;
  const text = label || (window.PUB_SHORT && window.PUB_SHORT[pub]) || pub;
  const color = (window.PUB_COLOR && window.PUB_COLOR[pub]) || 'inherit';
  if (!url) return <span>{text}</span>;
  return <a className="src-link" style={{ color }} href={url} target="_blank" rel="noopener noreferrer">{text}</a>;
}

/* ---------- reset icon button (ti-refresh) for chart panel headers ---------- */
function ChartResetButton({ onReset }) {
  return (
    <button type="button" className="chart-reset-btn" title="Reset chart" aria-label="Reset chart" onClick={onReset}>
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" />
        <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />
      </svg>
    </button>
  );
}

/* ---------- All / Singapore view dropdown for rank-comparison charts ---------- */
function ChartViewControl({ view, onView, count }) {
  return (
    <div className="chart-view-ctrl">
      <div className="cvc-select-wrap">
        <select className="cvc-select" value={view} onChange={e => onView(e.target.value)} aria-label="Country view">
          <option value="all">All</option>
          <option value="sg">Singapore</option>
        </select>
        <svg className="cvc-caret" width="9" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="#6B7280" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
      {count != null && <div className="cvc-count">Showing {count} countries</div>}
    </div>
  );
}

/* ---------- classification footer (every panel) ---------- */
function ClassFoot({ pub, year }) {
  return (
    <div className="class-foot">
      <span>Classification: Official (Open)</span>
      <span className="cf-src">Source: {(window.PUB_SHORT && window.PUB_SHORT[pub]) || pub}{year ? ' ' + year : ''}</span>
    </div>
  );
}

/* ---------- rank YoY helper ---------- */
function rankYoYText(cur, prev) {
  if (!prev || prev.r == null || cur == null || cur.r == null) return { cls: 'yoy-neutral', arrow: '', txt: 'No prior-year ranking' };
  const d = prev.r - cur.r; // positive = improved (rank fell)
  if (d > 0) return { cls: 'yoy-up', arrow: '↑', txt: `from ${prev.r}${ordinal(prev.r)} in ${prev.y}` };
  if (d < 0) return { cls: 'yoy-down', arrow: '↓', txt: `from ${prev.r}${ordinal(prev.r)} in ${prev.y}` };
  return { cls: 'yoy-neutral', arrow: '—', txt: `unchanged from ${prev.y}` };
}

/* ---------- pillar header card (IMD WCY / WDC) ---------- */
function PillarHeaderCard({ domain, pillar, country, year, data }) {
  const cur = data.cur, prev = data.prev;
  const def = defOf(pillar.pub, pillar.indicator, 'Overall', '') || PILLAR_CONTEXT[pillar.id] || '';
  const yoy = rankYoYText(cur, prev);
  const trend = (data.recent5 || []).filter(p => p.r != null);
  const startY = trend.length ? trend[0].y : year;
  const endY = trend.length ? trend[trend.length - 1].y : year;
  return (
    <div className="panel header-card imd-header">
      <div className="hc-accent" style={{ background: PUB_COLOR[pillar.pub] }} />
      <div className="hc-left">
        <div className="hc-eyebrow">{domain} · {pillar.pub} Pillar</div>
        <div className="hc-name">{(() => { const ic = window.ovIcon ? (window.ovIcon(pillar.pub, pillar.indicator) || window.ovIcon(pillar.pub, pillar.tab)) : ''; return ic ? <span aria-hidden="true" style={{ marginRight: 7 }}>{ic}</span> : null; })()}{pillar.tab} <span className="hc-country" style={{ color: PUB_COLOR[pillar.pub] }}>· {country}</span></div>
        {def && <div className="hc-def">{def}</div>}
        <div className="hc-source"><SourceLink pub={pillar.pub} /> · IMD · Annual</div>
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
        <RankTrendChart series={data.recent5} country={country} />
      </div>
    </div>
  );
}

/* ---------- horizontal filter bar ---------- */
function FilterBar({ years, countries, year, country, onYear, onCountry, yearLocked, note, hint,
                     pillarOptions, pillarValue, onPillar,
                     subPillarOptions, subPillarValue, onSubPillar }) {
  return (
    <div className="panel filterbar">
      <div className="flt">
        <label className="flt-label">Year</label>
        <div className="flt-select-wrap">
          <select className="flt-select" value={year} disabled={yearLocked} onChange={e => onYear(Number(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <svg className="flt-caret" width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="#6B7280" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
      </div>
      <div className="flt">
        <label className="flt-label">Country</label>
        <div className="flt-select-wrap">
          <select className="flt-select" value={country} onChange={e => onCountry(e.target.value)}>
            {countries.map(c => <option key={c.country} value={c.country}>{c.country}</option>)}
          </select>
          <svg className="flt-caret" width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="#6B7280" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
      </div>
      {pillarOptions && (
        <div className="flt">
          <label className="flt-label">Pillar</label>
          <div className="flt-select-wrap">
            <select className="flt-select" value={pillarValue} onChange={e => onPillar(e.target.value)}>
              {pillarOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <svg className="flt-caret" width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="#6B7280" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
        </div>
      )}
      {subPillarOptions && (
        <div className="flt">
          <label className="flt-label">Sub-Pillars</label>
          <div className="flt-select-wrap">
            <select className="flt-select" value={subPillarValue} onChange={e => onSubPillar(e.target.value)}>
              <option value="all">All Sub-Pillars</option>
              {subPillarOptions.map(s => <option key={s} value={s}>{(window.NRI_SUBLABEL && window.NRI_SUBLABEL[s]) || s}</option>)}
            </select>
            <svg className="flt-caret" width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="#6B7280" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
        </div>
      )}
      {note && <span className="flt-note">{note}</span>}
      {hint !== false && <span className="flt-hint"><span className="flt-hint-ic">i</span> {hint || 'Click a country bar to switch the focus country'}</span>}
    </div>
  );
}

/* ---------- left chart panel (IMD) ----------
   Shows the overall pillar Top-10 country comparison, and updates to the selected
   sub-indicator's country comparison when a table row is clicked. The Top 10 / All
   dropdown switches between the leading 10 countries and every ranked country. */
function ChartPanel({ pillar, country, year, data, onPickCountry, selectedSub, onReset }) {
  const [view, setView] = React.useState('all');
  React.useEffect(() => { setView('all'); }, [pillar.id]);
  function resetChart() {
    setView('all');
    if (onReset) onReset();
  }
  const sub = selectedSub ? selectedSub.sub : 'Overall';
  const third = selectedSub ? selectedSub.third : '';
  const all = view === 'all';
  const rows = all
    ? compareTop(pillar.pub, pillar.indicator, year, sub, third, null)
    : compareWindow(pillar.pub, pillar.indicator, year, sub, third, 'Singapore');
  const scope = all ? 'All' : 'Singapore';
  const title = selectedSub
    ? <><span className="ind-chip">{selectedSub.label}</span> · {scope} Country Rank Comparison</>
    : `${pillar.tab} – ${scope} Country Rank Comparison (${year})`;
  return (
    <div className="panel">
      <div className="panel-head panel-head-row">
        <div className="ph-titles">
          <div className="panel-title">{title}</div>
          <div className="panel-sub">Click a country bar to switch focus · Hover over a bar for score details</div>
        </div>
        <div className="chart-head-ctrls">
          <ChartResetButton onReset={resetChart} />
          <ChartViewControl view={view} onView={setView} count={all ? rows.length : null} />
        </div>
      </div>
      <div className={'panel-body' + (all ? ' body-scroll' : '')}>
        <CountryBarChart rows={rows} selectedCountry={country} onPick={onPickCountry} fixedRows={all} />
      </div>
      <ClassFoot pub={pillar.pub} year={year} />
    </div>
  );
}

Object.assign(window, { ClassFoot, PillarHeaderCard, FilterBar, ChartPanel, ChartViewControl, ChartResetButton, SourceLink, rankYoYText, PILLAR_CONTEXT });

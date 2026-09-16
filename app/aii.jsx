/* ============================================================
   DASHDE — AII (Artificial Intelligence Index · Stanford HAI)
   Score-based with per-row ranks: every value is a `score` with
   its own `unit` — never compare across units on one chart — and
   each row carries a published rank; breakdown parents get a
   derived rank (average of component scores, marked *). No
   overall country rank exists, so the header is a single
   descriptive card (no rank box), and the drill-in below is a
   country-comparison bar chart (same unit only) + a
   sub-indicator table with rank + score for the selected and
   previous year.
   ============================================================ */
const AII_ACCENT = '#0F766E';
const AII_DARK = '#0D5E57';

function AIIPageFoot() {
  return (
    <div className="ov-imd-foot">
      <div className="ov-imd-foot-class">Classification: Official (Open)</div>
      <div className="ov-imd-foot-updated">{window.lastUpdatedStr ? window.lastUpdatedStr() : ''}</div>
    </div>
  );
}
function truncateBadge(name, maxChars = 30) { return name && name.length > maxChars ? name.slice(0, maxChars) + '\u2026' : (name || ''); }
/* strip year / year-range info (e.g. ", 2014-2024", "(average 2017-2019)",
   "(2024)") from a sub-indicator name for badge display \u2014 keep everything else. */
function stripYearInfo(name) {
  return (name || '')
    .replace(/\(\s*(?:average\s+)?(?:19|20)\d{2}(?:\s*[-\u2013\u2014]\s*(?:19|20)\d{2})?\s*\)/gi, '')
    .replace(/[,;\u00b7]\s*(?:19|20)\d{2}(?:\s*[-\u2013\u2014]\s*(?:19|20)\d{2})?/g, '')
    .replace(/\s+(?:19|20)\d{2}\s*[-\u2013\u2014]\s*(?:19|20)\d{2}\s*$/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/[,;\u00b7\s]+$/, '')
    .trim();
}
function aiiArrow(cur, prev) {
  if (cur == null) return null;
  if (prev == null) return <span className="td-arrow muted"> —</span>;
  if (cur > prev) return <span className="td-arrow" style={{ color: 'var(--color-up)' }}> ↑</span>;
  if (cur < prev) return <span className="td-arrow" style={{ color: 'var(--color-down)' }}> ↓</span>;
  return <span className="td-arrow muted"> —</span>;
}
function aiiYoYCell(cur, prev) {
  if (cur == null || prev == null) return <span className="muted">—</span>;
  const d = Math.round((cur - prev) * 1000) / 1000;
  if (d > 0) return <span style={{ color: 'var(--color-up)' }}>↑ {fmtScore(d)}</span>;
  if (d < 0) return <span style={{ color: 'var(--color-down)' }}>↓ {fmtScore(Math.abs(d))}</span>;
  return <span className="muted">—</span>;
}
/* rank cell: published rank as e.g. "5th"; derived indicator-level ranks
   (computed from average component scores) carry a "*" tied to the note. */
function aiiRankCell(rank, derived) {
  if (rank == null) return <span className="muted">—</span>;
  return <>{rank}<span className="muted" style={{ fontSize: '0.85em' }}>{ordinal(rank)}</span>{derived ? <span className="muted">*</span> : null}</>;
}
/* YoY change of RANK (not score): rank going DOWN is an improvement. */
function aiiRankYoY(rank, prevRank) {
  if (rank == null || prevRank == null) return <span className="muted">—</span>;
  const d = prevRank - rank;
  if (d > 0) return <span style={{ color: 'var(--color-up)' }}>↑{d}</span>;
  if (d < 0) return <span style={{ color: 'var(--color-down)' }}>↓{Math.abs(d)}</span>;
  return <span className="muted">—</span>;
}
function aiiBarLabelColor(pct) { return pct < 30 ? '#111827' : '#FFFFFF'; }
const AII_BREAKDOWN_PALETTE = ['#0F766E', '#14B8A6', '#5EEAD4', '#2DD4BF', '#0D9488', '#99F6E4', '#134E4A', '#6EE7B7', '#0891B2', '#155E63', '#67E8F9', '#083344', '#A7F3D0', '#064E3B'];
function aiiBreakdownColor(i) { return AII_BREAKDOWN_PALETTE[i % AII_BREAKDOWN_PALETTE.length]; }
function AIIBreakdownLegend({ categories }) {
  return <div className="aii-legend">{categories.map((cat, i) => <span key={cat} className="aii-legend-item"><span className="aii-legend-swatch" style={{ background: aiiBreakdownColor(i) }} />{cat}</span>)}</div>;
}
/* grouped chart — bars plot the published component RANKS (1st = longest bar,
   never scores; the score appears only in the hover tooltip). Each country row
   leads with its derived indicator rank (*, average of component scores) and
   the YoY change of that rank where available. */
function AIIGroupedChart({ data, selectedCountry, onPick }) {
  if (!data || !data.countries.length) return <div className="es-sub" style={{ padding: '30px 0', textAlign: 'center' }}>No comparison data available for this sub-indicator.</div>;
  const hasYoY = data.countries.some(c => { const d = data.derived.get(c); return d && d.prevRank != null; });
  return (
    <div className="barchart barchart-scroll">
      <AIIBreakdownLegend categories={data.categories} />
      {data.countries.map(c => {
        const d = data.derived.get(c) || { rank: null, prevRank: null };
        return (
          <div key={c} className={'aii-group-row' + (c === selectedCountry ? ' selected' : '')} onClick={onPick ? () => onPick(c) : undefined}>
            <span className="bar-rank" title="Derived indicator rank (average of component scores)">{d.rank != null ? <>{d.rank}{ordinal(d.rank)}<span className="muted">*</span></> : <span className="muted">—</span>}</span>
            {hasYoY && <span className="aii-yoy-left" title="YoY change of derived indicator rank">{aiiRankYoY(d.rank, d.prevRank)}</span>}
            <span className="bar-flag" title={flagUrl(c) ? undefined : c}>{flagUrl(c) ? <img src={flagUrl(c)} alt="" onError={e => e.currentTarget.remove()} /> : null}</span>
            <span className="aii-group-name">{c}</span>
            <div className="aii-group-bars">
              {data.categories.map((cat, i) => {
                const cell = data.byCountry.get(c).get(cat);
                const rank = cell ? cell.rank : null;
                const mr = Math.max(1, data.maxRank.get(cat) || 1);
                const pct = rank != null ? Math.max(8, ((mr - rank + 1) / mr) * 100) : 0;
                const inside = pct > 30;
                const label = rank != null ? rank + ordinal(rank) : null;
                const tip = cat + ': ' + (rank != null ? 'rank ' + rank + ordinal(rank) : 'no rank') + (cell && cell.score != null ? ' · score ' + fmtScore(cell.score) : '');
                return (
                  <div key={cat} className="aii-group-bar-track" title={tip}>
                    <div className="aii-group-bar-fill" style={{ width: pct + '%', background: aiiBreakdownColor(i) }}>
                      {label && inside && <span className="aii-group-bar-label inside">{label}</span>}
                    </div>
                    {label && !inside && <span className="aii-group-bar-label outside">{label}</span>}
                  </div>
                ); })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
function aiiAbbrevCol(name, max = 15) { return name && name.length > max ? name.slice(0, max) + '…' : (name || ''); }
/* scorecard (>5 categories) — cells show the published component RANKS (score
   only in the hover tooltip). Rows are ordered by the derived indicator rank
   (*, average of component scores), shown with its YoY change where available. */
function AIIScorecardTable({ data, selectedCountry, onPick }) {
  if (!data || !data.countries.length) return <div className="es-sub" style={{ padding: '30px 0', textAlign: 'center' }}>No comparison data available for this sub-indicator.</div>;
  const hasYoY = data.countries.some(c => { const d = data.derived.get(c); return d && d.prevRank != null; });
  const rows = data.countries.map(c => ({ country: c, derived: data.derived.get(c) || { rank: null, prevRank: null }, cells: data.categories.map(cat => data.byCountry.get(c).get(cat)) }));
  return (
    <div className="subtable-wrap aii-scorecard-wrapper">
      <table className="aii-scorecard-table">
        <thead><tr><th title="Derived indicator rank (average of component scores)">Rank*</th>{hasYoY && <th title="YoY change of derived indicator rank">YoY</th>}<th>Country</th>{data.categories.map(cat => <th key={cat} title={cat}>{aiiAbbrevCol(cat)}</th>)}</tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.country} className={r.country === selectedCountry ? 'selected-country' : ''} onClick={onPick ? () => onPick(r.country) : undefined}>
              <td style={{ textAlign: 'right' }}>{r.derived.rank != null ? <>{r.derived.rank}{ordinal(r.derived.rank)}</> : <span className="muted">—</span>}</td>
              {hasYoY && <td style={{ textAlign: 'right' }}>{aiiRankYoY(r.derived.rank, r.derived.prevRank)}</td>}
              <td>{r.country}</td>
              {r.cells.map((cell, i) => <td key={i} title={cell && cell.score != null ? 'Score: ' + fmtScore(cell.score) : undefined}>{cell && cell.rank != null ? cell.rank + ordinal(cell.rank) : '—'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


/* left panel: country comparison bar chart, same-unit only. Bars plot the
   published RANK (1st = longest bar), never the score — the score appears only
   in the hover tooltip. The YoY change of the rank sits on the LEFT of each
   bar where a previous-year rank is available. */
function AIICompareChart({ rows, selectedCountry, onPick }) {
  const ranked = rows.filter(r => r.rank != null);
  if (!ranked.length) return <div className="es-sub" style={{ padding: '30px 0', textAlign: 'center' }}>No comparison data available for this sub-indicator.</div>;
  const maxRank = Math.max(1, ...ranked.map(r => r.rank));
  const hasYoY = ranked.some(r => r.prevRank != null);
  return (
    <div className="barchart barchart-scroll">
      {hasYoY && <div className="bar-chart-yoy-header aii-yoy-hdr-left">YoY rank</div>}
      {ranked.map(r => {
        const hi = r.country === selectedCountry;
        const pct = Math.max(6, ((maxRank - r.rank + 1) / maxRank) * 100);
        const tip = 'Rank ' + r.rank + ordinal(r.rank) + (r.prevRank != null ? ' (' + r.prevRank + ordinal(r.prevRank) + ' last year)' : '') + (r.score != null ? ' · score ' + fmtScore(r.score) + (r.unit ? ' ' + r.unit : '') : '');
        return (
          <div key={r.country} className={'bar-row' + (hi ? ' selected' : '')} onClick={onPick ? () => onPick(r.country) : undefined}>
            <span className="bar-rank">{r.rank}{ordinal(r.rank)}</span>
            {hasYoY && <span className="aii-yoy-left" title="YoY change of rank">{aiiRankYoY(r.rank, r.prevRank)}</span>}
            <div className="bar-track" title={tip}>
              <div className="bar-fill" style={{ width: pct + '%', background: hi ? 'var(--color-brand-navy)' : 'var(--color-bar-other)' }} />
              <span className={'bar-name' + (hi ? ' me' : '')} style={{ color: aiiBarLabelColor(pct), fontWeight: hi ? 700 : 600, textShadow: aiiBarLabelColor(pct) === '#FFFFFF' ? '0 1px 2px rgba(0,0,0,0.42)' : 'none' }}>{r.country}</span>
            </div>
            <span className="bar-flag" title={flagUrl(r.country) ? undefined : r.country}>{flagUrl(r.country) ? <img src={flagUrl(r.country)} alt="" onError={e => e.currentTarget.remove()} /> : null}</span>
          </div>
        );
      })}
    </div>
  );
}

function AIIView({ domain, initialPillar }) {
  const years = React.useMemo(() => aiiYears(), []);
  const [year, setYear] = React.useState(years[0] || 2025);
  const countryOpts = React.useMemo(() => aiiCountries(year), [year]);
  const [country, setCountry] = React.useState(countryOpts.includes('Singapore') ? 'Singapore' : (countryOpts[0] || 'Singapore'));
  React.useEffect(() => {
    if (!countryOpts.includes(country)) setCountry(countryOpts.includes('Singapore') ? 'Singapore' : (countryOpts[0] || 'Singapore'));
  }, [year]); // eslint-disable-line

  const pillarOpts = React.useMemo(() => aiiPillars(year), [year]);
  const [selPillar, setSelPillar] = React.useState((initialPillar && pillarOpts.includes(initialPillar)) ? initialPillar : pillarOpts[0]);
  React.useEffect(() => { if (!pillarOpts.includes(selPillar)) setSelPillar(pillarOpts[0]); }, [pillarOpts]); // eslint-disable-line
  React.useEffect(() => { if (initialPillar && pillarOpts.includes(initialPillar)) setSelPillar(initialPillar); }, [initialPillar]); // eslint-disable-line

  const cards = React.useMemo(() => aii2025Cards(country, year), [country, year]);
  const grouped = React.useMemo(() => aiiSubTableGrouped(selPillar, country, year), [selPillar, country, year]);
  const [expanded, setExpanded] = React.useState(() => new Set());
  React.useEffect(() => { setExpanded(new Set()); }, [selPillar, country, year]);
  const [selSub, setSelSub] = React.useState(null);
  const [selThird, setSelThird] = React.useState(null);
  const [infoRow, setInfoRow] = React.useState(null);
  function aiiDef(sub, third) { return (window.DEFS || {})[`${AII_PUB}||${selPillar}||${sub || ''}||${third || ''}`] || null; }
  /* parent-row definition with fallback: breakdown indicators often carry their
     definition on the category (third-tier) rows — fall back to the first
     category definition so every indicator row can offer an info button. */
  function aiiParentDef(g) {
    const d = aiiDef(g.sub, '');
    if (d) return d;
    if (g.hasBreakdown) { for (const c of g.children) { const cd = aiiDef(g.sub, c.label); if (cd) return cd; } }
    return null;
  }
  function openAiiInfo(row) { setInfoRow(row); }
  React.useEffect(() => { setSelSub(null); setSelThird(null); }, [year, selPillar]);
  const activeSub = (selSub && grouped.some(g => g.sub === selSub)) ? selSub : (grouped[0] ? grouped[0].sub : null);
  const activeGroup = grouped.find(g => g.sub === activeSub) || null;
  const activeThird = (activeGroup && activeGroup.hasBreakdown && selThird && activeGroup.children.some(c => c.label === selThird)) ? selThird : null;
  const cmpMode = activeGroup && activeGroup.hasBreakdown && !activeThird ? (activeGroup.children.length > 5 ? 'scorecard' : 'grouped') : 'flat';
  const cmpFlatRows = React.useMemo(() => (cmpMode === 'flat' && activeSub) ? aiiCompareCountries(selPillar, activeSub, year, activeThird || '') : [], [selPillar, activeSub, activeThird, year, cmpMode]);
  const cmpBreakdown = React.useMemo(() => (cmpMode !== 'flat' && activeSub) ? aiiCompareBreakdown(selPillar, activeSub, year) : null, [selPillar, activeSub, year, cmpMode]);

  function pickCard(p) { setSelPillar(p); }
  function pickBadge(p, sub) { setSelPillar(p); setSelSub(sub); setSelThird(null); }
  function pickParentRow(g) {
    setSelSub(g.sub); setSelThird(null);
    if (g.hasBreakdown) setExpanded(prev => { const n = new Set(prev); n.has(g.sub) ? n.delete(g.sub) : n.add(g.sub); return n; });
  }
  function pickChildRow(sub, label) { setSelSub(sub); setSelThird(label); }
  const [banner, setBanner] = React.useState(true);

  return (
    <>
      {banner && (
        <div className="gari-fw-banner">
          <span className="gfb-icon">ⓘ</span>
          <span className="gfb-text">Pillar indicator values are not directly comparable across years as no consolidated pillar rankings are available. Indicators tracked in this publication may vary in coverage and definition across editions.</span>
          <button className="gfb-dismiss" onClick={() => setBanner(false)} aria-label="Dismiss">✕</button>
        </div>
      )}
      {/* header card — single column, no rank (AII has no overall rank/score) */}
      <div className="panel header-card imd-header ov-imd-card aii-header aii-header-single">
        <div className="hc-accent" style={{ background: AII_ACCENT }} />
        <div className="hc-left">
          <div className="hc-name">Artificial Intelligence Index <span className="hc-country" style={{ color: AII_DARK }}>· {country}</span></div>
          <div className="hc-def">Measures national AI vibrancy across research, economy, education, policy, public opinion, and responsible AI. Data from the Stanford Global AI Vibrancy Tool tracks measured indicator values rather than a standardised country ranking. <ExtLinkIcon url={PUB_URL[AII_PUB]} color={AII_DARK} /></div>
          <div className="hc-source"><span className="src-link" style={{ color: AII_DARK }}>Stanford HAI</span> · Annual</div>
        </div>
      </div>

      {/* filter row — YEAR | COUNTRY | PILLAR */}
      <div className="panel filterbar gari-filterbar">
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
        <div className="flt">
          <label className="flt-label">Pillar</label>
          <div className="flt-select-wrap">
            <select className="flt-select" value={selPillar} onChange={e => setSelPillar(e.target.value)}>
              {pillarOpts.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <svg className="flt-caret" width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="#6B7280" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
        </div>
      </div>

      {/* pillar cards — navigation cards: indicator count + click-to-filter
          sub-indicator badges. AII's sub-indicators are heterogeneous (different
          units/scales), so there is no single representative score to headline. */}
      <div className="aii-grid">
        {cards.map(c => {
          const active = c.pillar === selPillar;
          return (
            <div key={c.pillar} className={'aii-card' + (active ? ' aii-active' : '')} onClick={() => pickCard(c.pillar)} role="button" tabIndex={0}>
              <div className="g25-head">
                <span className="g25-badge" style={{ background: hexTint(AII_ACCENT, 0.12), color: AII_DARK }}>{AII_ICONS[c.pillar]}</span>
                <span className="g25-name">{c.pillar}</span>
              </div>
              {c.count > 0 ? (
                <>
                  <div className="aii-card-meta">{c.count} indicator{c.count === 1 ? '' : 's'} tracked · {country}</div>
                  <div className="aii-card-year">{year} data</div>
                </>
              ) : (
                <div className="aii-pending">No data available</div>
              )}
              <div className="g25-subpills" style={{ width: '100%' }}>
                {c.badges.map(b => <span key={b.raw} className="aii-subpill" title={b.raw} onClick={e => { e.stopPropagation(); pickBadge(c.pillar, b.raw); }}>{stripYearInfo(b.raw)}</span>)}
              </div>
            </div>
          );
        })}
      </div>

      {/* two-column: country comparison chart (left, same unit only) + sub-indicator table (right) */}
      <div className="nri2-grid">
        <div className="panel aii-chart gari-profile-fill">
          <div className="panel-head panel-head-row">
            <div className="ph-titles">
              <div className="panel-title">{cmpMode === 'scorecard' ? (<>Comparison of <span style={{ color: AII_ACCENT, fontWeight: 600 }}>{abbreviateSubIndicator(activeSub)}</span> by categories across countries · <span style={{ color: AII_ACCENT, fontWeight: 600 }}>{country}</span></>) : (<>Comparison of {selPillar}{activeSub && (<>{' · '}<span style={{ color: AII_ACCENT, fontWeight: 600 }}>{abbreviateSubIndicator(activeSub)}</span></>)}{activeThird && (<>{' · '}<span style={{ color: AII_ACCENT, fontWeight: 600 }}>{activeThird}</span></>)} across countries · <span style={{ color: AII_ACCENT, fontWeight: 600 }}>{country}</span></>)}</div>
              <div className="panel-sub">Click on a country to explore its indicators · Showing {cmpMode === 'flat' ? cmpFlatRows.length : (cmpBreakdown ? cmpBreakdown.countries.length : 0)} countries</div>
            </div>
          </div>
          <div className="panel-body">
            {cmpMode === 'flat' && <AIICompareChart rows={cmpFlatRows} selectedCountry={country} onPick={setCountry} />}
            {cmpMode === 'grouped' && <AIIGroupedChart data={cmpBreakdown} selectedCountry={country} onPick={setCountry} />}
            {cmpMode === 'scorecard' && <AIIScorecardTable data={cmpBreakdown} selectedCountry={country} onPick={setCountry} />}
          </div>
          {cmpMode !== 'flat' && <div className="aii-rank-note" style={{ padding: '8px 14px 0', fontSize: '11.5px', lineHeight: 1.5, color: 'var(--color-text-tertiary)' }}>* Indicator ranks are based on the average of the component scores where a rank is not directly available in the publication.</div>}
          <ClassFoot pub={AII_PUB} year={year} />
        </div>

        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">Comparison of {selPillar} indicators · <span style={{ color: AII_ACCENT, fontWeight: 600 }}>{country}</span></div>
            <div className="panel-sub">Click on an indicator to explore its country comparison</div>
          </div>
          <div className="subtable-wrap">
            <table className="subtable">
              <thead>
                <tr>
                  <th className="th-ind">Indicator</th>
                  <th>{year} Rank</th>
                  <th>{year - 1} Rank</th>
                  <th>{year} Score</th>
                  <th>{year - 1} Score</th>
                  <th>YoY</th>
                </tr>
              </thead>
              <tbody>
                {grouped.length ? grouped.map(g => {
                  const isExpanded = expanded.has(g.sub);
                  const isActiveParent = g.sub === activeSub && !activeThird;
                  return (
                    <React.Fragment key={g.sub}>
                      <tr className={'row-data aii-parent-row' + (isActiveParent ? ' selected' : '')} onClick={() => pickParentRow(g)}>
                        <td className="td-ind depth1">{g.hasBreakdown && <span className="aii-expand-icon" style={{ transform: isExpanded ? 'rotate(90deg)' : 'none' }}>▶</span>}{g.sub}<button className="info-btn info-inline" title="View definition" onClick={e => { e.stopPropagation(); const pd = aiiParentDef(g); openAiiInfo({ label: g.sub, sub: g.sub, third: '', def: pd ? pd.d : null, score: g.hasBreakdown ? null : g.flatScore, prevScore: g.hasBreakdown ? null : g.prevFlatScore, delta: g.hasBreakdown ? null : (g.flatScore != null && g.prevFlatScore != null ? g.flatScore - g.prevFlatScore : null), hideScores: g.hasBreakdown }); }}>ⓘ</button></td>
                        {/* dropdown (breakdown) indicators: rank + score cells stay BLANK —
                            the components below carry the values, and the chart shows the
                            derived indicator rank. */}
                        <td className="td-num cell-rank">{g.hasBreakdown ? null : aiiRankCell(g.flatRank)}</td>
                        <td className="td-num">{g.hasBreakdown ? null : aiiRankCell(g.prevFlatRank)}</td>
                        <td className="td-num cell-score">{g.hasBreakdown ? null : (g.flatScore != null ? <>{fmtScore(g.flatScore)}{aiiArrow(g.flatScore, g.prevFlatScore)}</> : <span className="muted">—</span>)}</td>
                        <td className="td-num">{g.hasBreakdown ? null : (g.prevFlatScore != null ? fmtScore(g.prevFlatScore) : <span className="muted">—</span>)}</td>
                        <td className="td-num">{g.hasBreakdown ? null : aiiYoYCell(g.flatScore, g.prevFlatScore)}</td>
                      </tr>
                      {g.hasBreakdown && isExpanded && g.children.map(c => (
                        <tr key={g.sub + '::' + c.label} className={'row-data aii-child-row' + (g.sub === activeSub && activeThird === c.label ? ' selected' : '')} onClick={e => { e.stopPropagation(); pickChildRow(g.sub, c.label); }}>
                          <td className="td-ind depth1">{'└ ' + c.label}<button className="info-btn info-inline" title="View definition" onClick={e => { e.stopPropagation(); const cd = aiiDef(g.sub, c.label) || aiiDef(g.sub, ''); openAiiInfo({ label: c.label, sub: g.sub, third: c.label, def: cd ? cd.d : null, score: c.score, prevScore: c.prevScore, delta: (c.score != null && c.prevScore != null ? c.score - c.prevScore : null) }); }}>ⓘ</button></td>
                          <td className="td-num cell-rank">{aiiRankCell(c.rank)}</td>
                          <td className="td-num">{aiiRankCell(c.prevRank)}</td>
                          <td className="td-num cell-score">{c.score != null ? <>{fmtScore(c.score)}{aiiArrow(c.score, c.prevScore)}</> : <span className="muted">—</span>}</td>
                          <td className="td-num">{c.prevScore != null ? fmtScore(c.prevScore) : <span className="muted">—</span>}</td>
                          <td className="td-num">{aiiYoYCell(c.score, c.prevScore)}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                }) : (
                  <tr><td colSpan={6} className="es-sub" style={{ padding: '24px 0', textAlign: 'center' }}>No indicator data available for {selPillar} · {country} · {year}.</td></tr>
                )}
              </tbody>
            </table>
            <window.DefinitionPanel row={infoRow} pillar={{ pub: AII_PUB, indicator: selPillar, tab: selPillar }} year={year} onClose={() => setInfoRow(null)} />
          </div>
          <div className="gari-matrix-foot"><span>Classification: Official (Open)</span><span>Source: Stanford HAI ({year})</span></div>
        </div>
      </div>

      <AIIPageFoot />
    </>
  );
}

Object.assign(window, { AIIView, AII_ACCENT, AII_DARK });

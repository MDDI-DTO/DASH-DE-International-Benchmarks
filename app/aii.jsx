/* ============================================================
   DASHDE — AII (Artificial Intelligence Index · Stanford HAI)
   Score-based, NOT rank-based: the `rank` column is always empty
   for this publication. No overall rank/YoY-rank anywhere; every
   value is a `score` with its own `unit` — never compare across
   units on one chart. Header is a single descriptive card (no
   rank box), pillar cards are score-led, and the drill-in below
   is a country-comparison bar chart (same unit only) + a
   sub-indicator table with per-row units.
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
function aiiDirIcon(cur, prev) {
  if (cur == null || prev == null) return <span className="muted">—</span>;
  if (cur > prev) return <span style={{ color: 'var(--color-up)' }}>↑</span>;
  if (cur < prev) return <span style={{ color: 'var(--color-down)' }}>↓</span>;
  return <span className="muted">—</span>;
}
function aiiBarLabelColor(pct) { return pct < 30 ? '#111827' : '#FFFFFF'; }

/* left panel: country comparison bar chart, same-unit only, position-ranked,
   direction-only YoY (no numeric magnitude — units vary too much to be
   self-explanatory as a bare delta in a bar list). */
function AIICompareChart({ rows, selectedCountry, onPick, unit }) {
  if (!rows.length) return <div className="es-sub" style={{ padding: '30px 0', textAlign: 'center' }}>No comparison data available for this sub-indicator.</div>;
  const max = Math.max(0.0001, ...rows.map(r => r.score));
  const hasYoY = rows.some(r => r.prevScore != null);
  return (
    <div className="barchart barchart-scroll">
      {hasYoY && <div className="bar-chart-yoy-header">YoY</div>}
      {rows.map(r => {
        const hi = r.country === selectedCountry;
        const pct = Math.max(2, (r.score / max) * 100);
        return (
          <div key={r.country} className={'bar-row' + (hi ? ' selected' : '')} onClick={onPick ? () => onPick(r.country) : undefined}>
            <span className="bar-rank">{r.pos}{ordinal(r.pos)}</span>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: pct + '%', background: hi ? 'var(--color-brand-navy)' : 'var(--color-bar-other)' }} />
              <span className={'bar-name' + (hi ? ' me' : '')} style={{ color: aiiBarLabelColor(pct), fontWeight: hi ? 700 : 600, textShadow: aiiBarLabelColor(pct) === '#FFFFFF' ? '0 1px 2px rgba(0,0,0,0.42)' : 'none' }}>{r.country}</span>
            </div>
            <span className="bar-flag" title={flagUrl(r.country) ? undefined : r.country}>{flagUrl(r.country) ? <img src={flagUrl(r.country)} alt="" onError={e => e.currentTarget.remove()} /> : null}</span>
            <span className="bar-yoy-indicator">{aiiDirIcon(r.score, r.prevScore)}</span>
          </div>
        );
      })}
    </div>
  );
}

function AIIView({ domain }) {
  const years = React.useMemo(() => aiiYears(), []);
  const [year, setYear] = React.useState(years[0] || 2025);
  const countryOpts = React.useMemo(() => aiiCountries(year), [year]);
  const [country, setCountry] = React.useState(countryOpts.includes('Singapore') ? 'Singapore' : (countryOpts[0] || 'Singapore'));
  React.useEffect(() => {
    if (!countryOpts.includes(country)) setCountry(countryOpts.includes('Singapore') ? 'Singapore' : (countryOpts[0] || 'Singapore'));
  }, [year]); // eslint-disable-line

  const pillarOpts = React.useMemo(() => aiiPillars(year), [year]);
  const [selPillar, setSelPillar] = React.useState(pillarOpts[0]);
  React.useEffect(() => { if (!pillarOpts.includes(selPillar)) setSelPillar(pillarOpts[0]); }, [pillarOpts]); // eslint-disable-line

  const cards = React.useMemo(() => aii2025Cards(country, year), [country, year]);
  const tableRows = React.useMemo(() => aiiSubTable(selPillar, country, year), [selPillar, country, year]);
  const [selSub, setSelSub] = React.useState(null);
  React.useEffect(() => { setSelSub(null); }, [year]);
  const activeSub = (selSub && tableRows.some(r => r.sub === selSub)) ? selSub : (tableRows[0] ? tableRows[0].sub : null);
  const activeRow = tableRows.find(r => r.sub === activeSub) || null;
  const cmpRows = React.useMemo(() => activeSub ? aiiCompareCountries(selPillar, activeSub, year) : [], [selPillar, activeSub, year]);

  function pickCard(p) { setSelPillar(p); }
  function pickBadge(p, sub) { setSelPillar(p); setSelSub(sub); }

  return (
    <>
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
                  <div className="aii-card-meta">{c.count} indicator{c.count === 1 ? '' : 's'} tracked</div>
                  <div className="aii-card-year">{year} data</div>
                </>
              ) : (
                <div className="aii-pending">No data available</div>
              )}
              <div className="g25-subpills">
                {c.badges.map(b => <span key={b.raw} className="aii-subpill" onClick={e => { e.stopPropagation(); pickBadge(c.pillar, b.raw); }}>{b.abbr}</span>)}
                {c.remaining > 0 && <span className="badge-overflow">+ {c.remaining} more</span>}
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
              <div className="panel-title">Comparison of {selPillar}{activeSub && (<>{' · '}<span style={{ color: AII_ACCENT, fontWeight: 600 }}>{abbreviateSubIndicator(activeSub)}</span></>)} across countries · <span style={{ color: AII_ACCENT, fontWeight: 600 }}>{country}</span></div>
              <div className="panel-sub">Click on a country to explore its indicators · Showing {cmpRows.length} countries</div>
            </div>
          </div>
          <div className="panel-body">
            <AIICompareChart rows={cmpRows} selectedCountry={country} onPick={setCountry} unit={activeRow ? activeRow.unit : ''} />
          </div>
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
                  <th>{year}</th>
                  <th>{year - 1}</th>
                  <th>YoY</th>
                  <th className="unit-col">Unit</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.length ? tableRows.map((r, i) => (
                  <tr key={r.sub} className={'row-data' + (r.sub === activeSub ? ' selected' : '')} style={{ cursor: 'pointer' }} onClick={() => setSelSub(r.sub)}>
                    <td className="td-ind depth1">{r.sub}</td>
                    <td className="td-num cell-score">{r.score != null ? <>{fmtScore(r.score)}{aiiArrow(r.score, r.prevScore)}</> : <span className="muted">—</span>}</td>
                    <td className="td-num">{r.prevScore != null ? fmtScore(r.prevScore) : <span className="muted">—</span>}</td>
                    <td className="td-num">{aiiYoYCell(r.score, r.prevScore)}</td>
                    <td className="td-ind unit-col" style={{ color: 'var(--color-text-tertiary)', fontSize: 10.5 }}>{r.unit || '—'}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="es-sub" style={{ padding: '24px 0', textAlign: 'center' }}>No indicator data available for {selPillar} · {country} · {year}.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="gari-matrix-foot"><span>Classification: Official (Open)</span><span>Source: Stanford HAI ({year})</span></div>
        </div>
      </div>

      <AIIPageFoot />
    </>
  );
}

Object.assign(window, { AIIView, AII_ACCENT, AII_DARK });

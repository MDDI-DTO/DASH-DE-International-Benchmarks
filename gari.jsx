/* ============================================================
   DASHDE — GARI (Government AI Readiness Index · Oxford Insights)
   Mirrors the Overall – NRI tab family: a Level-1 "Overall – GARI"
   summary page (with an Era filter unique to this publication) plus
   Level-2 pillar deep-dive pages for the 2020–2024 era's 3 pillars.
   The 2019 legacy era is permanently excluded; the 2025 era's 6
   pillars appear as an inline consolidated grid (no deep-dive pages).
   Uses the internal-.site-scroll canvas, like NRI/Overall-IMD.
   ============================================================ */

const GARI_ACCENT = '#B45309'; // amber — borders, links, active states
const GARI_DARK   = '#92400E'; // darker amber — accent text on light
const GARI_LIGHT  = '#FEF3C7'; // pale amber — pill / note backgrounds
const GARI_URL    = 'https://oxfordinsights.com/ai-readiness/ai-readiness-index/';
const GARI_DESC   = "Measures a government's preparedness to implement AI across public services, spanning policy vision, technology infrastructure, and data capacity. Published annually by Oxford Insights.";

const GARI_PILLAR_DEF = {
  'Government': "Assesses the government's vision, governance and ethics, digital capacity and adaptability in enabling AI deployment across public services.",
  'Technology Sector': 'Gauges the maturity of the national technology sector underpinning AI — the innovation capacity, business environment and human capital that supply AI tools to government.',
  'Data and Infrastructure': 'Captures the availability and quality of the data and digital infrastructure on which government AI depends, including connectivity, compute and data representativeness.',
};

/* 2025 consolidated-grid card styling — decorative per-card variety (not the
   single GARI accent), each with an emoji glyph and bar colour per the reference. */
const GARI_2025_STYLE = {
  'Policy Capacity':        { icon: '📢', color: '#2563EB' },
  'AI Infrastructure':      { icon: '🗄️', color: '#1F8A5B' },
  'Governance':             { icon: '⚖️', color: '#7C3AED' },
  'Public Sector Adoption': { icon: '🏛️', color: '#15803D' },
  'Development & Diffusion': { icon: '🚀', color: '#D97706' },
  'Resilience':             { icon: '🛡️', color: '#EA580C' },
};

/* YoY state for a rank vs its prior year, incl. the GARI-specific "Held from" case */
function gariRankYoY(cur, prev, prevYear) {
  if (cur == null || prev == null) return { cls: 'yoy-neutral', arrow: '', txt: 'No prior year ranking' };
  if (cur < prev) return { cls: 'yoy-up', arrow: '↑', txt: `from ${prev}${ordinal(prev)} in ${prevYear}` };
  if (cur > prev) return { cls: 'yoy-down', arrow: '↓', txt: `from ${prev}${ordinal(prev)} in ${prevYear}` };
  return { cls: 'yoy-neutral', arrow: '', txt: `Held from ${prevYear}` };
}

function GARIPageFoot() {
  return (
    <div className="ov-imd-foot">
      <div className="ov-imd-foot-class">Classification: Official (Open)</div>
      <div className="ov-imd-foot-updated">{window.lastUpdatedStr ? window.lastUpdatedStr() : ''}</div>
    </div>
  );
}

/* GARI source line — "GARI" is the hyperlink (matching GAI's `GAI · Tortoise
   Media · Annual` convention: short name linked, publisher in plain text). */
function GariSource() {
  return (
    <div className="hc-source">
      <a className="src-link" style={{ color: GARI_DARK }} href={GARI_URL} target="_blank" rel="noopener noreferrer">GARI</a> · Oxford Insights · Annual
    </div>
  );
}

/* YoY (Score) cell: ↑ +Δ green / ↓ -Δ red / — grey, vs the prior year's score */
function gariScoreYoYCell(score, prevScore) {
  if (score == null || prevScore == null) return <span className="muted">—</span>;
  const d = Math.round((score - prevScore) * 100) / 100;
  if (d > 0) return <span style={{ color: 'var(--color-up)' }}>↑ {fmtScore(d)}</span>;
  if (d < 0) return <span style={{ color: 'var(--color-down)' }}>↓ -{fmtScore(Math.abs(d))}</span>;
  return <span className="muted">—</span>;
}

/* matrix table — like NRISubPillarTable but Singapore's own row values are
   accent-coloured (deliberate exception to the always-black rank rule). */
function GARIMatrixTable({ matrix, selectedCountry, onPickCountry }) {
  const [tip, setTip] = React.useState(null);
  if (!matrix || !matrix.rows.length) return <div className="nri-matrix-empty">No data available.</div>;
  return (
    <>
      <table className="nri-matrix gari-matrix" style={{ '--nm-accent': GARI_ACCENT }}>
        <thead>
          <tr>
            <th className="nm-country">Country</th>
            {matrix.subs.map(s => <th key={s} className="nm-sub">{s}</th>)}
          </tr>
        </thead>
        <tbody>
          {matrix.rows.map(r => {
            const fl = flagUrl(r.country);
            const isSel = r.country === selectedCountry;
            const rowStyle = isSel ? { background: hexTint(GARI_ACCENT, 0.07) }
              : r.isMe ? { background: hexTint(GARI_ACCENT, 0.04) } : null;
            return (
              <tr key={r.country}
                className={'nm-clickable' + (r.isMe ? ' nm-me' : '') + (isSel ? ' nm-selected' : '')}
                style={rowStyle}
                onClick={onPickCountry ? () => onPickCountry(r.country) : undefined}>
                <td className="nm-country-cell">
                  <div className="nm-country-inner">
                    <span className="nm-flag">{fl ? <img src={fl} alt="" /> : null}</span>
                    <span className={'nm-name' + (r.isMe ? ' me' : '')}>{r.country}</span>
                  </div>
                </td>
                {r.cells.map(c => (
                  <td key={c.sub} className={'nm-rank' + (r.isMe ? ' nm-rank-me' : '')}
                    style={r.isMe ? { color: GARI_DARK, fontWeight: 700 } : null}
                    onMouseMove={c.rank != null ? e => setTip({ x: e.clientX, y: e.clientY, t: `${r.country} · ${c.sub} · Rank ${c.rank}${ordinal(c.rank)} · Score ${fmtScore(c.score)}` }) : undefined}
                    onMouseLeave={() => setTip(null)}>
                    {c.rank != null ? c.rank : '—'}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {tip && <BodyPortal><div className="chart-tip" style={{ left: tip.x + 12, top: tip.y + 12 }}>{tip.t}</div></BodyPortal>}
    </>
  );
}

/* ============================================================
   Level 1 — Overall – GARI summary (with Era filter + 2025 grid)
   ============================================================ */
function GARIOverallView({ domain }) {
  const [era, setEra] = React.useState('2020-2024');
  const eraYears = React.useMemo(() => gariEraYears(era), [era]);
  const [year, setYear] = React.useState(eraYears[0] || 2024);
  const [country, setCountry] = React.useState('Singapore');
  const [view, setView] = React.useState('all');

  // when era changes, snap the year into that era's range
  React.useEffect(() => {
    setYear(prev => eraYears.includes(prev) ? prev : (eraYears[0] || prev));
  }, [era]); // eslint-disable-line

  const ranking = gariOverallRanking(year);
  const countryOpts = React.useMemo(
    () => ranking.map(r => ({ country: r.country })).sort((a, b) => a.country.localeCompare(b.country)),
    [year, ranking.length]
  );
  React.useEffect(() => {
    if (ranking.length && !ranking.some(r => r.country === country)) {
      setCountry(ranking.some(r => r.country === 'Singapore') ? 'Singapore' : ranking[0].country);
    }
  }, [year]); // eslint-disable-line

  const overall = gariOverallRow(country, year);
  const prevRow = gariOverallRow(country, year - 1);
  const yoy = (year === 2020) ? { cls: 'yoy-neutral', arrow: '', txt: 'No prior year ranking' }
    : gariRankYoY(overall ? overall.rank : null, prevRow ? prevRow.rank : null, year - 1);
  // header trend ALWAYS reflects the 2020–2024 established history, regardless of era
  const trend = gariOverallSeries(country);

  const all = view === 'all';
  const rows = all ? ranking : gariOverallWindow(year, country || 'Singapore');
  function reset() { setView('all'); setCountry('Singapore'); }

  const showNote = era === '2020-2024' && year > 2020 && year <= 2024;

  return (
    <>
      {/* header card */}
      <div className="panel header-card imd-header ov-imd-card">
        <div className="hc-accent" style={{ background: GARI_ACCENT }} />
        <div className="hc-left">
          <div className="hc-eyebrow">{domain} · Publication · Overall</div>
          <div className="hc-name">Government AI Readiness Index <span className="hc-country" style={{ color: GARI_DARK }}>· {country}</span></div>
          <div className="hc-def">{GARI_DESC}</div>
          <GariSource />
          <div className="ov-imd-datanote">* Overall rank data available from 2020</div>
        </div>
        <div className="hc-rank">
          <div className="hc-rank-eyebrow">Overall Rank</div>
          <div className="rank-line">
            <span className="rank-number">{overall && overall.rank != null ? overall.rank : '—'}</span>
            {overall && overall.rank != null && <sup className="rank-ordinal">{ordinal(overall.rank)}</sup>}
          </div>
          <div className="hc-block-label">Pillar rank · {year}</div>
          <div className={'hc-yoy ' + yoy.cls}>{yoy.arrow && <span>{yoy.arrow}</span>}<span>{yoy.txt}</span></div>
        </div>
        <div className="hc-trend">
          <div className="hc-trend-label">Ranking Trend · 2020–2024</div>
          <RankTrendChart series={trend} country={country} color={GARI_ACCENT} />
        </div>
      </div>

      {/* filter row — ERA | YEAR | COUNTRY */}
      <div className="panel filterbar gari-filterbar">
        <div className="flt">
          <label className="flt-label">Era</label>
          <div className="gari-era-toggle">
            <button className={'gari-era' + (era === '2020-2024' ? ' active' : '')} onClick={() => setEra('2020-2024')}>2020–2024</button>
            <button className={'gari-era' + (era === '2025' ? ' active' : '')} onClick={() => setEra('2025')}>2025</button>
          </div>
        </div>
        <div className="flt">
          <label className="flt-label">Year</label>
          <div className="flt-select-wrap">
            <select className="flt-select" value={year} disabled={eraYears.length <= 1} onChange={e => setYear(Number(e.target.value))}>
              {eraYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <svg className="flt-caret" width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="#6B7280" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
        </div>
        <div className="flt">
          <label className="flt-label">Country</label>
          <div className="flt-select-wrap">
            <select className="flt-select" value={country} onChange={e => setCountry(e.target.value)}>
              {countryOpts.map(c => <option key={c.country} value={c.country}>{c.country}</option>)}
            </select>
            <svg className="flt-caret" width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="#6B7280" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
        </div>
        {showNote && <span className="flt-note">Showing {year} · YoY vs {year - 1}</span>}
      </div>

      {/* overall ranking bar chart */}
      <div className="panel ov-imd-chart gari-chart">
        <div className="panel-head panel-head-row">
          <div className="ph-titles">
            <div className="panel-title">Overall GARI Ranking – {all ? 'All' : country} Countries ({year})</div>
            <div className="panel-sub">Click a country bar to switch focus · Hover over a bar for score details</div>
          </div>
          <div className="chart-head-ctrls">
            <ChartResetButton onReset={reset} />
            <ChartViewControl view={view} onView={setView} count={all ? rows.length : null} />
          </div>
        </div>
        {ranking.length ? (
          <div className="panel-body">
            <CountryBarChart rows={rows} selectedCountry={country} onPick={setCountry} fixedRows={all} widthByScore />
          </div>
        ) : (
          <div className="panel-body"><div className="es-sub" style={{ padding: '24px 0', textAlign: 'center' }}>Country ranking data unavailable.</div></div>
        )}
        <ClassFoot pub="Government AI Readiness Index" year={year} />
      </div>

      <GARIPageFoot />
    </>
  );
}

/* ============================================================
   Level 2 — GARI pillar deep-dive (2020–2024 only)
   ============================================================ */
function GARIPillarMainCard({ domain, pillar, country, year }) {
  const P = pillar;
  const series = gariPillarSeries(P, country);
  const cur = series.find(r => r.y === year) || null;
  const prev = series.find(r => r.y === year - 1) || null;
  const def = defOf(GARI_PUB, P, 'Overall', '') || GARI_PILLAR_DEF[P] || '';
  const yoy = (year === 2020) ? { cls: 'yoy-neutral', arrow: '', txt: 'No prior year ranking' }
    : gariRankYoY(cur ? cur.r : null, prev ? prev.r : null, year - 1);
  const pills = gariPillarSubs(P, country, year);
  return (
    <div className="panel header-card imd-header ov-imd-card">
      <div className="hc-accent" style={{ background: GARI_ACCENT }} />
      <div className="hc-left">
        <div className="hc-eyebrow">{domain} · GARI Pillar</div>
        <div className="hc-name">{P} <span className="hc-country" style={{ color: GARI_DARK }}>· {country}</span></div>
        {def && <div className="hc-def">{def}</div>}
        <GariSource />
        <div className="nri2-tags">
          {pills.map(s => (
            <span key={s.sub} className="nri-pill gari-pill-tag">{s.sub} · {s.rank != null ? s.rank + ordinal(s.rank) : '—'}</span>
          ))}
        </div>
        <div className="ov-imd-datanote">* Pillar rank data available from 2020</div>
      </div>
      <div className="hc-rank">
        <div className="hc-rank-eyebrow">Pillar Rank</div>
        <div className="rank-line">
          <span className="rank-number">{cur && cur.r != null ? cur.r : '—'}</span>
          {cur && cur.r != null && <sup className="rank-ordinal">{ordinal(cur.r)}</sup>}
        </div>
        <div className="hc-block-label">Pillar rank · {year}</div>
        <div className={'hc-yoy ' + yoy.cls}>{yoy.arrow && <span>{yoy.arrow}</span>}<span>{yoy.txt}</span></div>
      </div>
      <div className="hc-trend">
        <div className="hc-trend-label">Ranking trend · 2020–2024</div>
        <RankTrendChart series={series} country={country} color={GARI_ACCENT} />
      </div>
    </div>
  );
}

function GARIPillarPage({ domain, pillar }) {
  const P = pillar;
  const years = React.useMemo(() => gariEraYears('2020-2024'), []);
  const [year, setYear] = React.useState(years[0] || 2024);
  const [country, setCountry] = React.useState('Singapore');
  const [chartView, setChartView] = React.useState('all');
  const [profileView, setProfileView] = React.useState('all');

  const prevYear = year - 1;
  const ranked = gariCompare(P, 'Overall', year, 'all');
  const countryOpts = React.useMemo(
    () => ranked.map(r => ({ country: r.country })).sort((a, b) => a.country.localeCompare(b.country)),
    [P, year, ranked.length]
  );
  React.useEffect(() => {
    if (ranked.length && !ranked.some(r => r.country === country)) {
      setCountry(ranked.some(r => r.country === 'Singapore') ? 'Singapore' : ranked[0].country);
    }
  }, [P, year]); // eslint-disable-line
  React.useEffect(() => { setYear(prev => years.includes(prev) ? prev : (years[0] || prev)); }, [P]); // eslint-disable-line

  const allCmp = chartView === 'all';
  const cmpRows = allCmp ? ranked : gariCompare(P, 'Overall', year, 'sg', country || 'Singapore');

  const profAll = profileView === 'all';
  const matrix = gariPillarMatrix(P, year, profAll ? 'all' : 'sg', country || 'Singapore');

  const tableRows = gariSubIndTable(P, country, year);
  const showNote = year > 2020;

  function resetCmpChart() { setChartView('all'); setCountry('Singapore'); }
  function resetProfileChart() { setProfileView('all'); }

  // rank cell with up/down/held arrow comparing rank vs prevRank
  function rankCell(rank, prevRank) {
    if (rank == null) return <span className="muted">—</span>;
    let arrow = <span className="td-arrow muted"> —</span>;
    if (prevRank != null && rank < prevRank) arrow = <span className="td-arrow" style={{ color: 'var(--color-up)' }}> ↑</span>;
    else if (prevRank != null && rank > prevRank) arrow = <span className="td-arrow" style={{ color: 'var(--color-down)' }}> ↓</span>;
    return <span className="td-rank-inner">{rank}<span style={{ fontWeight: 400 }}>{ordinal(rank)}</span>{arrow}</span>;
  }

  let leafCount = 0;

  return (
    <>
      <GARIPillarMainCard domain={domain} pillar={P} country={country} year={year} />

      <FilterBar years={years} countries={countryOpts} year={year} country={country}
        onYear={setYear} onCountry={setCountry} yearLocked={false} hint={false}
        note={showNote ? `Showing ${year} · YoY vs ${prevYear}` : undefined} />

      {/* country rank comparison chart */}
      <div className="panel ov-imd-chart gari-chart">
        <div className="panel-head panel-head-row">
          <div className="ph-titles">
            <div className="panel-title"><span style={{ fontWeight: 600 }}>{P}</span> – Country Rank Comparison ({year})</div>
            <div className="panel-sub">Click a country bar to switch focus · Hover over a bar for score details</div>
          </div>
          <div className="chart-head-ctrls">
            <ChartResetButton onReset={resetCmpChart} />
            <ChartViewControl view={chartView} onView={setChartView} count={allCmp ? cmpRows.length : null} />
          </div>
        </div>
        <div className="panel-body">
          <CountryBarChart rows={cmpRows} selectedCountry={country} onPick={setCountry} fixedRows={allCmp} widthByScore />
        </div>
        <ClassFoot pub="Government AI Readiness Index" year={year} />
      </div>

      {/* two-column: sub-pillar rank profile matrix + sub-indicators table */}
      <div className="nri2-grid">
        {/* matrix */}
        <div className="panel">
          <div className="panel-head panel-head-row">
            <div className="ph-titles">
              <div className="panel-title">Sub-pillar rank profile · <span>{P}</span> · <span style={{ color: GARI_DARK, fontWeight: 600 }}>{country}</span></div>
              <div className="panel-sub">Click a country row to focus · Hover a cell for score details</div>
            </div>
            <div className="chart-head-ctrls">
              <ChartResetButton onReset={resetProfileChart} />
              <ChartViewControl view={profileView} onView={setProfileView} count={profAll ? matrix.rows.length : null} />
            </div>
          </div>
          <div className={'nri-matrix-wrap' + (profAll ? ' scroll' : '')}>
            <GARIMatrixTable matrix={matrix} selectedCountry={country} onPickCountry={setCountry} />
          </div>
          <div className="gari-matrix-foot"><span>{matrix.rows.length} countries shown</span><span>Oxford Insights</span></div>
        </div>

        {/* sub-indicators table (2-level) */}
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">Sub-indicators · <span style={{ fontWeight: 600 }}>{P}</span> · <span style={{ color: GARI_DARK, fontWeight: 600 }}>{country}</span></div>
            <div className="panel-sub">All dimensions and sub-indicators shown · scores reflect selected year</div>
          </div>
          <div className="subtable-wrap">
            <table className="subtable">
              <thead>
                <tr>
                  <th className="th-ind">Indicator</th>
                  <th>Rank {prevYear}</th>
                  <th>Rank {year}</th>
                  <th>Score {prevYear}</th>
                  <th>Score {year}</th>
                  <th>YoY (Score)</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((r, i) => {
                  if (r.kind === 'header') {
                    return <tr key={i} className="nri-row-subhdr gari-row-hdr"><td className="td-ind" colSpan={6}>{r.label.toUpperCase()}</td></tr>;
                  }
                  if (r.kind === 'overall') {
                    return <tr key={i} className="nri-row-overall2" style={{ background: hexTint(GARI_ACCENT, 0.05) }}>
                      <td className="td-ind" style={{ fontWeight: 600 }}>{r.label}</td>
                      <td className="td-rank">{r.prevRank != null ? r.prevRank : <span className="muted">—</span>}</td>
                      <td className="td-rank">{rankCell(r.rank, r.prevRank)}</td>
                      <td className="td-num">{r.prevScore != null ? fmtScore(r.prevScore) : <span className="muted">—</span>}</td>
                      <td className="td-num">{r.score != null ? fmtScore(r.score) : <span className="muted">—</span>}</td>
                      <td className="td-num">{gariScoreYoYCell(r.score, r.prevScore)}</td>
                    </tr>;
                  }
                  leafCount++;
                  return <tr key={i} className={'nri-row-leaf' + (leafCount % 2 === 0 ? ' row-even' : '')}>
                    <td className="td-ind depth1">{r.label}</td>
                    <td className="td-rank">{r.prevRank != null ? r.prevRank : <span className="muted">—</span>}</td>
                    <td className="td-rank">{rankCell(r.rank, r.prevRank)}</td>
                    <td className="td-num">{r.prevScore != null ? fmtScore(r.prevScore) : <span className="muted">—</span>}</td>
                    <td className="td-num cell-score">{r.score != null ? fmtScore(r.score) : <span className="muted">—</span>}</td>
                    <td className="td-num">{gariScoreYoYCell(r.score, r.prevScore)}</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
          <div className="gari-matrix-foot"><span>Classification: Official (Open)</span><span>Oxford Insights</span></div>
        </div>
      </div>

      <GARIPageFoot />
    </>
  );
}

/* ============================================================
   Level 2 — GARI 2025 Framework (consolidated; replaces per-pillar
   deep-dives for the restructured 6-pillar 2025 edition).
   Mirrors GAI's sub-pillar Rank Profile + Sub-indicators pattern.
   ============================================================ */
function GARI2025FrameworkView({ domain }) {
  const YEAR = 2025;
  const [country, setCountry] = React.useState('Singapore');
  const [banner, setBanner] = React.useState(true);
  const [profileView, setProfileView] = React.useState('all'); // default "All" (per batch Fix 8)

  const ranking = gariOverallRanking(YEAR);
  const cards = React.useMemo(() => gari2025Cards(country), [country]);
  const counts = React.useMemo(
    () => (window.gari2025Counts ? gari2025Counts() : { countries: ranking.length, pillars: cards.length, dimensions: 0 }),
    [ranking.length, cards.length]
  );
  const countryOpts = React.useMemo(
    () => ranking.map(r => ({ country: r.country })).sort((a, b) => a.country.localeCompare(b.country)),
    [ranking.length]
  );
  React.useEffect(() => {
    if (ranking.length && !ranking.some(r => r.country === country)) {
      setCountry(ranking.some(r => r.country === 'Singapore') ? 'Singapore' : ranking[0].country);
    }
  }, [ranking.length]); // eslint-disable-line

  // Overall rank is the one value confirmed comparable across the 2024→2025 era
  // boundary (same indicator='Overall' definition), so a real YoY is shown here.
  const overall = gariOverallRow(country, YEAR);
  const prevOverall = gariOverallRow(country, 2024);
  const yoy = gariRankYoY(overall ? overall.rank : null, prevOverall ? prevOverall.rank : null, 2024);

  const firstPillar = cards.length ? cards[0].pillar : null;
  const [selPillar, setSelPillar] = React.useState(firstPillar);
  const [selSub, setSelSub] = React.useState('Overall');
  React.useEffect(() => {
    if (firstPillar && !cards.some(c => c.pillar === selPillar)) { setSelPillar(firstPillar); setSelSub('Overall'); }
  }, [cards.length]); // eslint-disable-line

  const pillarOverall = selPillar ? gariPillarOverall(selPillar, country, YEAR) : null;
  const subRows = selPillar ? gariPillarSubs(selPillar, country, YEAR) : [];

  const profAll = profileView === 'all';
  const cmpRows = selPillar
    ? gariCompare(selPillar, selSub === 'Overall' ? 'Overall' : selSub, YEAR, profAll ? 'all' : 'sg', country || 'Singapore')
    : [];

  function pickCard(p) { setSelPillar(p); setSelSub('Overall'); }
  function resetProfile() { setProfileView('all'); setSelSub('Overall'); }
  const selLabel = selPillar ? (selSub === 'Overall' ? selPillar : selPillar + ' · ' + selSub) : '—';

  return (
    <>
      {/* header card — Title/Definition | Overall Rank | Framework stats */}
      <div className="panel header-card imd-header ov-imd-card gari-fw-header">
        <div className="hc-accent" style={{ background: GARI_ACCENT }} />
        <div className="hc-left">
          <div className="hc-eyebrow">{domain} · GARI Overview · 2025</div>
          <div className="hc-name">Government AI Readiness Index <span className="hc-country" style={{ color: GARI_DARK }}>· {country} · 2025</span></div>
          <div className="hc-def">The 2025 edition introduces a restructured 6-pillar framework. Results are not directly comparable to previous editions due to a change in methodology.</div>
          <GariSource />
          <div className="ov-imd-datanote">* Sub-pillar data reflects the 2025 framework only — no prior-year comparison available</div>
        </div>
        <div className="hc-rank">
          <div className="hc-rank-eyebrow">Overall Rank</div>
          <div className="rank-line">
            <span className="rank-number">{overall && overall.rank != null ? overall.rank : '—'}</span>
            {overall && overall.rank != null && <sup className="rank-ordinal">{ordinal(overall.rank)}</sup>}
          </div>
          <div className="hc-block-label">Overall rank · 2025</div>
          <div className={'hc-yoy ' + yoy.cls}>{yoy.arrow && <span>{yoy.arrow}</span>}<span>{yoy.txt}</span></div>
        </div>
        <div className="hc-trend gari-fw-stats">
          <div className="gari-fw-stats-label">Countries Ranked · 2025</div>
          <div className="gari-fw-stat"><span className="k">Total countries</span><span className="v">{counts.countries || '—'}</span></div>
          <div className="gari-fw-stat"><span className="k">Pillars</span><span className="v">{counts.pillars || cards.length}</span></div>
          <div className="gari-fw-stat"><span className="k">Dimensions</span><span className="v">{counts.dimensions || '—'}</span></div>
        </div>
      </div>

      {/* methodology banner — dismissible system note */}
      {banner && (
        <div className="gari-fw-banner">
          <span className="gfb-icon">ⓘ</span>
          <span className="gfb-text">The 2025 framework was significantly restructured. Sub-pillar scores below are not directly comparable to 2020–2024 values. Overall rank remains a valid cross-era reference point; sub-pillar scores are not.</span>
          <button className="gfb-dismiss" onClick={() => setBanner(false)} aria-label="Dismiss">✕</button>
        </div>
      )}

      {/* pillar cards grid — 6 cards, 3×2; click to drive the chart + table below */}
      <div className="gari-2025">
        <div className="gari-2025-sub">New 6-pillar framework · {country} highlighted</div>
        <div className="gari-2025-grid">
          {cards.map(c => {
            const st = GARI_2025_STYLE[c.pillar] || { icon: '•', color: GARI_ACCENT };
            const pct = c.score != null ? Math.max(6, Math.min(100, c.score)) : 0;
            const active = c.pillar === selPillar;
            return (
              <div key={c.pillar} className={'gari-2025-card g25-clickable' + (active ? ' g25-active' : '')}
                onClick={() => pickCard(c.pillar)} role="button" tabIndex={0}>
                <div className="g25-head">
                  <span className="g25-badge" style={{ background: hexTint(st.color, 0.14), color: st.color }}>{st.icon}</span>
                  <span className="g25-name">{c.pillar}</span>
                </div>
                <div className="g25-metrics">
                  <span className="g25-score">{c.score != null ? fmtScore(c.score) : '—'}</span>
                  <span className="g25-rank">{c.rank != null ? `Rank #${c.rank}` : '—'}</span>
                </div>
                <div className="g25-bar"><div className="g25-bar-fill" style={{ width: pct + '%', background: st.color }} /></div>
                <div className="g25-caption">{c.subs.join(' · ')}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* filter row — YEAR (fixed 2025) | COUNTRY */}
      <div className="panel filterbar gari-filterbar">
        <div className="flt">
          <label className="flt-label">Year</label>
          <div className="flt-select-wrap">
            <select className="flt-select" value={YEAR} disabled>
              <option value={YEAR}>2025</option>
            </select>
            <svg className="flt-caret" width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="#6B7280" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
        </div>
        <div className="flt">
          <label className="flt-label">Country</label>
          <div className="flt-select-wrap">
            <select className="flt-select" value={country} onChange={e => setCountry(e.target.value)}>
              {countryOpts.map(c => <option key={c.country} value={c.country}>{c.country}</option>)}
            </select>
            <svg className="flt-caret" width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="#6B7280" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
        </div>
      </div>

      {/* two-column: sub-pillar rank profile (left) + sub-indicators table (right) */}
      <div className="nri2-grid">
        <div className="panel">
          <div className="panel-head panel-head-row">
            <div className="ph-titles">
              <div className="panel-title">Sub-pillar Rank Profile · <span>{selLabel}</span> · <span style={{ color: GARI_DARK, fontWeight: 600 }}>{country}</span></div>
              <div className="panel-sub">Click a country bar to switch focus · Hover over a bar for score details</div>
            </div>
            <div className="chart-head-ctrls">
              <ChartResetButton onReset={resetProfile} />
              <ChartViewControl view={profileView} onView={setProfileView} count={profAll ? cmpRows.length : null} />
            </div>
          </div>
          <div className="panel-body">
            <CountryBarChart rows={cmpRows} selectedCountry={country} onPick={setCountry} fixedRows={profAll} widthByScore />
          </div>
          <ClassFoot pub="Government AI Readiness Index" year={YEAR} />
        </div>

        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">Sub-pillars · <span style={{ fontWeight: 600 }}>{selPillar || '—'}</span> · <span style={{ color: GARI_DARK, fontWeight: 600 }}>{country}</span></div>
            <div className="panel-sub">Click a row to update the rank profile chart →</div>
          </div>
          <div className="subtable-wrap">
            <table className="subtable">
              <thead>
                <tr>
                  <th className="th-ind">Indicator</th>
                  <th>Rank {YEAR}</th>
                  <th>Score {YEAR}</th>
                </tr>
              </thead>
              <tbody>
                <tr className={'row-data row-overall' + (selSub === 'Overall' ? ' selected' : '')}
                  onClick={() => setSelSub('Overall')} style={{ cursor: 'pointer', background: hexTint(GARI_ACCENT, 0.05) }}>
                  <td className="td-ind" style={{ fontWeight: 600 }}>Overall</td>
                  <td className="td-rank">{pillarOverall && pillarOverall.r != null ? <span className="td-rank-inner">{pillarOverall.r}<span className="muted" style={{ fontWeight: 400 }}>{ordinal(pillarOverall.r)}</span></span> : <span className="muted">—</span>}</td>
                  <td className="td-num">{pillarOverall && pillarOverall.sc != null ? fmtScore(pillarOverall.sc) : <span className="muted">—</span>}</td>
                </tr>
                {subRows.map((s, i) => {
                  const isSel = selSub === s.sub;
                  const clickable = s.rank != null;
                  return (
                    <tr key={s.sub} className={'row-data' + (i % 2 === 0 ? ' row-even' : '') + (isSel ? ' selected' : '')}
                      onClick={() => clickable && setSelSub(s.sub)} style={{ cursor: clickable ? 'pointer' : 'default' }}>
                      <td className="td-ind depth1">{s.sub}</td>
                      <td className="td-rank">{s.rank != null ? <span className="td-rank-inner">{s.rank}<span className="muted" style={{ fontWeight: 400 }}>{ordinal(s.rank)}</span></span> : <span className="muted">—</span>}</td>
                      <td className="td-num cell-score">{s.score != null ? fmtScore(s.score) : <span className="muted">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <ClassFoot pub="Government AI Readiness Index" year={YEAR} />
        </div>
      </div>

      <GARIPageFoot />
    </>
  );
}

Object.assign(window, { GARIOverallView, GARIPillarPage, GARIPillarMainCard, GARIMatrixTable, GARIPageFoot, GARI2025FrameworkView, GARI_ACCENT, GARI_DARK, GARI_LIGHT });

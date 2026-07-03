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
      <span className="src-link" style={{ color: GARI_DARK }}>Oxford Insights</span> · Annual
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
                    <span className="nm-flag" title={fl ? undefined : r.country}>{fl ? <img src={fl} alt="" onError={e => e.currentTarget.remove()} /> : null}</span>
                    <span className={'nm-name' + (r.isMe ? ' me' : '')}>{r.country}</span>
                  </div>
                </td>
                {r.cells.map(c => (
                  <td key={c.sub} className={'nm-rank' + (r.isMe ? ' nm-rank-me' : '')}
                    style={r.isMe ? { color: GARI_DARK, fontWeight: 700 } : null}
                    onMouseMove={c.rank != null ? e => setTip({ x: e.clientX, y: e.clientY, t: `${r.country} · ${c.sub} · Rank ${c.rank}${ordinal(c.rank)} · Score ${fmtScore(c.score)}` }) : undefined}
                    onMouseLeave={() => setTip(null)}>
                    {c.rank != null ? formatOrdinal(c.rank) : '—'}
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
  const [banner, setBanner] = React.useState(true);
  // R7 AI1 — Era filter removed; Year now spans the full continuous 2020–2025
  // history (Overall rank is confirmed cross-era comparable), defaulting to 2025.
  const years = React.useMemo(() => gariYears(), []);
  const [year, setYear] = React.useState(years.includes(2025) ? 2025 : (years[0] || 2025));
  const [country, setCountry] = React.useState('Singapore');

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
  // header trend now spans a rolling 5-year window ending at the latest year
  // (R8 Change 3) — Overall rank is the one value confirmed cross-era comparable.
  const trend = gariOverallSeries(country);
  const trendYears = trend.map(p => p.y);
  const trendLabel = trendYears.length ? (Math.min(...trendYears) + '\u2013' + Math.max(...trendYears)) : '';

  const rows = attachYoYGariOverall(ranking, year);

  return (
    <>
      {/* methodology banner — R7 AI1: moved above the header card so it's the first
         thing a viewer sees, before looking at any data. */}
      {banner && (
        <div className="gari-fw-banner">
          <span className="gfb-icon">ⓘ</span>
          <span className="gfb-text">The 2025 framework was significantly restructured. Sub-pillar scores below are not directly comparable to 2020–2024 values. Overall rank remains a valid cross-era reference point; sub-pillar scores are not.</span>
          <button className="gfb-dismiss" onClick={() => setBanner(false)} aria-label="Dismiss">✕</button>
        </div>
      )}

      {/* header card */}
      <div className="panel header-card imd-header ov-imd-card">
        <div className="hc-accent" style={{ background: GARI_ACCENT }} />
        <div className="hc-left">
          <div className="hc-name">Government AI Readiness Index <span className="hc-country" style={{ color: GARI_DARK }}>· {country}</span></div>
          <div className="hc-def">{stripPublishedBy(GARI_DESC)} <ExtLinkIcon url={GARI_URL} color={GARI_DARK} /></div>
          <GariSource />
          <div className="ov-imd-datanote">* Overall rank data available from 2020</div>
        </div>
        <div className="hc-rank">
          <div className="hc-rank-eyebrow">Overall Rank</div>
          <div className="rank-line">
            <span className="rank-number">{overall && overall.rank != null ? overall.rank : '—'}</span>
            {overall && overall.rank != null && <sup className="rank-ordinal">{ordinal(overall.rank)}</sup>}
          </div>
          <div className="hc-block-label">{year}</div>
          <div className={'hc-yoy ' + yoy.cls}>{yoy.arrow && <span>{yoy.arrow}</span>}<span>{yoy.txt}</span></div>
        </div>
        <div className="hc-trend">
          <div className="hc-trend-label">Ranking Trend · {trendLabel}</div>
          <RankTrendChart series={trend} country={country} color={GARI_ACCENT} />
        </div>
      </div>

      {/* filter row — YEAR | COUNTRY (Era filter removed per R7 AI1) */}
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
              {countryOpts.map(c => <option key={c.country} value={c.country}>{c.country}</option>)}
            </select>
            <svg className="flt-caret" width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="#6B7280" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
        </div>
      </div>

      {/* overall ranking bar chart */}
      <div className="panel ov-imd-chart gari-chart">
        <div className="panel-head panel-head-row">
          <div className="ph-titles">
            <div className="panel-title">Overall GARI Ranking ({year})</div>
            <div className="panel-sub">Click on a country to explore its sub-indicators · Showing {rows.length} countries</div>
          </div>
        </div>
        {ranking.length ? (
          <div className="panel-body">
            <CountryBarChart rows={rows} selectedCountry={country} onPick={setCountry} fixedRows widthByScore />
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
  const def = stripPublishedBy(defOf(GARI_PUB, P, 'Overall', '') || GARI_PILLAR_DEF[P] || '');
  const yoy = (year === 2020) ? { cls: 'yoy-neutral', arrow: '', txt: 'No prior year ranking' }
    : gariRankYoY(cur ? cur.r : null, prev ? prev.r : null, year - 1);
  const pills = gariPillarSubs(P, country, year);
  return (
    <div className="panel header-card imd-header ov-imd-card">
      <div className="hc-accent" style={{ background: GARI_ACCENT }} />
      <div className="hc-left">
        <div className="hc-name">{window.ovIcon && window.ovIcon(GARI_PUB, P) ? <span aria-hidden="true" style={{ marginRight: 7 }}>{window.ovIcon(GARI_PUB, P)}</span> : null}{P} <span className="hc-country" style={{ color: GARI_DARK }}>· {country}</span></div>
        {def && <div className="hc-def">{def} <ExtLinkIcon url={GARI_URL} color={GARI_DARK} /></div>}
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
        <div className="hc-block-label">{year}</div>
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

  const cmpRows = attachYoY(ranked, GARI_PUB, P, year, 'Overall', '');

  const matrix = gariPillarMatrix(P, year, 'all', country || 'Singapore');

  const tableRows = gariSubIndTable(P, country, year);

  // rank cell with up/down/held arrow comparing rank vs prevRank
  function rankCell(rank, prevRank) {
    if (rank == null) return <span className="muted">—</span>;
    let arrow = <span className="td-arrow muted">—</span>;
    if (prevRank != null && rank < prevRank) arrow = <span className="td-arrow" style={{ color: 'var(--color-up)' }}>↑</span>;
    else if (prevRank != null && rank > prevRank) arrow = <span className="td-arrow" style={{ color: 'var(--color-down)' }}>↓</span>;
    return <span className="td-rank-inner">{formatOrdinal(rank)}{arrow}</span>;
  }

  let leafCount = 0;

  return (
    <>
      <GARIPillarMainCard domain={domain} pillar={P} country={country} year={year} />

      <FilterBar years={years} countries={countryOpts} year={year} country={country}
        onYear={setYear} onCountry={setCountry} yearLocked={false} hint={false} />

      {/* country rank comparison chart */}
      <div className="panel ov-imd-chart gari-chart">
        <div className="panel-head panel-head-row">
          <div className="ph-titles">
            <div className="panel-title"><span style={{ fontWeight: 600 }}>{P}</span> – Country Rank Comparison ({year})</div>
            <div className="panel-sub">Click on a country to explore its sub-indicators · Showing {cmpRows.length} countries</div>
          </div>
        </div>
        <div className="panel-body">
          <CountryBarChart rows={cmpRows} selectedCountry={country} onPick={setCountry} fixedRows widthByScore />
        </div>
        <ClassFoot pub="Government AI Readiness Index" year={year} />
      </div>

      {/* two-column: sub-pillar rank profile matrix + sub-indicators table */}
      <div className="nri2-grid">
        {/* matrix */}
        <div className="panel">
          <div className="panel-head panel-head-row">
            <div className="ph-titles">
              <div className="panel-title">Comparison of sub-pillars across countries · <span style={{ color: GARI_DARK, fontWeight: 600 }}>{country}</span></div>
              <div className="panel-sub">Click a country row to focus</div>
            </div>
          </div>
          <div className="nri-matrix-wrap scroll">
            <GARIMatrixTable matrix={matrix} selectedCountry={country} onPickCountry={setCountry} />
          </div>
          <div className="gari-matrix-foot"><span>{matrix.rows.length} countries shown</span><span>Oxford Insights</span></div>
        </div>

        {/* sub-indicators table (2-level) */}
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">Comparison of sub-indicators across countries · <span style={{ color: GARI_DARK, fontWeight: 600 }}>{country}</span></div>
            <div className="panel-sub">All dimensions and sub-indicators shown · scores reflect selected year</div>
          </div>
          <div className="subtable-wrap">
            <table className="subtable">
              <thead>
                <tr>
                  <th className="th-ind">Indicator</th>
                  <th>Rank {year}</th>
                  <th>Rank {prevYear}</th>
                  <th>Score {year}</th>
                  <th>Score {prevYear}</th>
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
                      <td className="td-rank">{rankCell(r.rank, r.prevRank)}</td>
                      <td className="td-rank">{r.prevRank != null ? formatOrdinal(r.prevRank) : <span className="muted">—</span>}</td>
                      <td className="td-num">{r.score != null ? fmtScore(r.score) : <span className="muted">—</span>}</td>
                      <td className="td-num">{r.prevScore != null ? fmtScore(r.prevScore) : <span className="muted">—</span>}</td>
                      <td className="td-num">{gariScoreYoYCell(r.score, r.prevScore)}</td>
                    </tr>;
                  }
                  leafCount++;
                  return <tr key={i} className={'nri-row-leaf' + (leafCount % 2 === 0 ? ' row-even' : '')}>
                    <td className="td-ind depth1">{r.label}</td>
                    <td className="td-rank">{rankCell(r.rank, r.prevRank)}</td>
                    <td className="td-rank">{r.prevRank != null ? formatOrdinal(r.prevRank) : <span className="muted">—</span>}</td>
                    <td className="td-num cell-score">{r.score != null ? fmtScore(r.score) : <span className="muted">—</span>}</td>
                    <td className="td-num">{r.prevScore != null ? fmtScore(r.prevScore) : <span className="muted">—</span>}</td>
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

  const ranking = gariOverallRanking(YEAR);
  const cards = React.useMemo(() => gari2025Cards(country), [country]);
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

  // Shared pillar selection (Fix 4) — driven equally by the Pillars dropdown and the
  // pillar cards. 'All' stacks every pillar's sub-indicators in the table and shows
  // the overall GARI ranking in the rank-profile chart.
  const [selPillar, setSelPillar] = React.useState('All');
  const [selSub, setSelSub] = React.useState('Overall');
  React.useEffect(() => {
    if (selPillar !== 'All' && cards.length && !cards.some(c => c.pillar === selPillar)) {
      setSelPillar('All'); setSelSub('Overall');
    }
  }, [cards.length]); // eslint-disable-line
  const isAll = selPillar === 'All';

  // sub-indicators table model — single pillar, or all pillars stacked ('All')
  const tableModel = React.useMemo(() => {
    const rows = [];
    const list = isAll ? cards : cards.filter(c => c.pillar === selPillar);
    for (const c of list) {
      if (isAll) rows.push({ kind: 'header', pillar: c.pillar, label: c.pillar });
      const po = gariPillarOverall(c.pillar, country, YEAR);
      rows.push({ kind: 'overall', pillar: c.pillar, label: 'Overall', rank: po ? po.r : null, score: po ? po.sc : null });
      for (const s of gariPillarSubs(c.pillar, country, YEAR)) {
        rows.push({ kind: 'leaf', pillar: c.pillar, sub: s.sub, label: s.sub, rank: s.rank, score: s.score });
      }
    }
    return rows;
  }, [isAll, selPillar, cards, country]);

  const cmpRows = isAll
    ? attachYoYGariOverall(gariOverallRanking(YEAR), YEAR)
    : attachYoY(gariCompare(selPillar, selSub === 'Overall' ? 'Overall' : selSub, YEAR, 'all', country || 'Singapore'), GARI_PUB, selPillar, YEAR, selSub === 'Overall' ? 'Overall' : selSub, '');

  function pickCard(p) {
    if (selPillar === p) { setSelPillar('All'); setSelSub('Overall'); }
    else { setSelPillar(p); setSelSub('Overall'); }
  }
  function onPillarFilter(v) { setSelPillar(v); setSelSub('Overall'); }
  function pickRow(r) {
    if (r.kind === 'overall') { setSelPillar(r.pillar); setSelSub('Overall'); }
    else if (r.kind === 'leaf' && r.rank != null) { setSelPillar(r.pillar); setSelSub(r.sub); }
  }
  function resetProfile() { setSelPillar('All'); setSelSub('Overall'); }
  const selLabel = isAll ? 'Overall · All pillars' : (selSub === 'Overall' ? selPillar : selPillar + ' · ' + selSub);

  return (
    <>
      {/* header card — Title/Definition | Overall Rank | Framework stats */}
      <div className="panel header-card imd-header ov-imd-card gari-fw-header">
        <div className="hc-accent" style={{ background: GARI_ACCENT }} />
        <div className="hc-left">
          <div className="hc-name">Government AI Readiness Index <span className="hc-country" style={{ color: GARI_DARK }}>· {country} · 2025</span></div>
          <div className="hc-def">The 2025 edition introduces a restructured 6-pillar framework. Results are not directly comparable to previous editions due to a change in methodology. <ExtLinkIcon url={GARI_URL} color={GARI_DARK} /></div>
          <GariSource />
          <div className="ov-imd-datanote">* Sub-pillar data reflects the 2025 framework only — no prior-year comparison available</div>
        </div>
        <div className="hc-rank">
          <div className="hc-rank-eyebrow">Overall Rank</div>
          <div className="rank-line">
            <span className="rank-number">{overall && overall.rank != null ? overall.rank : '—'}</span>
            {overall && overall.rank != null && <sup className="rank-ordinal">{ordinal(overall.rank)}</sup>}
          </div>
          <div className="hc-block-label">2025</div>
          <div className={'hc-yoy ' + yoy.cls}>{yoy.arrow && <span>{yoy.arrow}</span>}<span>{yoy.txt}</span></div>
        </div>
      </div>

      {/* pillar cards grid — 6 cards, 3×2; click to drive the chart + table below (Fix 8) */}
      <div className="gari-2025">
        <div className="gari-2025-sub">New 6-pillar framework · {country} highlighted</div>
        <div className="gari-2025-grid">
          {cards.map(c => {
            const icon = (window.ovIcon && window.ovIcon(GARI_PUB, c.pillar)) || '';
            const active = c.pillar === selPillar;
            return (
              <div key={c.pillar} className={'gari-2025-card g25-card-v2 g25-clickable' + (active ? ' g25-active' : '')}
                onClick={() => pickCard(c.pillar)} role="button" tabIndex={0}>
                <div className="g25-head">
                  <span className="g25-badge" style={{ background: hexTint(GARI_ACCENT, 0.12), color: GARI_DARK }}>{icon}</span>
                  <span className="g25-name">{c.pillar}</span>
                </div>
                <div className="g25-rankbig">{c.rank != null ? <>{c.rank}<sup>{ordinal(c.rank)}</sup></> : '—'}</div>
                <div className="g25-scoresub">Score: {c.score != null ? fmtScore(c.score) : '—'}</div>
                {c.subs.length > 0 && (
                  <div className="g25-subpills">
                    {c.subs.map(s => <span key={s} className="g25-subpill">{s}</span>)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* filter row — YEAR (fixed 2025) | COUNTRY | PILLARS (Fix 4) */}
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
        <div className="flt">
          <label className="flt-label">Pillars</label>
          <div className="flt-select-wrap">
            <select className="flt-select" value={selPillar} onChange={e => onPillarFilter(e.target.value)}>
              <option value="All">All</option>
              {cards.map(c => <option key={c.pillar} value={c.pillar}>{c.pillar}</option>)}
            </select>
            <svg className="flt-caret" width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="#6B7280" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
        </div>
      </div>

      {/* two-column: sub-pillar rank profile (left) + sub-indicators table (right) */}
      <div className="nri2-grid">
        <div className="panel gari-chart gari-profile-fill">
          <div className="panel-head panel-head-row">
            <div className="ph-titles">
              <div className="panel-title">Comparison of sub-pillars across countries · <span style={{ color: GARI_DARK, fontWeight: 600 }}>{country}</span></div>
              <div className="panel-sub">Click on a country to explore its sub-indicators · Showing {cmpRows.length} countries</div>
            </div>
          </div>
          <div className="panel-body">
            <CountryBarChart rows={cmpRows} selectedCountry={country} onPick={setCountry} fixedRows widthByScore />
          </div>
          <ClassFoot pub="Government AI Readiness Index" year={YEAR} />
        </div>

        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">Sub-pillars · <span style={{ fontWeight: 600 }}>{isAll ? 'All pillars' : selPillar}</span> · <span style={{ color: GARI_DARK, fontWeight: 600 }}>{country}</span></div>
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
                {(() => {
                  let leafCount = 0;
                  return tableModel.map((r, i) => {
                    if (r.kind === 'header') {
                      return <tr key={i} className="nri-row-subhdr gari-row-hdr"><td className="td-ind" colSpan={3}>{r.label.toUpperCase()}</td></tr>;
                    }
                    const isOverallRow = r.kind === 'overall';
                    const sel = r.pillar === selPillar && (isOverallRow ? selSub === 'Overall' : selSub === r.sub);
                    const clickable = isOverallRow || r.rank != null;
                    if (isOverallRow) {
                      return (
                        <tr key={i} className={'row-data row-overall' + (sel ? ' selected' : '')}
                          onClick={() => pickRow(r)} style={{ cursor: 'pointer', background: hexTint(GARI_ACCENT, 0.05) }}>
                          <td className="td-ind" style={{ fontWeight: 600 }}>Overall</td>
                          <td className="td-rank">{r.rank != null ? <span className="td-rank-inner">{formatOrdinal(r.rank)}</span> : <span className="muted">—</span>}</td>
                          <td className="td-num">{r.score != null ? fmtScore(r.score) : <span className="muted">—</span>}</td>
                        </tr>
                      );
                    }
                    leafCount++;
                    return (
                      <tr key={i} className={'row-data' + (leafCount % 2 === 0 ? ' row-even' : '') + (sel ? ' selected' : '')}
                        onClick={() => pickRow(r)} style={{ cursor: clickable ? 'pointer' : 'default' }}>
                        <td className="td-ind depth1">{r.label}</td>
                        <td className="td-rank">{r.rank != null ? <span className="td-rank-inner">{formatOrdinal(r.rank)}</span> : <span className="muted">—</span>}</td>
                        <td className="td-num cell-score">{r.score != null ? fmtScore(r.score) : <span className="muted">—</span>}</td>
                      </tr>
                    );
                  });
                })()}
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

/* ============================================================
   DASHDE — Overall – NRI page family (mirrors the Overall – IMD pattern)
     • OverallNRIView   — Level-1 summary: main header card + overall
                          NRI country-rank chart only (no pillar cards /
                          profile / sub-indicators at this level).
     • NRIPillarPage    — Level-2 deep-dive: a complete standalone
                          dashboard for one NRI pillar (Technology /
                          People / Governance / Impact), each in its own
                          accent colour.
   Both use the internal-.site-scroll canvas (sticky top bar + Level
   0/1/2 nav, comfortable NRI-scale spacing). Self-contained: each owns
   its Year / Country / view state. All data reads use the shared live
   helpers — no data logic is rebuilt.
   ============================================================ */

/* per-pillar definition fallback (used only when the Overall row carries no definition) */
const NRI_PILLAR_DEF = {
  Technology: 'The Technology pillar lies at the very core of network participation, assessing the technology an economy can access and deploy — from connectivity and content to the adoption of future technologies such as AI, IoT and robotics.',
  People: 'The People pillar measures the application of ICTs by the three groups that make up a society — individuals, businesses and governments — capturing the human capital and digital skills essential to a networked economy.',
  Governance: 'The Governance pillar gauges the wider conditions that shape participation in the network economy — trust, regulation and inclusion — ensuring that the benefits of digital technologies are accessible to all.',
  Impact: 'The Impact pillar captures the economic, societal and sustainability outcomes that flow from network readiness, including the economy and its contribution to the Sustainable Development Goals (SDGs).',
};

const NRI_URL = 'https://networkreadinessindex.org/';

/* shared page footer (matches the Overall – IMD footer) */
function NRIPageFoot() {
  return (
    <div className="ov-imd-foot">
      <div className="ov-imd-foot-class">Classification: Official (Open)</div>
      <div className="ov-imd-foot-updated">{window.lastUpdatedStr ? window.lastUpdatedStr() : ''}</div>
    </div>
  );
}

/* distinct overall-NRI years, newest first */
function nriOverallYears() {
  const set = new Set();
  for (const r of (window.RECS || [])) if (r.p === 'NRI' && r.i === 'Network Readiness Index' && r.s === 'Overall' && r.t === '') set.add(r.y);
  return [...set].sort((a, b) => b - a);
}
/* distinct years a given pillar has overall (pillar-rank) data, newest first */
function nriPillarYears(P) {
  const set = new Set();
  for (const r of (window.RECS || [])) if (r.p === 'NRI' && r.i === P && r.s === 'Overall' && r.t === '') set.add(r.y);
  return [...set].sort((a, b) => b - a);
}

/* ============================================================
   Level 1 — Overall – NRI summary
   ============================================================ */
function OverallNRIView({ domain }) {
  const years = React.useMemo(() => nriOverallYears(), []);
  const [year, setYear] = React.useState(years[0] || 2025);
  const [country, setCountry] = React.useState('Singapore');
  const [view, setView] = React.useState('all'); // 'all' | 'sg'
  const countryColor = '#534AB7'; // unified NRI accent (purple) across the Overall – NRI tab

  const overall = nriOverall(country, year);
  const prevOverall = nriOverall(country, year - 1);
  const series = overallSeries('NRI', 'Network Readiness Index', country).filter(r => r.y <= year).slice(-5);

  const ranked = compareTop('NRI', 'Network Readiness Index', year, 'Overall', '', null); // every ranked country, asc
  const countryOpts = React.useMemo(
    () => ranked.map(r => ({ country: r.country })).sort((a, b) => a.country.localeCompare(b.country)),
    [year, ranked.length]
  );
  React.useEffect(() => {
    if (ranked.length && !ranked.some(r => r.country === country)) {
      setCountry(ranked.some(r => r.country === 'Singapore') ? 'Singapore' : ranked[0].country);
    }
  }, [year]); // eslint-disable-line

  const all = view === 'all';
  const rows = all ? ranked : compareWindow('NRI', 'Network Readiness Index', year, 'Overall', '', country || 'Singapore');
  function reset() { setView('all'); setCountry('Singapore'); }

  return (
    <>
      <NRIHeaderCard domain={domain} country={country} year={year} overall={overall} prev={prevOverall} series={series} accent={countryColor} eyebrow="Digital Economy · Publication · Overall" />

      <FilterBar years={years} countries={countryOpts} year={year} country={country}
        onYear={setYear} onCountry={setCountry} yearLocked={false} hint={false} />

      <div className="panel ov-imd-chart">
        <div className="panel-head panel-head-row">
          <div className="ph-titles">
            <div className="panel-title">Overall NRI Ranking · <span style={{ color: countryColor, fontWeight: 600 }}>{country}</span> ({year})</div>
            <div className="panel-sub">Click a country bar to switch focus · Hover over a bar for score details</div>
          </div>
          <div className="chart-head-ctrls">
            <ChartResetButton onReset={reset} />
            <ChartViewControl view={view} onView={setView} count={all ? rows.length : null} />
          </div>
        </div>
        <div className="panel-body">
          <CountryBarChart rows={rows} selectedCountry={country} onPick={setCountry} fixedRows={all} highlightColor={countryColor} />
        </div>
        <ClassFoot pub="NRI" year={year} />
      </div>

      <NRIPageFoot />
    </>
  );
}

/* ============================================================
   Level 2 — NRI pillar deep-dive: main card
   ============================================================ */
function NRIPillarMainCard({ domain, pillar, country, year, accent }) {
  const P = pillar;
  const series = overallSeries('NRI', P, country);
  const cur = series.find(r => r.y === year) || null;
  const prev = series.find(r => r.y === year - 1) || null;
  const def = defOf('NRI', P, 'Overall', '') || NRI_PILLAR_DEF[P] || '';
  const yoy = rankYoYText(cur, prev);
  const pdata = nriPillarData(country, year).find(c => c.pillar === P) || { subs: [] };
  const idp = 'nri' + P.toLowerCase().replace(/\s+/g, '') + 'spk';
  const subLabel = s => (window.NRI_SUBLABEL && window.NRI_SUBLABEL[s]) || s;
  const recent5 = series.filter(r => r.y <= year).slice(-5);
  return (
    <div className="panel header-card imd-header ov-imd-card">
      <div className="hc-accent" style={{ background: accent }} />
      <div className="hc-left">
        <div className="hc-eyebrow">Digital Economy · NRI Pillar</div>
        <div className="hc-name">{P} <span className="hc-country" style={{ color: accent }}>· {country}</span></div>
        {def && <div className="hc-def">{def}</div>}
        <div className="hc-source">
          <a className="src-link" style={{ color: accent }} href={NRI_URL} target="_blank" rel="noopener noreferrer">NRI</a> · Portulans Institute · Annual
        </div>
        <div className="nri2-tags">
          {pdata.subs.slice(0, 3).map(s => (
            <span key={s.name} className="nri-pill">{subLabel(s.name)} · {s.rank != null ? s.rank + ordinal(s.rank) : '—'}</span>
          ))}
        </div>
        <div className="ov-imd-datanote">* Pillar rank data available from 2022</div>
      </div>
      <div className="hc-rank">
        <div className="rank-line">
          <span className="rank-number">{cur && cur.r != null ? cur.r : '—'}</span>
          {cur && cur.r != null && <sup className="rank-ordinal">{ordinal(cur.r)}</sup>}
        </div>
        <div className="hc-block-label">Pillar rank · {year}</div>
        <div className={'hc-yoy ' + yoy.cls}>{yoy.arrow && <span>{yoy.arrow}</span>}<span>{yoy.txt}</span></div>
      </div>
      <div className="hc-trend">
        <div className="hc-trend-label">Ranking trend</div>
        <RankTrendChart series={recent5} country={country} color={accent} />
      </div>
    </div>
  );
}

/* ============================================================
   Level 2 — NRI pillar deep-dive: full standalone dashboard
   ============================================================ */
function NRIPillarPage({ domain, pillar }) {
  const P = pillar;
  const accent = '#534AB7'; // unified NRI accent (purple) for all four pillar deep-dives
  const years = React.useMemo(() => nriPillarYears(P), [P]);
  const [year, setYear] = React.useState(years[0] || 2025);
  const [country, setCountry] = React.useState('Singapore');
  const [chartView, setChartView] = React.useState('all');   // country comparison chart
  const [profileView, setProfileView] = React.useState('all'); // sub-pillar profile / drill chart
  const [third, setThird] = React.useState(null);              // {sub, third, label} drill-down
  const [subPillarFilter, setSubPillarFilter] = React.useState('all'); // Sub-Pillars filter

  const subPillarOptions = nriSubPillars(P, year); // 3 sub-pillar groups for this pillar/year
  // Year change keeps the Sub-Pillars selection; fall back to All only when it
  // no longer exists for the newly selected year.
  React.useEffect(() => {
    if (subPillarFilter !== 'all' && !subPillarOptions.includes(subPillarFilter)) setSubPillarFilter('all');
  }, [P, year, subPillarOptions.join('|')]); // eslint-disable-line

  // reset pillar-scoped state when pillar / country / year changes
  React.useEffect(() => { setThird(null); }, [P, country, year]);
  React.useEffect(() => { setYear(prev => years.includes(prev) ? prev : (years[0] || prev)); }, [P]); // eslint-disable-line

  const prevYear = year - 1;
  const ranked = compareTop('NRI', P, year, 'Overall', '', null); // every ranked country, asc (pillar overall)
  const countryOpts = React.useMemo(
    () => ranked.map(r => ({ country: r.country })).sort((a, b) => a.country.localeCompare(b.country)),
    [P, year, ranked.length]
  );
  React.useEffect(() => {
    if (ranked.length && !ranked.some(r => r.country === country)) {
      setCountry(ranked.some(r => r.country === 'Singapore') ? 'Singapore' : ranked[0].country);
    }
  }, [P, year]); // eslint-disable-line

  // country rank comparison chart
  const allCmp = chartView === 'all';
  const cmpRows = allCmp ? ranked : compareWindow('NRI', P, year, 'Overall', '', country || 'Singapore');

  // sub-pillar rank profile + third-tier drill
  const drill = !!third;
  const profAll = profileView === 'all';
  const matrix = drill ? null : filterMatrixBySub(nriSubPillarMatrix(P, year, profAll ? 'all' : 'sg'), subPillarFilter);
  const drillRows = drill
    ? (profAll
        ? compareTop('NRI', P, year, third.sub, third.third, null)
        : compareWindow('NRI', P, year, third.sub, third.third, 'Singapore'))
    : null;

  // 3-level sub-indicators table
  const tableRows = filterBySubPillar(nriPillarTable(P, country, year), subPillarFilter);
  let subIdx = 0, leafIdx = 0;
  const numbered = tableRows.map(r => {
    const o = { ...r };
    if (r.kind === 'nri-subhdr') { subIdx++; leafIdx = 0; o.num = `${subIdx}. `; }
    else if (r.kind === 'nri-overall2') { o.num = `${subIdx}. `; }
    else if (r.kind === 'leaf') { leafIdx++; o.num = `${subIdx}.${leafIdx} `; }
    return o;
  });

  function leafClick(r) {
    if (r.kind !== 'leaf' || r.rank == null) return;
    const key = r.sub + '|' + r.third;
    if (third && (third.sub + '|' + third.third) === key) setThird(null);
    else setThird({ sub: r.sub, third: r.third, label: r.label });
  }
  function resetCmpChart() { setChartView('all'); setCountry('Singapore'); setSubPillarFilter('all'); }
  function resetProfileChart() { setProfileView('all'); setThird(null); setSubPillarFilter('all'); }

  let leafCount = 0;
  const RankCell = window.RankCell, YoYCell = window.YoYCell;

  return (
    <>
      <NRIPillarMainCard domain={domain} pillar={P} country={country} year={year} accent={accent} />

      {/* filter bar — Year + Country (pillar is fixed by the Level 2 tab) */}
      <FilterBar years={years} countries={countryOpts} year={year} country={country}
        onYear={setYear} onCountry={setCountry} yearLocked={false} hint={false}
        subPillarOptions={subPillarOptions} subPillarValue={subPillarFilter} onSubPillar={setSubPillarFilter} />

      {/* country rank comparison chart */}
      <div className="panel ov-imd-chart">
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
          <CountryBarChart rows={cmpRows} selectedCountry={country} onPick={setCountry} fixedRows={allCmp} highlightColor={accent} />
        </div>
        <ClassFoot pub="NRI" year={year} />
      </div>

      {/* two-column: sub-pillar rank profile + sub-indicators table */}
      <div className="nri2-grid">
        {/* sub-pillar rank profile / third-tier drill */}
        <div className="panel">
          <div className="panel-head panel-head-row">
            <div className="ph-titles">
              <div className="panel-title">{drill
                ? <><span className="ind-chip">{third.label}</span> · {profAll ? 'All' : 'Singapore'} Country Rank Comparison</>
                : <>Sub-pillar Rank Profile · <span>{P}</span> · <span style={{ color: accent, fontWeight: 600 }}>{country}</span></>}</div>
              <div className="panel-sub">{drill ? 'Hover over a bar for score details' : 'Click a country row to focus it · Hover a cell for score details'}</div>
            </div>
            <div className="chart-head-ctrls">
              <ChartResetButton onReset={resetProfileChart} />
              <ChartViewControl view={profileView} onView={setProfileView} count={profAll ? (drill ? (drillRows ? drillRows.length : 0) : (matrix ? matrix.rows.length : 0)) : null} />
            </div>
          </div>
          {drill
            ? <div className="panel-body">
                <CountryBarChart rows={drillRows} selectedCountry={country} onPick={setCountry} fixedRows={profAll} highlightColor={accent} />
              </div>
            : <div className={'nri-matrix-wrap' + (profAll ? ' scroll' : '')}>
                <NRISubPillarTable matrix={matrix} accent={accent} selectedCountry={country} onPickCountry={setCountry} />
              </div>}
          <ClassFoot pub="NRI" year={year} />
        </div>

        {/* sub-indicators table */}
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">Sub-indicators · <span style={{ fontWeight: 600 }}>{P}</span> · <span style={{ color: accent, fontWeight: 600 }}>{country}</span></div>
            <div className="panel-sub">Click a third-tier indicator to see its country rank comparison</div>
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
                {numbered.map((r, i) => {
                  if (r.kind === 'nri-pillar') {
                    return <tr key={i} className="nri-row-pillar" style={{ '--pc': accent, background: hexTint(accent, 0.06) }}>
                      <td className="td-ind" style={{ color: accent }}>{P}</td>
                      <td className="td-rank">{r.prevRank != null ? r.prevRank : <span className="muted">—</span>}</td>
                      <RankCell rank={r.rank} delta={r.rankDelta} />
                      <td className="td-num">{r.prevScore != null ? fmtScore(r.prevScore) : <span className="muted">—</span>}</td>
                      <td className="td-num">{r.score != null ? fmtScore(r.score) : <span className="muted">—</span>}</td>
                      <YoYCell delta={r.delta} />
                    </tr>;
                  }
                  if (r.kind === 'nri-overall1') {
                    return <tr key={i} className="nri-row-overall2" style={{ background: hexTint(accent, 0.04) }}>
                      <td className="td-ind" style={{ fontWeight: 500 }}>{r.label}</td>
                      <td className="td-rank">{r.prevRank != null ? r.prevRank : <span className="muted">—</span>}</td>
                      <RankCell rank={r.rank} delta={r.rankDelta} />
                      <td className="td-num">{r.prevScore != null ? fmtScore(r.prevScore) : <span className="muted">—</span>}</td>
                      <td className="td-num">{r.score != null ? fmtScore(r.score) : <span className="muted">—</span>}</td>
                      <YoYCell delta={r.delta} />
                    </tr>;
                  }
                  if (r.kind === 'nri-subhdr') {
                    return <tr key={i} className="nri-row-subhdr"><td className="td-ind" colSpan={6}>{r.num}{r.label}</td></tr>;
                  }
                  if (r.kind === 'nri-overall2') {
                    return <tr key={i} className="nri-row-overall2" style={{ background: hexTint(accent, 0.04) }}>
                      <td className="td-ind">{r.num}{r.label}</td>
                      <td className="td-rank">{r.prevRank != null ? r.prevRank : <span className="muted">—</span>}</td>
                      <RankCell rank={r.rank} delta={r.rankDelta} />
                      <td className="td-num">{r.prevScore != null ? fmtScore(r.prevScore) : <span className="muted">—</span>}</td>
                      <td className="td-num">{r.score != null ? fmtScore(r.score) : <span className="muted">—</span>}</td>
                      <YoYCell delta={r.delta} />
                    </tr>;
                  }
                  // leaf
                  leafCount++;
                  const clickable = r.rank != null;
                  const key = r.sub + '|' + r.third;
                  const sel = third && (third.sub + '|' + third.third) === key;
                  return (
                    <tr key={i} className={'nri-row-leaf' + (leafCount % 2 === 0 ? ' row-even' : '') + (clickable ? ' clickable' : '') + (sel ? ' selected' : '')}
                      onClick={() => leafClick(r)}>
                      <td className="td-ind">{r.num}{r.label}</td>
                      <td className="td-rank">{r.prevRank != null ? r.prevRank : <span className="muted">—</span>}</td>
                      <RankCell rank={r.rank} delta={r.rankDelta} />
                      <td className="td-num">{r.prevScore != null ? fmtScore(r.prevScore) : <span className="muted">—</span>}</td>
                      <td className="td-num cell-score">{r.score != null ? fmtScore(r.score) : <span className="muted">—</span>}</td>
                      <YoYCell delta={r.delta} />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <ClassFoot pub="NRI" year={year} />
        </div>
      </div>

      <NRIPageFoot />
    </>
  );
}

Object.assign(window, { OverallNRIView, NRIPillarPage, NRIPillarMainCard, NRIPageFoot, nriOverallYears, nriPillarYears });

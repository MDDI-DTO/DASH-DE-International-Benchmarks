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

  const rows = attachYoY(ranked, 'NRI', 'Network Readiness Index', year, 'Overall', '');

  return (
    <>
      <NRIHeaderCard domain={domain} country={country} year={year} overall={overall} prev={prevOverall} series={series} accent={countryColor} eyebrow="Digital Economy · Publication · Overall" />

      <FilterBar years={years} countries={countryOpts} year={year} country={country}
        onYear={setYear} onCountry={setCountry} yearLocked={false} hint={false} />

      <div className="panel ov-imd-chart">
        <div className="panel-head panel-head-row">
          <div className="ph-titles">
            <div className="panel-title">Overall Country Rank Comparison ({year})</div>
            <div className="panel-sub">Click on a country to explore its ranking trend · Showing {rows.length} countries</div>
          </div>
        </div>
        <div className="panel-body">
          <CountryBarChart rows={rows} selectedCountry={country} onPick={setCountry} fixedRows highlightColor={countryColor} />
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
  const def = stripPublishedBy(defOf('NRI', P, 'Overall', '') || NRI_PILLAR_DEF[P] || '');
  const yoy = rankYoYText(cur, prev);
  const pdata = nriPillarData(country, year).find(c => c.pillar === P) || { subs: [] };
  const idp = 'nri' + P.toLowerCase().replace(/\s+/g, '') + 'spk';
  const subLabel = s => (window.NRI_SUBLABEL && window.NRI_SUBLABEL[s]) || s;
  const recent5 = series.filter(r => r.y <= year).slice(-5);
  return (
    <div className="panel header-card imd-header ov-imd-card">
      <div className="hc-accent" style={{ background: accent }} />
      <div className="hc-left">
        <div className="hc-name">{window.ovIcon && window.ovIcon('NRI', P) ? <span aria-hidden="true" style={{ marginRight: 7 }}>{window.ovIcon('NRI', P)}</span> : null}{P} <span className="hc-country" style={{ color: accent }}>· {country}</span></div>
        {def && <div className="hc-def">{def} <ExtLinkIcon url={NRI_URL} color={accent} /></div>}
        <div className="hc-source">
          <span className="src-link" style={{ color: accent }}>Portulans Institute</span> · Annual
        </div>
        <div className="nri2-tags">
          {pdata.subs.slice(0, 3).map(s => (
            <span key={s.name} className="nri-pill">{subLabel(s.name)} · {s.rank != null ? s.rank + ordinal(s.rank) : '—'}</span>
          ))}
        </div>
        <div className="ov-imd-datanote">* Pillar rank data available from 2022</div>
      </div>
      <div className="hc-rank">
        <div className="hc-rank-eyebrow">Overall rank</div>
        <div className="rank-line">
          <span className="rank-number">{cur && cur.r != null ? cur.r : '—'}</span>
          {cur && cur.r != null && <sup className="rank-ordinal">{ordinal(cur.r)}</sup>}
        </div>
        <div className="hc-block-label">{year}</div>
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
  const [third, setThird] = React.useState(null);              // {sub, third, label} drill-down
  const [subPillarFilter, setSubPillarFilter] = React.useState('all'); // Sub-Pillars filter
  const [info, setInfo] = React.useState(null);                 // definition slide-out row

  const subPillarOptions = nriSubPillars(P, year); // 3 sub-pillar groups for this pillar/year
  // Year change keeps the Sub-Pillars selection; fall back to All only when it
  // no longer exists for the newly selected year.
  React.useEffect(() => {
    if (subPillarFilter !== 'all' && !subPillarOptions.includes(subPillarFilter)) setSubPillarFilter('all');
  }, [P, year, subPillarOptions.join('|')]); // eslint-disable-line

  // reset pillar-scoped state when pillar / year changes. Country change must not
  // clear the drill-down (third-tier) selection — clicking a country bar in the
  // drill chart should only re-highlight that country and stay in that view.
  React.useEffect(() => { setThird(null); }, [P, year]);
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
  const cmpRows = attachYoY(ranked, 'NRI', P, year, 'Overall', '');

  // sub-pillar rank profile + third-tier drill
  const drill = !!third;
  const matrix = drill ? null : filterMatrixBySub(nriSubPillarMatrix(P, year, 'all'), subPillarFilter);
  const drillRows = drill ? attachYoY(compareTop('NRI', P, year, third.sub, third.third, null), 'NRI', P, year, third.sub, third.third) : null;

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
            <div className="panel-sub">Click on a country to explore its indicators · Showing {cmpRows.length} countries</div>
          </div>
        </div>
        <div className="panel-body">
          <CountryBarChart rows={cmpRows} selectedCountry={country} onPick={setCountry} fixedRows highlightColor={accent} />
        </div>
        <ClassFoot pub="NRI" year={year} />
      </div>

      {/* two-column: sub-pillar rank profile + sub-indicators table */}
      <div className="nri2-grid">
        {/* sub-pillar rank profile / third-tier drill */}
        <div className="panel">
          <div className="panel-head panel-head-row">
            <div className="ph-titles">
              {drill && (
                <button type="button" className="indicator-back-btn" style={{ color: accent }} onClick={() => setThird(null)}>← Back to sub-pillar overview</button>
              )}
              <div className="panel-title">{drill
                ? <><span className="ind-chip">{third.label}</span> · Comparison across countries · <span style={{ color: accent, fontWeight: 600 }}>{country}</span></>
                : <>Comparison of sub-pillars across countries · <span style={{ color: accent, fontWeight: 600 }}>{country}</span></>}</div>
              <div className="panel-sub">Click on a country to explore its indicators · Showing {drill ? (drillRows ? drillRows.length : 0) : (matrix ? matrix.rows.length : 0)} countries</div>
            </div>
          </div>
          {drill
            ? <div className="panel-body">
                <CountryBarChart rows={drillRows} selectedCountry={country} onPick={setCountry} fixedRows highlightColor={accent} />
              </div>
            : <div className="nri-matrix-wrap scroll">
                <NRISubPillarTable matrix={matrix} accent={accent} selectedCountry={country} onPickCountry={setCountry} />
              </div>}
          <ClassFoot pub="NRI" year={year} />
        </div>

        {/* sub-indicators table */}
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">Comparison of sub-pillar indicators · <span style={{ color: accent, fontWeight: 600 }}>{country}</span></div>
            <div className="panel-sub">Click on an indicator to explore its country comparison · Click ⓘ for definition</div>
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
                {numbered.map((r, i) => {
                  if (r.kind === 'nri-pillar') {
                    return <tr key={i} className="nri-row-pillar" style={{ '--pc': accent, background: hexTint(accent, 0.06) }}>
                      <td className="td-ind" style={{ color: accent }}>{P}</td>
                      <RankCell rank={r.rank} delta={r.rankDelta} />
                      <td className="td-rank">{r.prevRank != null ? formatOrdinal(r.prevRank) : <span className="muted">—</span>}</td>
                      <td className="td-num">{r.score != null ? fmtScore(r.score) : <span className="muted">—</span>}</td>
                      <td className="td-num">{r.prevScore != null ? fmtScore(r.prevScore) : <span className="muted">—</span>}</td>
                      <YoYCell delta={r.delta} />
                    </tr>;
                  }
                  if (r.kind === 'nri-overall1') {
                    return <tr key={i} className="nri-row-overall2" style={{ background: hexTint(accent, 0.04) }}>
                      <td className="td-ind" style={{ fontWeight: 500 }}>{r.label}</td>
                      <RankCell rank={r.rank} delta={r.rankDelta} />
                      <td className="td-rank">{r.prevRank != null ? formatOrdinal(r.prevRank) : <span className="muted">—</span>}</td>
                      <td className="td-num">{r.score != null ? fmtScore(r.score) : <span className="muted">—</span>}</td>
                      <td className="td-num">{r.prevScore != null ? fmtScore(r.prevScore) : <span className="muted">—</span>}</td>
                      <YoYCell delta={r.delta} />
                    </tr>;
                  }
                  if (r.kind === 'nri-subhdr') {
                    return <tr key={i} className="nri-row-subhdr"><td className="td-ind" colSpan={6}>{r.num}{r.label}</td></tr>;
                  }
                  if (r.kind === 'nri-overall2') {
                    return <tr key={i} className="nri-row-overall2" style={{ background: hexTint(accent, 0.04) }}>
                      <td className="td-ind">{r.num}{r.label}</td>
                      <RankCell rank={r.rank} delta={r.rankDelta} />
                      <td className="td-rank">{r.prevRank != null ? formatOrdinal(r.prevRank) : <span className="muted">—</span>}</td>
                      <td className="td-num">{r.score != null ? fmtScore(r.score) : <span className="muted">—</span>}</td>
                      <td className="td-num">{r.prevScore != null ? fmtScore(r.prevScore) : <span className="muted">—</span>}</td>
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
                      <td className="td-ind">
                        {r.num}{r.label}
                        {r.hasDef && (
                          <button className="info-btn info-inline" title="View definition"
                            onClick={e => { e.stopPropagation(); setInfo(r); }}>ⓘ</button>
                        )}
                      </td>
                      <RankCell rank={r.rank} delta={r.rankDelta} />
                      <td className="td-rank">{r.prevRank != null ? formatOrdinal(r.prevRank) : <span className="muted">—</span>}</td>
                      <td className="td-num cell-score">{r.score != null ? fmtScore(r.score) : <span className="muted">—</span>}</td>
                      <td className="td-num">{r.prevScore != null ? fmtScore(r.prevScore) : <span className="muted">—</span>}</td>
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

      <DefinitionPanel row={info} pillar={{ pub: 'NRI', indicator: P, tab: P }} year={year} onClose={() => setInfo(null)} />

      <NRIPageFoot />
    </>
  );
}

Object.assign(window, { OverallNRIView, NRIPillarPage, NRIPillarMainCard, NRIPageFoot, nriOverallYears, nriPillarYears });

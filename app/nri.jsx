/* ============================================================
   DASHDE — NRI (Network Readiness Index) special layout
   2025-only: no YoY, no trend, no definition slide-out.
   ============================================================ */

function NRIHeaderCard({ domain, country, year, overall, prev, series, pillarColor, accent, eyebrow }) {
  const ac = accent || pillarColor || '#534AB7';
  const def = defOf('NRI', 'Network Readiness Index', 'Overall', '') || (window.PILLAR_CONTEXT && window.PILLAR_CONTEXT['nri']) || '';
  const yoy = window.rankYoYText(overall, prev);
  const trend = (series || []).filter(p => p.r != null);
  const startY = trend.length ? trend[0].y : year;
  const endY = trend.length ? trend[trend.length - 1].y : year;
  return (
    <div className="panel header-card imd-header">
      <div className="hc-accent" style={{ background: ac }} />
      <div className="hc-left">
        <div className="hc-eyebrow">{eyebrow || (domain + ' · Pillar')}</div>
        <div className="hc-name">Network Readiness Index (NRI) <span className="hc-country" style={{ color: ac }}>· {country}</span></div>
        {def && <div className="hc-def">{def}</div>}
        <div className="hc-source"><a className="src-link" style={{ color: ac }} href="https://networkreadinessindex.org/" target="_blank" rel="noopener noreferrer">NRI</a> · Portulans Institute · Annual</div>
      </div>
      <div className="hc-rank">
        <div className="rank-line">
          <span className="rank-number">{overall && overall.r != null ? overall.r : '—'}</span>
          {overall && overall.r != null && <sup className="rank-ordinal">{ordinal(overall.r)}</sup>}
        </div>
        <div className="hc-block-label">Overall rank · {year}</div>
        <div className={'hc-yoy ' + yoy.cls}>{yoy.arrow && <span>{yoy.arrow}</span>}<span>{yoy.txt}</span></div>
      </div>
      <div className="hc-trend">
        <div className="hc-trend-label">Ranking trend · {startY}–{endY}</div>
        <RankTrendChart series={series} country={country} color={ac} />
      </div>
    </div>
  );
}

function NRIPillarCard({ card, year, prevYear, selected, onSelect }) {
  const yoy = (card.rank != null && card.prevRank != null)
    ? (card.prevRank > card.rank ? { cls: 'yoy-up', a: '↑' }
      : card.prevRank < card.rank ? { cls: 'yoy-down', a: '↓' }
      : { cls: 'yoy-neutral', a: '—' })
    : null;
  return (
    <button className={'nri-card' + (selected ? ' selected' : '')} style={{ '--cardc': card.color }} onClick={onSelect}>
      <div className="nri-card-top" style={{ background: card.color }} />
      <div className="nri-card-name">{card.pillar}</div>
      <div className="nri-card-rankline">
        <span className="nri-card-rank">{card.rank != null ? card.rank : '—'}</span>
        {card.rank != null && <sup className="nri-card-ord">{ordinal(card.rank)}</sup>}
      </div>
      <div className="nri-card-label">Overall rank · {year}</div>
      <div className={'nri-card-yoy ' + (yoy ? yoy.cls : 'yoy-neutral')}>
        {yoy
          ? (yoy.cls === 'yoy-neutral'
              ? <>— unchanged from {prevYear}</>
              : <>{yoy.a} from {card.prevRank}{ordinal(card.prevRank)} in {prevYear}</>)
          : <span className="muted">No prior-year ranking</span>}
      </div>
      <div className="nri-card-score">Score: <b>{card.score != null ? fmtScore(card.score) : '—'}</b></div>
      <div className="nri-card-pills">
        {card.subs.slice(0, 3).map(s => (
          <span key={s.name} className="nri-pill">{(window.NRI_SUBLABEL && window.NRI_SUBLABEL[s.name]) || s.name} · {s.rank != null ? s.rank + ordinal(s.rank) : '—'}</span>
        ))}
      </div>
    </button>
  );
}

/* ---------- Sub-pillar rank comparison table (replaces profile chart) ---------- */
function NRISubPillarTable({ matrix, accent, selectedCountry, onPickCountry }) {
  const [tip, setTip] = React.useState(null);
  if (!matrix || !matrix.rows.length) return <div className="nri-matrix-empty">No data available.</div>;
  const subLabel = sub => (window.NRI_SUBLABEL && window.NRI_SUBLABEL[sub]) || sub;
  return (
    <>
      <table className="nri-matrix" style={{ '--nm-accent': accent }}>
        <thead>
          <tr>
            <th className="nm-country">Country</th>
            {matrix.subs.map(s => <th key={s} className="nm-sub">{subLabel(s)}</th>)}
          </tr>
        </thead>
        <tbody>
          {matrix.rows.map(r => {
            const fl = flagUrl(r.country);
            const isSel = r.country === selectedCountry;
            // active focus country gets the pillar-tinted highlight; Singapore keeps its bold name
            const rowStyle = isSel ? { background: hexTint(accent, 0.07) }
              : r.isMe ? { background: hexTint(accent, 0.04) } : null;
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
                  <td key={c.sub} className="nm-rank"
                    onMouseMove={c.rank != null ? e => setTip({ x: e.clientX, y: e.clientY, t: `${r.country} · ${subLabel(c.sub)} · Rank ${c.rank}${ordinal(c.rank)} · Score ${fmtScore(c.score)}` }) : undefined}
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

function NRIView({ domain, years, country, year, onPickCountry, onYear }) {
  const [pillar, setPillar] = React.useState('Technology'); // Technology active by default (point 7)
  const [third, setThird] = React.useState(null); // {sub, third, label}
  const [overallView, setOverallView] = React.useState('all');
  const [subView, setSubView] = React.useState('all'); // right (pillar) ranking chart All/Singapore
  const [profileView, setProfileView] = React.useState('all');
  const [subPillarFilter, setSubPillarFilter] = React.useState('all'); // Sub-Pillars filter (sub-indicator table only)

  React.useEffect(() => { setThird(null); setSubPillarFilter('all'); }, [pillar, country, year]);

  const prevYear = year - 1;
  const overall = nriOverall(country, year);
  const prevOverall = nriOverall(country, prevYear);
  // 5 most recent years of overall NRI rank (up to the selected year) for the trend chart
  const nriSeries = overallSeries('NRI', 'Network Readiness Index', country).filter(r => r.y <= year).slice(-5);
  const yearOptions = (years && years.length) ? years : [year];
  const activePillar = pillar; // always set (defaults to Technology)
  const allOverall = overallView === 'all';
  const overallRows = allOverall
    ? compareTop('NRI', 'Network Readiness Index', year, 'Overall', '', null)
    : compareWindow('NRI', 'Network Readiness Index', year, 'Overall', '', 'Singapore');
  // top-10 country ranking for the currently selected pillar's overall rank (right chart)
  const subAll = subView === 'all';
  const subPillarRows = subAll
    ? compareTop('NRI', activePillar, year, 'Overall', '', null)
    : compareWindow('NRI', activePillar, year, 'Overall', '', 'Singapore');
  const subPillarOptions = nriSubPillars(activePillar, year);
  const cards = nriPillarData(country, year);
  const tableRows = filterBySubPillar(nriPillarTable(activePillar, country, year), subPillarFilter);
  const pc = (window.NRI_COLORS && window.NRI_COLORS[activePillar]) || 'var(--color-nri)';
  // main-card country name: ALWAYS the NRI accent (#0E7490 cyan/steel) regardless of selected pillar (point 6)
  const countryColor = '#0E7490';

  const drill = !!third;
  const profAll = profileView === 'all';
  const matrix = drill ? null : nriSubPillarMatrix(activePillar, year, profAll ? 'all' : 'sg');
  const drillRows = drill
    ? (profAll
        ? compareTop('NRI', activePillar, year, third.sub, third.third, null)
        : compareWindow('NRI', activePillar, year, third.sub, third.third, 'Singapore'))
    : null;

  // numbering for the 3-level table
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

  // reset handlers (point 1) — chart-scoped only; never touch Year/Country filters
  function resetOverallChart() { setOverallView('all'); onPickCountry('Singapore'); }
  function resetSubPillarChart() { setSubView('all'); setPillar('Technology'); }
  function resetProfileChart() { setProfileView('all'); setThird(null); }

  let leafCount = 0;
  const RankCell = window.RankCell, YoYCell = window.YoYCell;
  return (
    <>
      <NRIHeaderCard domain={domain} country={country} year={year} overall={overall} prev={prevOverall} series={nriSeries} pillarColor={countryColor} />

      {/* 4 pillar cards — single full-width row (now above the ranking charts) */}
      <div className="nri-cards">
        {cards.map(c => <NRIPillarCard key={c.pillar} card={c} year={year} prevYear={prevYear} selected={c.pillar === pillar} onSelect={() => setPillar(c.pillar)} />)}
      </div>
      <div className="nri-cards-note">ⓘ Click a pillar card to explore its sub-indicators</div>

      {/* filter bar — now ABOVE the ranking charts. Pillar dropdown syncs the right chart,
          the rank-profile table and the selected card; Sub-Pillars filters the sub-indicator table only. */}
      <FilterBar years={yearOptions} countries={countriesFor({ pub: 'NRI', indicator: 'Network Readiness Index', layout: 'nri' }, year)}
        year={year} country={country} onYear={onYear} onCountry={onPickCountry} yearLocked={false} hint={false}
        pillarOptions={['Technology', 'People', 'Governance', 'Impact']} pillarValue={pillar} onPillar={setPillar}
        subPillarOptions={subPillarOptions} subPillarValue={subPillarFilter} onSubPillar={setSubPillarFilter} />

      {/* ranking charts row — overall NRI ranking (left) + selected-pillar ranking (right) */}
      <div className="nri-charts-row">
        <div className="panel nri-overview-chart">
          <div className="panel-head panel-head-row">
            <div className="ph-titles">
              <div className="panel-title">Overall NRI Ranking · <span style={{ color: countryColor, fontWeight: 600 }}>{country}</span> ({year})</div>
              <div className="panel-sub">Hover over a bar for score details</div>
            </div>
            <div className="chart-head-ctrls">
              <ChartResetButton onReset={resetOverallChart} />
              <ChartViewControl view={overallView} onView={setOverallView} count={allOverall ? overallRows.length : null} />
            </div>
          </div>
          <div className={'panel-body' + (allOverall ? ' body-scroll' : '')}>
            <CountryBarChart rows={overallRows} selectedCountry={country} onPick={onPickCountry} fixedRows={allOverall} />
          </div>
          <ClassFoot pub="NRI" year={year} />
        </div>

        <div className="panel nri-overview-chart">
          <div className="panel-head panel-head-row">
            <div className="ph-titles">
              <div className="panel-title">Overall NRI Pillar Rankings · <span style={{ color: pc, fontWeight: 600 }}>{activePillar}</span> · <span style={{ color: countryColor, fontWeight: 600 }}>{country}</span> ({year})</div>
              <div className="panel-sub">Hover over a bar for score details</div>
            </div>
            <div className="chart-head-ctrls">
              <ChartResetButton onReset={resetSubPillarChart} />
              <ChartViewControl view={subView} onView={setSubView} count={subAll ? subPillarRows.length : null} />
            </div>
          </div>
          <div className={'panel-body' + (subAll ? ' body-scroll' : '')}>
            <CountryBarChart rows={subPillarRows} selectedCountry={country} interactive={false} fixedRows={subAll} />
          </div>
          <ClassFoot pub="NRI" year={year} />
        </div>
      </div>

      {/* two-column: sub-pillar comparison table + sub-indicator table */}
      <div className="panel-row grow">
        <div className="panel">
          <div className="panel-head panel-head-row">
            <div className="ph-titles">
              <div className="panel-title">{drill
                ? <><span className="ind-chip">{third.label}</span> · {profAll ? 'All' : 'Singapore'} Country Rank Comparison</>
                : <>Sub-pillar Rank Profile · <span style={{ color: pc }}>{activePillar}</span> · <span style={{ color: pc, fontWeight: 600 }}>{country}</span></>}</div>
              <div className="panel-sub">{drill ? 'Hover over a bar for score details' : 'Click a country row to focus it · Hover a cell for score details'}</div>
            </div>
            <div className="chart-head-ctrls">
              <ChartResetButton onReset={resetProfileChart} />
              <ChartViewControl view={profileView} onView={setProfileView} count={profAll ? (drill ? (drillRows ? drillRows.length : 0) : (matrix ? matrix.rows.length : 0)) : null} />
            </div>
          </div>
          {drill
            ? <div className={'panel-body' + (profAll ? ' body-scroll' : '')}>
                <CountryBarChart rows={drillRows} selectedCountry={country} interactive={false} fixedRows={profAll} />
              </div>
            : <div className={'nri-matrix-wrap' + (profAll ? ' scroll' : '')}>
                <NRISubPillarTable matrix={matrix} accent={pc} selectedCountry={country} onPickCountry={onPickCountry} />
              </div>}
          <ClassFoot pub="NRI" year={year} />
        </div>

        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">Sub-indicators · <span style={{ color: pc, fontWeight: 600 }}>{activePillar}</span> · <span style={{ color: pc, fontWeight: 600 }}>{country}</span></div>
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
                    const rowColor = (window.NRI_COLORS && (window.NRI_COLORS[r.indicator] || window.NRI_COLORS[r.label])) || pc;
                    return <tr key={i} className="nri-row-pillar" style={{ '--pc': rowColor, background: hexTint(rowColor, 0.06) }}>
                      <td className="td-ind" style={{ color: rowColor }}>{activePillar}</td>
                      <td className="td-rank">{r.prevRank != null ? formatOrdinal(r.prevRank) : <span className="muted">—</span>}</td>
                      <RankCell rank={r.rank} delta={r.rankDelta} />
                      <td className="td-num">{r.prevScore != null ? fmtScore(r.prevScore) : <span className="muted">—</span>}</td>
                      <td className="td-num">{r.score != null ? fmtScore(r.score) : <span className="muted">—</span>}</td>
                      <YoYCell delta={r.delta} />
                    </tr>;
                  }
                  if (r.kind === 'nri-overall1') {
                    return <tr key={i} className="nri-row-overall2" style={{ background: 'rgba(10,110,168,0.04)' }}>
                      <td className="td-ind" style={{ fontWeight: 500 }}>{r.label}</td>
                      <td className="td-rank">{r.prevRank != null ? formatOrdinal(r.prevRank) : <span className="muted">—</span>}</td>
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
                    return <tr key={i} className="nri-row-overall2" style={{ background: hexTint(pc, 0.04) }}>
                      <td className="td-ind">{r.num}{r.label}</td>
                      <td className="td-rank">{r.prevRank != null ? formatOrdinal(r.prevRank) : <span className="muted">—</span>}</td>
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
                      <td className="td-rank">{r.prevRank != null ? formatOrdinal(r.prevRank) : <span className="muted">—</span>}</td>
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
    </>
  );
}

// filter the 3-level NRI sub-indicator table down to a single sub-pillar group
// (keeps that group's header, overall row and leaf rows; drops pillar-level + other groups)
function filterBySubPillar(rows, sub) {
  if (!sub || sub === 'all') return rows;
  const out = [];
  let cur = null;
  for (const r of rows) {
    if (r.kind === 'nri-pillar' || r.kind === 'nri-overall1') continue;
    if (r.kind === 'nri-subhdr') { cur = r.label; if (cur === sub) out.push(r); continue; }
    if (cur === sub) out.push(r);
  }
  return out;
}

// filter a sub-pillar rank matrix down to a single sub-pillar column
// (keeps every country row, drops the other sub-pillar columns)
function filterMatrixBySub(matrix, sub) {
  if (!matrix || !sub || sub === 'all' || !matrix.subs.includes(sub)) return matrix;
  return { subs: [sub], rows: matrix.rows.map(r => ({ ...r, cells: r.cells.filter(c => c.sub === sub) })) };
}

// quick hex→rgba tint for inline pillar tints
function hexTint(hex, a) {
  if (!hex || hex[0] !== '#') return `rgba(10,110,168,${a})`;
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

Object.assign(window, { NRIView, NRIHeaderCard, NRIPillarCard, NRISubPillarTable, hexTint, filterBySubPillar, filterMatrixBySub });

/* ============================================================
   DASHDE — GAI (Global AI Index · Tortoise Media) special layout
   Single-edition data today (2024 only): no YoY, no sparkline trend,
   no sub-pillar definitions. Every "trend"/"YoY" element is gated on
   the count of distinct editions (years.length) so it auto-activates
   the moment a second year of GAI data lands — no code change needed.
   Tangerine accent family. Scrollable, mirrors the NRI tab structure
   and reuses the shared chart / filter / footer primitives.
   ============================================================ */

const GAI_ACCENT = '#BE185D'; // rose — borders, active states
const GAI_DARK   = '#9D1450'; // darker rose — text/links on light
const GAI_LIGHT  = '#FDF0F5'; // pale rose — pill / note backgrounds
/* all three pillar cards share the one accent (per spec) */
function gaiDimColor() { return GAI_ACCENT; }

/* ---------- header card: Title/Definition | Overall Rank | Ranking Trend ---------- */
function GAIHeaderCard({ domain, country, year, overall, series, editions }) {
  const def = stripPublishedBy(defOf('Global AI Index', 'Overall', '', '') || (window.PILLAR_CONTEXT && window.PILLAR_CONTEXT['gai']) || '');
  const multi = editions >= 2;
  // YoY only meaningful with >=2 editions; computed from the live series, never hardcoded
  const sorted = (series || []).filter(p => p.r != null).sort((a, b) => a.y - b.y);
  const cur = sorted.length ? sorted[sorted.length - 1] : (overall || null);
  const prev = sorted.length >= 2 ? sorted[sorted.length - 2] : null;
  const yoy = multi && window.rankYoYText ? window.rankYoYText(cur, prev) : null;
  return (
    <div className="panel header-card imd-header gai-header">
      <div className="hc-accent" style={{ background: GAI_ACCENT }} />
      <div className="hc-left">
        <div className="hc-name">Global AI Index <span className="hc-country" style={{ color: GAI_DARK }}>· {country}</span></div>
        {def && <div className="hc-def">{def} <ExtLinkIcon url={(window.PUB_URL && window.PUB_URL['Global AI Index'])} color={GAI_DARK} /></div>}
        <div className="hc-source"><span className="src-link" style={{ color: GAI_DARK }}>Tortoise Media & The Observer</span> · Annual</div>
      </div>
      <div className="hc-rank">
        <div className="hc-rank-eyebrow">Overall Rank</div>
        <div className="rank-line">
          <span className="rank-number">{overall && overall.r != null ? overall.r : '—'}</span>
          {overall && overall.r != null && <sup className="rank-ordinal">{ordinal(overall.r)}</sup>}
        </div>
        <div className="hc-block-label">{year}</div>
        {multi
          ? <div className={'hc-yoy ' + yoy.cls}>{yoy.arrow && <span>{yoy.arrow}</span>}<span>{yoy.txt}</span></div>
          : <div className="hc-yoy yoy-neutral">No prior year ranking</div>}
      </div>
      <div className="hc-trend">
        <div className="hc-trend-label">Ranking Trend</div>
        {multi
          ? <RankTrendChart series={series} country={country} color={GAI_ACCENT} />
          : (
            <div className="gai-trend-note">
              <div className="gtn-title">Trend unavailable — single year</div>
              <div className="gtn-sub">Appears automatically once a second year of GAI data exists.</div>
            </div>
          )}
      </div>
    </div>
  );
}

/* ---------- pillar breakdown card ----------
   GAI pillars carry no sub_indicator='Overall' row, so there's no pillar-level rank.
   When one is absent we render the compact (no-rank) variant; if a future AI
   publication DOES carry pillar Overall rows, the full rank/score block returns. */
function GAIDimensionCard({ dim, po, subs, year, selected, onSelect, onPickSub }) {
  const hasOverall = !!(po && po.r != null);
  return (
    <div className={'nri-card gai-dim-card' + (selected ? ' selected' : '')} style={{ '--cardc': GAI_ACCENT }}
      onClick={onSelect} role="button" tabIndex={0}>
      <div className="nri-card-top" style={{ background: GAI_ACCENT }} />
      <div className="nri-card-name">{dim}</div>
      {hasOverall && (
        <>
          <div className="nri-card-rankline">
            <span className="nri-card-rank">{po.r}</span>
            <span className="nri-card-ord">{ordinal(po.r)}</span>
          </div>
          <div className="nri-card-label">Overall rank · {year}</div>
          <div className="gai-card-score">Score: <b>{po.sc != null ? fmtScore(po.sc) : '—'}</b></div>
        </>
      )}
      <div className="gai-pills" style={{ marginTop: hasOverall ? 11 : 6 }}>
        {subs.map(s => (
          <span key={s.sub} className="gai-pill" title={s.sub}
            onClick={e => { e.stopPropagation(); onPickSub(dim, s.sub); }}>
            {s.sub} · {s.rank != null ? <>{s.rank}<sup>{ordinal(s.rank)}</sup></> : '—'}
          </span>
        ))}
      </div>
      <div className="gai-card-cta-info">Click each <span style={{ color: GAI_ACCENT, fontWeight: 600 }}>sub-pillar</span> to view rankings</div>
    </div>
  );
}

/* R7 AI4 — small YoY rank-change arrow for the GAI table's current-year column,
   matching the Digital Economy tables' ↑/↓/— convention. Only rendered when a
   comparable prior-year rank exists. */
function gaiRankArrow(rank, prevRank) {
  if (rank == null || prevRank == null) return null;
  if (rank < prevRank) return <span className="td-arrow" style={{ color: 'var(--color-up)' }}>↑</span>;
  if (rank > prevRank) return <span className="td-arrow" style={{ color: 'var(--color-down)' }}>↓</span>;
  return <span className="td-arrow muted">—</span>;
}

function GAIView({ domain, years, country, year, onPickCountry, onYear, initialPillar, initialSubPillar }) {
  const dims = React.useMemo(() => gaiPillars(), []);
  const editions = (years || []).length;
  const yearOptions = (years && years.length) ? years : [year];
  // OV3 — show prior-year (RANK/SCORE) + YoY columns automatically once ≥2 editions exist.
  const showYoY = editions >= 2;
  const py = year - 1;
  const YoYCell = window.YoYCell;

  // R14 Change 3 — when arriving from the Overview card's sub-pillar link, land
  // directly on that pillar/sub-pillar instead of always defaulting to the first
  // pillar's first sub-pillar. Falls back to the old default when navigated to
  // directly (e.g. via the nav bar), or when the requested pillar/sub-pillar
  // isn't valid for the current country/year.
  const navSel = React.useMemo(() => {
    if (initialPillar && dims.includes(initialPillar)) {
      const subs = gaiPillarSubs(initialPillar, country, year);
      const sub = (initialSubPillar && subs.some(s => s.sub === initialSubPillar)) ? initialSubPillar : (subs.length ? subs[0].sub : null);
      return sub ? { dim: initialPillar, sub, label: sub } : null;
    }
    return null;
  }, [initialPillar, initialSubPillar, dims, country, year]);

  const defaultSel = React.useMemo(() => {
    const first = dims[0];
    const ss = first ? gaiPillarSubs(first, country, year) : [];
    return ss.length ? { dim: first, sub: ss[0].sub, label: ss[0].sub } : null;
  }, [dims, country, year]);

  const entrySel = navSel || defaultSel;

  // R11 Change 1 — GAI tab always has one pillar + one sub-pillar active, OR the
  // R14 Change 2 'All' aggregate state (no pillar card highlighted, full table shown).
  const [dimFilter, setDimFilter] = React.useState(() => (entrySel ? entrySel.dim : (dims[0] || null)));  // active pillar (cards + table + dropdown source) — 'All' or a pillar name
  const [subFilter, setSubFilter] = React.useState(() => (entrySel ? entrySel.sub : null));  // Sub-pillar dropdown value
  const [selected, setSelected] = React.useState(entrySel); // rank-profile chart subject

  // reset to the navigated-to (or default) pillar/sub-pillar whenever country/year change,
  // establishing a clean synced state — mirrors the reset-on-tab-entry requirement.
  React.useEffect(() => {
    setSelected(entrySel);
    setDimFilter(entrySel ? entrySel.dim : (dims[0] || null));
    setSubFilter(entrySel ? entrySel.sub : null);
  }, [country, year]); // eslint-disable-line

  // Sub-Pillars dropdown options = sub-pillars of the currently selected pillar only
  // (hidden entirely in the 'All' state — there's no single pillar to scope it to).
  const subPillarOptions = React.useMemo(
    () => (dimFilter && dimFilter !== 'All' ? gaiPillarSubs(dimFilter, country, year).map(s => s.sub) : null),
    [dimFilter, country, year]
  );

  // R14 Change 2 — Pillar dropdown options: 'All' + each GAI pillar, pulled live from
  // gaiPillars() (Supabase-derived), not hardcoded.
  const pillarOptions = React.useMemo(() => ['All', ...dims], [dims]);

  const overall = gaiOverallRow(country, year);
  const overallRanking = gaiOverallRanking(year);
  const overallSeries = React.useMemo(() => (window.gaiOverallSeries ? gaiOverallSeries(country) : []), [country]);

  const overallRows = attachYoY(overallRanking, 'Global AI Index', 'Overall', year, '', '');

  const tableRows = gaiTableModel(country, year, dimFilter);

  const sel = selected;
  const cmpRows = sel
    ? attachYoY(gaiCompare(sel.dim, sel.dim === 'Overall' ? null : sel.sub, year, 'all', 'Singapore'), 'Global AI Index', sel.dim, year, sel.dim === 'Overall' ? '' : sel.sub, '')
    : [];

  // ---- selection handlers (keep dropdown / cards / chart / table in sync) ----
  function pickSub(dim, sub) {
    setSelected({ dim, sub, label: sub });
    setSubFilter(sub);
    setDimFilter(dim);
  }
  function pickRow(r) {
    if (r.kind === 'poverall') { setSelected({ dim: r.dim, sub: 'Overall', label: r.dim + ' · Overall' }); setDimFilter(r.dim); return; }
    if (r.kind !== 'leaf' || r.rank == null) return;
    pickSub(r.dim, r.sub);
  }
  function pickCard(dim) {
    setDimFilter(dim);
    const ss = gaiPillarSubs(dim, country, year);
    const firstSub = ss.length ? ss[0].sub : null;
    setSubFilter(firstSub);
    setSelected(firstSub ? { dim, sub: firstSub, label: firstSub } : null);
  }
  function onSubFilter(v) {
    setSubFilter(v);
    setSelected({ dim: dimFilter, sub: v, label: v });
  }
  // R14 Change 2 — Pillar dropdown: 'All' clears the pillar-card selection and shows
  // the full grouped table + composite Overall comparison; a specific pillar behaves
  // exactly like clicking that pillar's card (kept in sync via shared dimFilter state).
  function onPillar(v) {
    if (v === 'All') {
      setDimFilter('All');
      setSubFilter(null);
      setSelected({ dim: 'Overall', sub: null, label: 'Overall' });
    } else {
      pickCard(v);
    }
  }

  const selKey = sel ? sel.dim + '|' + (sel.sub || '') : '';
  const dimLabel = dimFilter === 'All' ? 'Overall' : dimFilter;

  return (
    <>
      <GAIHeaderCard domain={domain} country={country} year={year} overall={overall} series={overallSeries} editions={editions} />

      {/* overall GAI ranking bar chart — full width */}
      <div className="panel nri-overview-chart gai-chart">
        <div className="panel-head panel-head-row">
          <div className="ph-titles">
            <div className="panel-title">Overall Country Rank Comparison ({year})</div>
            <div className="panel-sub">Click on a country to explore its indicators · Showing {overallRows.length} countries</div>
          </div>
        </div>
        {overallRanking.length ? (
          <div className="panel-body body-scroll">
            <CountryBarChart rows={overallRows} selectedCountry={country} onPick={onPickCountry} fixedRows widthByScore />
          </div>
        ) : (
          <div className="panel-body"><div className="es-sub" style={{ padding: '24px 0', textAlign: 'center' }}>Country ranking data unavailable.</div></div>
        )}
        <ClassFoot pub="Global AI Index" year={year} />
      </div>

      {/* filter bar — Year, Country, Pillar, Sub-pillar */}
      <FilterBar years={yearOptions} countries={countriesFor({ layout: 'gai' }, year)}
        year={year} country={country} onYear={onYear} onCountry={onPickCountry}
        yearLocked={yearOptions.length <= 1} hint={false}
        pillarOptions={pillarOptions} pillarValue={dimFilter} onPillar={onPillar}
        subPillarOptions={subPillarOptions} subPillarValue={subFilter} onSubPillar={onSubFilter} subPillarAllOption={false} />

      {/* pillar breakdown cards — one per pillar (no footer row) */}
      <div className="nri-cards gai-cards" style={{ gridTemplateColumns: `repeat(${Math.max(1, dims.length)}, 1fr)` }}>
        {dims.map(d => (
          <GAIDimensionCard key={d} dim={d} year={year}
            po={gaiPillarOverall(d, country, year)}
            subs={gaiPillarSubs(d, country, year)}
            selected={dimFilter === d} onSelect={() => pickCard(d)} onPickSub={pickSub} />
        ))}
      </div>

      {/* two-column: sub-pillar rank profile (left) + sub-pillar table (right) */}
      <div className="panel-row grow">
        <div className="panel gai-chart">
          <div className="panel-head panel-head-row">
            <div className="ph-titles">
              <div className="panel-title">Comparison of {dimLabel}{sel && sel.sub ? <> · <span style={{ color: GAI_ACCENT, fontWeight: 600 }}>{sel.sub}</span></> : ''} across countries · <span style={{ color: GAI_DARK, fontWeight: 700 }}>{country}</span></div>
              <div className="panel-sub">Click on a country to explore its sub-pillars · Showing {cmpRows.length} countries</div>
            </div>
          </div>
          <div className="panel-body body-scroll">
            <CountryBarChart rows={cmpRows} selectedCountry={country} onPick={onPickCountry} fixedRows widthByScore />
          </div>
          <ClassFoot pub="Global AI Index" year={year} />
        </div>

        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">Comparison of {dimLabel} sub-pillars · <span style={{ color: GAI_DARK, fontWeight: 700 }}>{country}</span></div>
            <div className="panel-sub">Click on a sub-pillar to explore its country comparison</div>
          </div>
          <div className="subtable-wrap">
            <table className="subtable">
              <thead>
                <tr>
                  <th className="th-ind">Sub-Pillar</th>
                  <th>Rank {year}</th>
                  {showYoY && <th>Rank {py}</th>}
                  <th>Score {year}</th>
                  {showYoY && <th>Score {py}</th>}
                  {showYoY && <th>YoY (Score)</th>}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let leafCount = 0;
                  return tableRows.map((r, i) => {
                    if (r.kind === 'overall') {
                      const isSel = selKey === 'Overall|';
                      return (
                        <tr key={i} className={'row-data row-overall' + (isSel ? ' selected' : '')} onClick={() => pickRow(r)} style={{ cursor: 'pointer' }}>
                          <td className="td-ind">Overall</td>
                          <td className="td-rank">{r.rank != null ? <span className="td-rank-inner">{formatOrdinal(r.rank)}{showYoY && gaiRankArrow(r.rank, r.prevRank)}</span> : <span className="muted">—</span>}</td>
                          {showYoY && <td className="td-rank">{r.prevRank != null ? formatOrdinal(r.prevRank) : <span className="muted">—</span>}</td>}
                          <td className="td-num">{r.score != null ? fmtScore(r.score) : <span className="muted">—</span>}</td>
                          {showYoY && <td className="td-num">{r.prevScore != null ? fmtScore(r.prevScore) : <span className="muted">—</span>}</td>}
                          {showYoY && <YoYCell delta={(r.score != null && r.prevScore != null) ? Math.round((r.score - r.prevScore) * 1000) / 1000 : null} />}
                        </tr>
                      );
                    }
                    if (r.kind === 'header') {
                      return <tr key={i} className="nri-row-pillar gai-row-dim" style={{ '--pc': GAI_DARK }}><td className="td-ind" colSpan={showYoY ? 6 : 3} style={{ color: GAI_DARK }}>{r.label}</td></tr>;
                    }
                    if (r.kind === 'poverall') {
                      const isSel = selKey === r.dim + '|Overall';
                      return (
                        <tr key={i} className={'row-data row-overall' + (isSel ? ' selected' : '')} onClick={() => pickRow(r)} style={{ cursor: 'pointer' }}>
                          <td className="td-ind depth1">Overall</td>
                          <td className="td-rank">{r.rank != null ? <span className="td-rank-inner">{formatOrdinal(r.rank)}{showYoY && gaiRankArrow(r.rank, r.prevRank)}</span> : <span className="muted">—</span>}</td>
                          {showYoY && <td className="td-rank">{r.prevRank != null ? formatOrdinal(r.prevRank) : <span className="muted">—</span>}</td>}
                          <td className="td-num">{r.score != null ? fmtScore(r.score) : <span className="muted">—</span>}</td>
                          {showYoY && <td className="td-num">{r.prevScore != null ? fmtScore(r.prevScore) : <span className="muted">—</span>}</td>}
                          {showYoY && <YoYCell delta={(r.score != null && r.prevScore != null) ? Math.round((r.score - r.prevScore) * 1000) / 1000 : null} />}
                        </tr>
                      );
                    }
                    leafCount++;
                    const key = r.dim + '|' + r.sub;
                    const isSel = selKey === key;
                    const clickable = r.rank != null;
                    return (
                      <tr key={i} className={'row-data' + (leafCount % 2 === 0 ? ' row-even' : '') + (isSel ? ' selected' : '')}
                        onClick={() => pickRow(r)} style={{ cursor: clickable ? 'pointer' : 'default' }}>
                        <td className="td-ind depth1">{r.label}</td>
                        <td className="td-rank">{r.rank != null ? <span className="td-rank-inner">{formatOrdinal(r.rank)}{showYoY && gaiRankArrow(r.rank, r.prevRank)}</span> : <span className="muted">—</span>}</td>
                        {showYoY && <td className="td-rank">{r.prevRank != null ? formatOrdinal(r.prevRank) : <span className="muted">—</span>}</td>}
                        <td className="td-num cell-score">{r.score != null ? fmtScore(r.score) : <span className="muted">—</span>}</td>
                        {showYoY && <td className="td-num">{r.prevScore != null ? fmtScore(r.prevScore) : <span className="muted">—</span>}</td>}
                        {showYoY && <YoYCell delta={(r.score != null && r.prevScore != null) ? Math.round((r.score - r.prevScore) * 1000) / 1000 : null} />}
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
          <ClassFoot pub="Global AI Index" year={year} />
        </div>
      </div>
    </>
  );
}

Object.assign(window, { GAIView, GAIHeaderCard, GAIDimensionCard, GAI_ACCENT, GAI_DARK, GAI_LIGHT, gaiDimColor });

/* ============================================================
   DASHDE — sub-indicator table + definition slide-out (IMD)
   ============================================================ */

function RankCell({ rank, delta }) {
  if (rank == null) return <td className="td-rank muted">—</td>;
  let arrow;
  if (delta > 0) arrow = <span className="td-arrow" style={{ color: 'var(--color-up)' }}>↑</span>;
  else if (delta < 0) arrow = <span className="td-arrow" style={{ color: 'var(--color-down)' }}>↓</span>;
  else arrow = <span className="td-arrow muted">—</span>;
  // formatOrdinal keeps the number + suffix as one inline unit so the flex gap on
  // .td-rank-inner sits only between the ordinal and the arrow (never "1 st").
  return <td className="td-rank"><span className="td-rank-inner">{formatOrdinal(rank)}{arrow}</span></td>;
}

function YoYCell({ delta }) {
  // Case D: no prior-year data (delta null) → dash only, muted, no numeric value
  if (delta == null) return <td className="td-yoy muted">—</td>;
  // Case A: prior-year exists but no meaningful change — float-safe zero OR a delta so small
  // it formats to "0" at display precision → "— 0" grey, never an arrow or colour.
  const fv = fmtScore(Math.abs(delta));
  if (Math.abs(delta) < 0.001 || fv === '0') return <td className="td-yoy muted">— 0</td>;
  // Case B: increase → green up arrow + value (no leading +)
  if (delta > 0) return <td className="td-yoy" style={{ color: 'var(--color-up)' }}>↑ {fmtScore(delta)}</td>;
  // Case C: decrease → red down arrow + negative value
  return <td className="td-yoy" style={{ color: 'var(--color-down)' }}>↓ -{fv}</td>;
}

/* ---------- sub-indicator table (flat WCY / grouped WDC) ---------- */
function TablePanel({ pillar, country, year, data, onInfo, selectedSub, onSelectSub }) {
  const rows = data.table || [];
  const prevYear = year - 1;
  const countryColor = PUB_COLOR[pillar.pub] || 'var(--color-text-primary)';

  // numbering counters
  let groupIdx = 0, leafIdx = 0;
  const numbered = rows.map(r => {
    const o = { ...r };
    if (pillar.layout === 'flat') {
      if (r.kind === 'leaf') { leafIdx++; o.num = `${leafIdx}. `; }
    } else { // grouped
      if (r.kind === 'header') { groupIdx++; leafIdx = 0; }
      else if (r.kind === 'group') { o.num = `${groupIdx}. `; }
      else if (r.kind === 'leaf') { leafIdx++; o.num = `${groupIdx}.${leafIdx} `; }
    }
    return o;
  });

  const hasPartial = numbered.some(r => (r.kind === 'leaf' || r.kind === 'group') && r.score == null);

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title">Sub-indicators · {pillar.tab} · <span style={{ color: countryColor, fontWeight: 600 }}>{country}</span></div>
        <div className="panel-sub">Click a row to see country comparison · Click ⓘ for definition</div>
      </div>
      {hasPartial && <div className="partial-note">Some indicators not available for {country}.</div>}
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
              if (r.kind === 'header') {
                return <tr key={i} className="row-group-hdr"><td className="td-ind" colSpan={6}>{r.label}</td></tr>;
              }
              const isOverall = r.kind === 'overall';
              const isGroup = r.kind === 'group';
              const cls = isOverall ? 'row-overall' : isGroup ? 'row-group row-data' : 'row-data';
              const even = !isOverall && !isGroup && (leafShade(numbered, i) % 2 === 1);
              const clickable = (isOverall || isGroup || r.kind === 'leaf') && r.rank != null;
              const isSel = !isOverall && selectedSub && selectedSub.sub === r.sub && selectedSub.third === r.third;
              const onRow = !clickable ? undefined : () => { isOverall ? onSelectSub(null) : onSelectSub(r); };
              return (
                <tr key={i} className={cls + (even ? ' row-even' : '') + (isSel ? ' selected' : '')}
                  style={{ cursor: clickable ? 'pointer' : 'default' }} onClick={onRow}>
                  <td className={'td-ind' + (r.depth === 1 ? ' depth1' : '')}>
                    {r.num || ''}{r.label}
                    {!isOverall && r.hasDef && (
                      <button className="info-btn info-inline" title="View definition"
                        onClick={e => { e.stopPropagation(); onInfo(r); }}>ⓘ</button>
                    )}
                  </td>
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
      <ClassFoot pub={pillar.pub} year={year} />
    </div>
  );
}

// alternating shade index counted only across leaf data rows
function leafShade(rows, upto) {
  let c = 0;
  for (let i = 0; i <= upto; i++) { const k = rows[i].kind; if (k === 'leaf' || k === 'group') c++; }
  return c;
}

/* ---------- definition slide-out panel (IMD only) ---------- */
function DefinitionPanel({ row, pillar, year, onClose }) {
  const open = !!row;
  const prevYear = year - 1;
  let unit = '';
  if (row) {
    const d = (window.DEFS || {})[`${pillar.pub}||${pillar.indicator}||${row.sub}||${row.third}`];
    unit = d && d.u ? d.u : '';
  }
  const delta = row ? row.delta : null;
  return (
    <BodyPortal>
    <div className={'defpanel-overlay' + (open ? ' open' : '')} onClick={onClose}>
      <div className="defpanel" onClick={e => e.stopPropagation()}>
        {row && <>
          <button className="defpanel-close" onClick={onClose}>✕</button>
          <div className="defpanel-name">{row.label}</div>
          <div className="defpanel-chip" style={{ background: PUB_COLOR[pillar.pub] }}>{PUB_SHORT[pillar.pub]} · {pillar.tab}</div>

          {row.def && (
            <div className="defpanel-section">
              <div className="defpanel-h">Definition</div>
              <div className="defpanel-def">{row.def}</div>
            </div>
          )}

          <div className="defpanel-scores">
            <div className="dps"><div className="dps-k">Score {prevYear}</div><div className="dps-v muted">{row.prevScore != null ? fmtScore(row.prevScore) : '—'}</div></div>
            <div className="dps"><div className="dps-k">Score {year}</div><div className="dps-v" style={{ color: 'var(--color-brand-blue)' }}>{row.score != null ? fmtScore(row.score) : '—'}</div></div>
            <div className="dps"><div className="dps-k">YoY change</div><div className="dps-v" style={{ color: delta == null ? 'var(--color-neutral)' : delta >= 0 ? 'var(--color-up)' : 'var(--color-down)' }}>
              {delta == null ? '—' : (delta >= 0 ? '▲ ' + fmtScore(delta) : '▼ -' + fmtScore(Math.abs(delta)))}
            </div></div>
          </div>

          <div className="defpanel-meta">
            <div className="meta-row"><span className="meta-k">Unit of measurement</span><span className="meta-v">{unit || '—'}</span></div>
            <div className="meta-row"><span className="meta-k">Publication</span><span className="meta-v">{PUB_FULL[pillar.pub] || pillar.pub}</span></div>
            <div className="meta-row"><span className="meta-k">Pillar</span><span className="meta-v">{pillar.tab}</span></div>
            <div className="meta-row"><span className="meta-k">Latest year</span><span className="meta-v">{year}</span></div>
          </div>
        </>}
      </div>
    </div>
    </BodyPortal>
  );
}

Object.assign(window, { TablePanel, DefinitionPanel, RankCell, YoYCell });

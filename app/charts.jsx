/* ============================================================
   DASHDE — SVG / chart components (scrollable rebuild)
   CountryBarChart · RankTrendChart · NRIProfileChart
   ============================================================ */

/* ---------- Top-10 horizontal country rank comparison ---------- */
function CountryBarChart({ rows, selectedCountry, onPick, interactive = true, fixedRows = false, highlightColor, widthByScore = false }) {
  const [tip, setTip] = React.useState(null);
  if (!rows || !rows.length) return <div className="es-sub" style={{ padding: '30px 0', textAlign: 'center' }}>No comparison data available.</div>;
  const n = rows.length;
  // score-based taper (GAI): bar length = score relative to the top score in the
  // CURRENT filtered subset, matching the IMD WCY reference. No min-width floor.
  const maxScore = widthByScore ? Math.max(0.0001, ...rows.map(r => (r.score != null ? r.score : 0))) : 0;
  return (
    <div className={'barchart' + (fixedRows ? ' barchart-scroll' : '')}>
      {rows.map((r, i) => {
        // highlighted bar = the selected country (whichever it is) — navy fill + bold name + ring.
        // Works on both interactive (left) and static (right) charts so they behave identically.
        const hi = r.country === selectedCountry;
        // bar length encodes rank position (better rank = longer) — directionality-agnostic
        const pct = widthByScore
          ? (r.score != null ? Math.max(2, (r.score / maxScore) * 100) : 2)
          : 100 - (i / Math.max(1, n)) * 52;
        return (
          <div key={r.country + i}
            className={'bar-row' + (interactive ? '' : ' static') + (hi ? ' selected' : '')}
            onClick={interactive && onPick ? () => onPick(r.country) : undefined}
            onMouseMove={e => setTip({ x: e.clientX, y: e.clientY, r })}
            onMouseLeave={() => setTip(null)}>
            <span className="bar-rank">{r.rank}{ordinal(r.rank)}</span>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: pct + '%', background: hi ? (highlightColor || 'var(--color-brand-navy)') : 'var(--color-bar-other)' }} />
              <span className={'bar-name' + (hi ? ' me' : '')}>{r.country}</span>
            </div>
            <span className="bar-flag">{flagUrl(r.country) ? <img src={flagUrl(r.country)} alt="" /> : null}</span>
          </div>
        );
      })}
      {tip && (
        <BodyPortal>
        <div className="chart-tip" style={{ left: Math.min(tip.x + 14, window.innerWidth - 220), top: tip.y + 14 }}>
          <b>{tip.r.country}</b> <span className="tip-dim">· Rank {tip.r.rank}{ordinal(tip.r.rank)} · Score: {fmtScore(tip.r.score)}</span>
        </div>
        </BodyPortal>
      )}
    </div>
  );
}

/* ---------- 5-year ranking trend with flag nodes (header card) ---------- */
function RankTrendChart({ series, country, color = '#0A6EA8' }) {
  // Measure the container so the SVG stretches to fill all remaining card space
  // while flag nodes stay perfectly circular (no preserveAspectRatio distortion).
  // Unique id prefix so multiple trend charts on one page (e.g. Overall – IMD WCY +
  // WDC) don't share gradient / clip ids and bleed colours into each other.
  const uid = React.useId().replace(/[:]/g, '');
  const gradId = uid + 'trendfill';
  const wrapRef = React.useRef(null);
  const [size, setSize] = React.useState({ w: 360, h: 150 });
  const measure = React.useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    // offsetWidth/Height are layout px — immune to the canvas' transform:scale,
    // unlike getBoundingClientRect which returns scaled screen px.
    const w = Math.round(el.offsetWidth), h = Math.round(el.offsetHeight);
    // Dead-band: ignore sub-2px deltas. The SVG is rendered at exactly the measured
    // size, so without this a scrollbar appearing/disappearing on a sibling panel can
    // nudge the width by 1px and set up a ResizeObserver feedback loop (the source of
    // the "Maximum update depth exceeded" crash that blanked the grouped WDC tabs).
    if (w > 0 && h > 0) setSize(prev => (Math.abs(prev.w - w) < 2 && Math.abs(prev.h - h) < 2) ? prev : { w, h });
  }, []);
  React.useLayoutEffect(() => {
    measure(); // synchronous initial measure before paint
    const el = wrapRef.current;
    if (!el) return;
    let ro;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => measure());
      ro.observe(el);
    }
    window.addEventListener('resize', measure);
    return () => { if (ro) ro.disconnect(); window.removeEventListener('resize', measure); };
    // Empty deps + a stable `measure` callback: subscribe ONCE on mount, never
    // re-subscribe per render. (The previous deps-less effect tore down and rebuilt
    // the ResizeObserver every commit, which is what let the feedback loop run away.)
  }, [measure]);
  const pts = (series || []).filter(p => p.r != null).slice(-5);
  const W = Math.max(220, size.w), H = Math.max(110, size.h), pl = 22, pr = 22, ptop = 22, pbot = 38;
  if (pts.length < 2) return <div ref={wrapRef} className="trend-svg-wrap" aria-label="Insufficient trend data" />;
  const ranks = pts.map(p => p.r);
  const rMin = 1, rMax = Math.max(5, ...ranks);
  const x = i => pl + (i / (pts.length - 1)) * (W - pl - pr);
  const y = r => ptop + ((r - rMin) / (rMax - rMin)) * (H - ptop - pbot);
  const flag = flagUrl(country);
  const linePath = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.r)}`).join(' ');
  const baseY = H - pbot;
  const areaPath = `M${x(0)},${baseY} ` + pts.map((p, i) => `L${x(i)},${y(p.r)}`).join(' ') + ` L${x(pts.length - 1)},${baseY} Z`;
  const RAD = 11;
  return (
    <div ref={wrapRef} className="trend-svg-wrap">
    <svg width={W} height={H} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        {pts.map((p, i) => (
          <clipPath id={uid + 'trendclip' + i} key={i}><circle cx={x(i)} cy={y(p.r)} r={RAD} /></clipPath>
        ))}
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      {pts.map((p, i) => {
        const latest = i === pts.length - 1;
        return (
          <g key={i}>
            {flag && <image href={flag} x={x(i) - RAD} y={y(p.r) - RAD} width={RAD * 2} height={RAD * 2} clipPath={'url(#' + uid + 'trendclip' + i + ')'} preserveAspectRatio="xMidYMid slice" />}
            <circle cx={x(i)} cy={y(p.r)} r={RAD} fill={flag ? 'none' : color} stroke="#fff" strokeWidth={latest ? 2 : 1} />
            <circle cx={x(i)} cy={y(p.r)} r={RAD + 0.5} fill="none" stroke={color} strokeWidth={latest ? 1.4 : 0.7} opacity={latest ? 1 : 0.55} />
            <text className="trend-rank-label" x={x(i)} y={y(p.r) + RAD + 13}>{p.r}{ordinal(p.r)}</text>
            <text className="trend-year-label" x={x(i)} y={H - 4}>{p.y}</text>
          </g>
        );
      })}
    </svg>
    </div>
  );
}

/* ---------- NRI sub-pillar rank profile + third-tier comparison ---------- */
function NRIProfileChart({ mode, profile, compare }) {
  const [tip, setTip] = React.useState(null);
  // Generous margins so y-axis rank ticks (left), x-axis category names (bottom)
  // and the rightmost point's rank label (right) are never clipped in 16:9.
  const W = 760, H = 360, pl = 48, pr = 58, ptop = 34, pbot = 50;

  if (mode === 'compare') {
    const rows = compare || [];
    if (!rows.length) return <div className="es-sub" style={{ padding: 40, textAlign: 'center' }}>No comparison data.</div>;
    const ranks = rows.map(r => r.rank).filter(v => v != null);
    const rMin = 1, rMax = Math.max(5, ...ranks);
    const x = i => pl + (i + 0.5) / rows.length * (W - pl - pr);
    const y = r => ptop + ((r - rMin) / (rMax - rMin)) * (H - ptop - pbot);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
        <div style={{ flex: 1, minHeight: 0 }}>
          <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
            <text x="6" y="16" className="trend-year-label" style={{ fontSize: 11 }}>Rank (lower = better)</text>
            <line x1={pl} y1={ptop} x2={pl} y2={H - pbot} stroke="rgba(16,40,64,0.12)" strokeWidth="1" />
            <text x={pl - 9} y={y(rMin) + 4} textAnchor="end" className="trend-year-label" style={{ fontSize: 10.5 }}>{rMin}</text>
            <text x={pl - 9} y={y(rMax) + 4} textAnchor="end" className="trend-year-label" style={{ fontSize: 10.5 }}>{rMax}</text>
            {rows.map((r, i) => {
              const me = r.isMe; const rad = me ? 13 : 11; const iso = (window.ISO && window.ISO[r.country] || '').toUpperCase();
              const cx = x(i), cy = y(r.rank), fl = flagUrl(r.country);
              return (
                <g key={r.country} onMouseMove={e => setTip({ x: e.clientX, y: e.clientY, t: `${r.country} · Rank ${r.rank}${ordinal(r.rank)} · Score: ${fmtScore(r.score)}` })} onMouseLeave={() => setTip(null)} style={{ cursor: 'default' }}>
                  <clipPath id={'ncc' + i}><circle cx={cx} cy={cy} r={rad} /></clipPath>
                  {fl && <image href={fl} x={cx - rad} y={cy - rad} width={rad * 2} height={rad * 2} clipPath={'url(#ncc' + i + ')'} preserveAspectRatio="xMidYMid slice" />}
                  <circle cx={cx} cy={cy} r={rad} fill={fl ? 'none' : r.color} stroke={r.color} strokeWidth={me ? 2.5 : 1.6} />
                  <text x={cx} y={cy + rad + 15} className="trend-rank-label" style={{ fontSize: 10 }}>{r.rank}{ordinal(r.rank)}</text>
                  <text x={cx} y={H - pbot + 32} className="trend-year-label" style={{ fontSize: 10.5, fontWeight: me ? 700 : 400 }}>{iso || r.country.slice(0, 3).toUpperCase()}</text>
                </g>
              );
            })}
          </svg>
        </div>
        {tip && <BodyPortal><div className="chart-tip" style={{ left: Math.min(tip.x + 14, window.innerWidth - 240), top: tip.y + 14 }}>{tip.t}</div></BodyPortal>}
      </div>
    );
  }

  // profile mode
  const subs = (profile && profile.subs) || [];
  const series = (profile && profile.series) || [];
  if (!subs.length || !series.length) return <div className="es-sub" style={{ padding: 40, textAlign: 'center' }}>No sub-pillar profile available.</div>;
  const allRanks = series.flatMap(s => s.pts.map(p => p.rank)).filter(v => v != null);
  const rMin = 1, rMax = Math.max(5, ...allRanks);
  const x = i => pl + (subs.length === 1 ? 0.5 : i / (subs.length - 1)) * (W - pl - pr);
  const y = r => ptop + ((r - rMin) / (rMax - rMin)) * (H - ptop - pbot);
  const label = sub => (window.NRI_SUBLABEL && window.NRI_SUBLABEL[sub]) || sub;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
          <text x="6" y="16" className="trend-year-label" style={{ fontSize: 11 }}>Rank (lower = better)</text>
          <line x1={pl} y1={ptop} x2={pl} y2={H - pbot} stroke="rgba(16,40,64,0.12)" strokeWidth="1" />
          <text x={pl - 9} y={y(rMin) + 4} textAnchor="end" className="trend-year-label" style={{ fontSize: 10.5 }}>{rMin}</text>
          <text x={pl - 9} y={y(rMax) + 4} textAnchor="end" className="trend-year-label" style={{ fontSize: 10.5 }}>{rMax}</text>
          {subs.map((s, i) => (
            <text key={s} x={x(i)} y={H - pbot + 30} className="trend-year-label" style={{ fontSize: 11 }}>{label(s)}</text>
          ))}
          {series.map((ser, si) => {
            const pathPts = ser.pts.map((p, i) => p.rank != null ? `${x(i)},${y(p.rank)}` : null).filter(Boolean);
            if (pathPts.length < 1) return null;
            return (
              <g key={ser.country}>
                {pathPts.length > 1 && (
                  <polyline points={pathPts.join(' ')} fill="none" stroke={ser.color}
                    strokeWidth={ser.isMe ? 2.8 : 1.6} strokeDasharray={ser.isMe ? '' : '5 3'}
                    strokeLinejoin="round" opacity={ser.isMe ? 1 : 0.85} />
                )}
              </g>
            );
          })}
          {series.map((ser, si) => ser.pts.map((p, i) => {
            if (p.rank == null) return null;
            const rad = ser.isMe ? 12 : 10; const fl = flagUrl(ser.country);
            const id = 'np' + si + '_' + i; const cx = x(i), cy = y(p.rank);
            return (
              <g key={id} onMouseMove={e => setTip({ x: e.clientX, y: e.clientY, t: `${ser.country} · ${label(p.sub)} · Rank ${p.rank}${ordinal(p.rank)} · Score: ${fmtScore(p.score)}` })} onMouseLeave={() => setTip(null)} style={{ cursor: 'default' }}>
                <clipPath id={id}><circle cx={cx} cy={cy} r={rad} /></clipPath>
                {fl && <image href={fl} x={cx - rad} y={cy - rad} width={rad * 2} height={rad * 2} clipPath={'url(#' + id + ')'} preserveAspectRatio="xMidYMid slice" />}
                <circle cx={cx} cy={cy} r={rad} fill={fl ? 'none' : ser.color} stroke={ser.color} strokeWidth={ser.isMe ? 2.5 : 1.6} />
                <text x={cx} y={cy + rad + 14} className="trend-rank-label" style={{ fontSize: 9.5 }}>{p.rank}{ordinal(p.rank)}</text>
              </g>
            );
          }))}
        </svg>
      </div>
      <div className="nri-legend">
        {series.map(ser => (
          <span key={ser.country} className={'nri-lg' + (ser.isMe ? ' me' : '')}>
            <span className={'nri-lg-line' + (ser.isMe ? '' : ' dotted')} style={{ borderTopColor: ser.color }} />
            {ser.country}
          </span>
        ))}
      </div>
      {tip && <BodyPortal><div className="chart-tip" style={{ left: Math.min(tip.x + 14, window.innerWidth - 260), top: tip.y + 14 }}>{tip.t}</div></BodyPortal>}
    </div>
  );
}

Object.assign(window, { CountryBarChart, RankTrendChart, NRIProfileChart });

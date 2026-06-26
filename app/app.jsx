/* ============================================================
   DASHDE — main application (scrollable rebuild)
   ============================================================ */

function Skeleton({ h, w, r }) { return <div className="skel" style={{ height: h, width: w || '100%', borderRadius: r || 5 }} />; }
function HeaderSkeleton() {
  return (
    <div className="panel header-card">
      <div className="hc-left" style={{ gap: 10 }}>
        <Skeleton h={10} w={130} /><Skeleton h={18} w={220} /><Skeleton h={11} w={420} /><Skeleton h={10} w={200} />
      </div>
      <div className="hc-right" style={{ gap: 28 }}><Skeleton h={56} w={120} /><Skeleton h={56} w={240} /></div>
    </div>
  );
}
function PanelSkeleton({ lines }) {
  return (
    <div className="panel" style={{ padding: 18 }}>
      <Skeleton h={14} w={200} /><div style={{ height: 14 }} />
      {Array.from({ length: lines || 8 }).map((_, i) => <div key={i} style={{ marginBottom: 10 }}><Skeleton h={11} /></div>)}
    </div>
  );
}

const SOURCE_LABEL = {
  'supabase':      { text: 'Live · Supabase', cls: 'src-live' },
  'seed-empty':    { text: 'Bundled data · table empty', cls: 'src-seed' },
  'seed-offline':  { text: 'Bundled data · Supabase unreachable', cls: 'src-seed' },
  'seed-noclient': { text: 'Bundled data · no client', cls: 'src-seed' },
};

/* Access control is handled by the parent system that embeds this dashboard link,
   so there is no in-app sign-in. A synthetic admin identity keeps the data-upload /
   user-management portal reachable for whoever the parent grants access to. */
const ADMIN_USER = { name: 'Administrator', email: 'admin@dashde.local', role: 'Admin' };

/* Error boundary — a render failure in any single tab now shows an inline message
   instead of unmounting the whole app to a blank page. `resetKey` clears the error
   automatically when the user switches domain / pillar / year / country. */
class ViewErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('[DASHDE] view render error:', error, info); }
  componentDidUpdate(prev) { if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null }); }
  render() {
    if (this.state.error) {
      return (
        <div className="site"><div className="error-state">
          <div className="es-title">Unable to display this view</div>
          <div className="es-sub">{String((this.state.error && this.state.error.message) || this.state.error)}</div>
          <button onClick={() => this.setState({ error: null })}>Try again</button>
        </div></div>
      );
    }
    return this.props.children;
  }
}

/* Fit the fixed 1920×1080 PowerPoint canvas into any viewport (letterboxed). */
const CANVAS_W = 1440, CANVAS_H = 900;
function useStageScale() {
  const [scale, setScale] = React.useState(1);
  React.useLayoutEffect(() => {
    function fit() { setScale(Math.min(window.innerWidth / CANVAS_W, window.innerHeight / CANVAS_H)); }
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return scale;
}

function App({ dataSource }) {
  const [route, setRoute] = React.useState('dashboard');
  const scale = useStageScale();
  const [domain, setDomain] = React.useState('Overview');
  // Digital Economy sub-navigation. Extensible: each Level-1 entry MAY own a
  // Level-2 bar — only 'overall-imd' does today; NRI gets its own in a future update.
  const [deLevel1, setDeLevel1] = React.useState('overall-imd'); // 'overall-imd' | 'nri'
  const [dePillar, setDePillar] = React.useState(null);          // null = Overall-IMD landing page; else an IMD pillar id
  const [nriPillar, setNriPillar] = React.useState(null);        // null = Overall-NRI summary; else 'Technology'|'People'|'Governance'|'Impact'
  const [aiLevel1, setAiLevel1] = React.useState('gari');         // AI Level-1: 'gari' | 'gai'
  const [gariPillar, setGariPillar] = React.useState(null);      // null = Overall-GARI summary; else a 2020-2024 pillar name
  const [aiPillarId, setAiPillarId] = React.useState(((PILLARS['AI'] || [])[0] || {}).id);

  const DE_ALL = PILLARS['Digital Economy'] || [];
  const IMD_PILLARS = DE_ALL.filter(p => p.layout !== 'nri'); // the 4 deep-dive pillars
  const NRI_PILLAR = DE_ALL.find(p => p.layout === 'nri') || null;

  const isAdmin = true; // access is gated externally; the admin portal stays reachable
  const isOverview = domain === 'Overview';
  const src = SOURCE_LABEL[(dataSource && dataSource.source) || 'seed-noclient'];
  const lastUpdated = React.useMemo(() => (window.lastUpdatedStr ? window.lastUpdatedStr() : ''), [dataSource]);

  // Resolve the active pillar (null on Overview and on the Overall-IMD landing page).
  let pillar = null;
  if (domain === 'AI') pillar = aiLevel1 === 'gai' ? ((PILLARS['AI'] || []).find(p => p.layout === 'gai') || null) : null;
  else if (domain === 'Digital Economy') {
    // NRI (Overall-NRI summary + the 4 pillar deep-dives) is fully self-contained — it
    // does NOT flow through the generic pillar/useIndicatorData path. Leave pillar null.
    if (deLevel1 === 'nri') pillar = null;
    else if (dePillar) pillar = IMD_PILLARS.find(p => p.id === dePillar) || null;
    else pillar = null; // Overall-IMD landing page
  }

  // Overall-IMD landing + Overall-NRI summary + NRI pillar pages all use the internal
  // .site scroll model (sticky top bar + Level 0/1/2 nav), like Overview.
  const isOverallIMD = domain === 'Digital Economy' && deLevel1 === 'overall-imd' && !dePillar;
  const isNRILevel1  = domain === 'Digital Economy' && deLevel1 === 'nri' && !nriPillar;
  const isNRIPillar  = domain === 'Digital Economy' && deLevel1 === 'nri' && !!nriPillar;
  const isNRIPage    = isNRILevel1 || isNRIPillar;
  const isGARIOverall = domain === 'AI' && aiLevel1 === 'gari' && !gariPillar;
  const isGARIPillar  = domain === 'AI' && aiLevel1 === 'gari' && !!gariPillar;
  const isGARIPage    = isGARIOverall || isGARIPillar;
  const emptyDomain = !isOverview && !isOverallIMD && !isNRIPage && !isGARIPage && !pillar;
  const isGAI = !!pillar && pillar.layout === 'gai';
  // Whole-stage scroll is used only by GAI now (it grows vertically). Overview,
  // Overall-IMD and all NRI pages keep the fixed, viewport-fitted canvas and scroll
  // their .site internally so the nav bars stay visible.
  const isScroll = isGAI;
  const canvasRef = React.useRef(null);
  const [contentH, setContentH] = React.useState(CANVAS_H);
  React.useLayoutEffect(() => {
    if (!isScroll) { setContentH(CANVAS_H); return; }
    const el = canvasRef.current;
    if (!el) return;
    const measure = () => setContentH(Math.max(CANVAS_H, el.scrollHeight));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    // The view's data resolves ~160ms after mount (skeleton -> full content), and the
    // ResizeObserver does not always fire for that first post-skeleton growth on a fresh
    // load. Re-measure on a few timers so scroll height is correct on first navigation.
    const timers = [120, 260, 500, 900, 1500, 2400].map(ms => setTimeout(measure, ms));
    return () => { ro.disconnect(); timers.forEach(clearTimeout); };
  }, [isScroll, isGAI, isOverview, isOverallIMD, isNRIPage, pillar && pillar.id, dePillar, nriPillar, deLevel1, domain, country, year]);

  const years = React.useMemo(() => (pillar ? yearsFor(pillar) : []), [pillar && pillar.id]);
  const [year, setYear] = React.useState(years[0] || (RECS.length ? Math.max(...RECS.map(r => r.y)) : 2025));
  const [country, setCountry] = React.useState('Singapore');
  const [selectedSub, setSelectedSub] = React.useState(null);
  const [info, setInfo] = React.useState(null);

  React.useEffect(() => {
    if (!pillar) return;
    const ys = yearsFor(pillar);
    setYear(ys.includes(year) ? year : ys[0]);
    setCountry('Singapore');
    setSelectedSub(null);
    setInfo(null);
  }, [pillar && pillar.id]);

  React.useEffect(() => { setSelectedSub(null); }, [country, year]);

  function switchDomain(d) {
    setDomain(d);
    if (d === 'Digital Economy') { setDeLevel1('overall-imd'); setDePillar(null); setNriPillar(null); }
    if (d === 'AI') { setAiLevel1('gari'); setGariPillar(null); setAiPillarId(((PILLARS['AI'] || [])[0] || {}).id); }
  }
  function pickSub(r) {
    setSelectedSub(prev => {
      if (!r) return null;
      const key = r.sub + '|' + r.third;
      if (prev && (prev.sub + '|' + prev.third) === key) return null;
      return { sub: r.sub, third: r.third, label: r.label, kind: r.kind };
    });
  }

  const { loading, error, data } = useIndicatorData(pillar, country, year);
  const countries = pillar ? countriesFor(pillar, year) : [];

  if (route === 'admin' && isAdmin) return <AdminPortal user={ADMIN_USER} onExit={() => setRoute('dashboard')} />;

  return (
    <div className={'stage' + (isScroll ? ' stage-scroll' : '')}>
      {/* Sizer always reserves the true scaled footprint and the canvas always scales
          from the top-left, so every tab pins the top bar to y=0 (no letterbox gap
          above non-NRI tabs). Horizontal centering is handled by the stage flexbox. */}
      <div className={'canvas-sizer' + (isScroll ? ' sizer-clip' : '')} style={{ width: CANVAS_W * scale, height: contentH * scale }}>
      <div className={'canvas' + (isGAI ? ' canvas-nri' : '') + (isOverview ? ' canvas-overview' : '') + ((isOverallIMD || isNRIPage || isGARIPage) ? ' canvas-overall' : '') + ((isNRIPage || isGARIPage) ? ' canvas-nri2' : '')} ref={canvasRef}
        style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
      {/* top bar */}
      <div className="topbar">
        <div className="tb-left">
          <a className="tb-back" href="https://t.vista.gov.sg/views/DASH-DS1_ExecutiveSummary/ExecutiveSummary?:origin=card_share_link&:embed=n">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
            <span className="tb-back-label">Back to DASH-DE</span>
          </a>
          <div className="tb-divider" />
          <div className="tb-brand"><img className="tb-logo" src="assets/mddi-logo.png" alt="MDDI" /> DASH-DE <span className="tb-sep">–</span> International Benchmarks</div>
        </div>
        <div className="tb-right">
          <span className={'tb-src ' + src.cls} title={'Data source: ' + src.text}><span className="tb-src-dot" /> {src.text}</span>
          <button className="tb-btn" onClick={() => setRoute('admin')}><span className="tb-shield">🛡</span> Admin</button>
        </div>
      </div>

      {/* domain tabs */}
      <div className="domain-tabs">
        {['Overview', 'Digital Economy', 'AI'].map(d => (
          <button key={d} className={'dt' + (domain === d ? ' active' : '')}
            style={{ '--ul': d === 'AI' ? '#534AB7' : d === 'Overview' ? '#0C3B6E' : '#0A6EA8' }} onClick={() => switchDomain(d)}>{d}</button>
        ))}
      </div>

      {/* pillar / sub navigation */}
      {domain === 'AI' && (
        <div className="level1-tabs">
          <button className={'l1' + (aiLevel1 === 'gai' ? ' active' : '')}
            onClick={() => { setAiLevel1('gai'); setGariPillar(null); }}>Global AI Index</button>
          <button className={'l1' + (aiLevel1 === 'gari' ? ' active' : '')}
            onClick={() => { setAiLevel1('gari'); setGariPillar(null); }}>Overall – GARI</button>
        </div>
      )}

      {/* AI — Level 2 (GARI pillar deep dives), shown only under Overall – GARI */}
      {domain === 'AI' && aiLevel1 === 'gari' && (
        <div className="level2-tabs level2-nri">
          <span className="l2-label">Deep dive by pillar →</span>
          {(window.gariPillars ? window.gariPillars('2020-2024') : []).map(p => (
            <button key={p} className={'l2' + (gariPillar === p ? ' active' : '')} onClick={() => setGariPillar(p)}>
              <span className="l2-name">{p}</span>
              <span className="l2-pub">{window.gariEraLabel ? window.gariEraLabel('2020-2024') : 'GARI'}</span>
            </button>
          ))}
          <button className={'l2' + (gariPillar === '2025-framework' ? ' active' : '')} onClick={() => setGariPillar('2025-framework')}>
            <span className="l2-name">2025 Framework</span>
            <span className="l2-pub">{window.gariEraLabel ? window.gariEraLabel('2025') : 'GARI (2025)'}</span>
          </button>
        </div>
      )}

      {/* Digital Economy — Level 1 (Overall – IMD | Network Readiness Index) */}
      {domain === 'Digital Economy' && (
        <div className="level1-tabs">
          <button className={'l1' + (deLevel1 === 'overall-imd' ? ' active' : '')}
            onClick={() => { setDeLevel1('overall-imd'); setDePillar(null); }}>Overall – IMD</button>
          <button className={'l1' + (deLevel1 === 'nri' ? ' active' : '')}
            onClick={() => { setDeLevel1('nri'); setDePillar(null); setNriPillar(null); }}>Overall – NRI</button>
        </div>
      )}

      {/* Digital Economy — Level 2 (deep dive by pillar), shown only under Overall – IMD */}
      {domain === 'Digital Economy' && deLevel1 === 'overall-imd' && (
        <div className="level2-tabs">
          <span className="l2-label">Deep dive by pillar →</span>
          {IMD_PILLARS.map(p => (
            <button key={p.id} className={'l2' + (dePillar === p.id ? ' active' : '')} onClick={() => setDePillar(p.id)}>
              <span className="l2-name">{p.tab}</span>
              <span className="l2-pub">{PUB_SHORT[p.pub]}</span>
            </button>
          ))}
        </div>
      )}

      {/* Digital Economy — Level 2 (deep dive by pillar), shown only under Overall – NRI */}
      {domain === 'Digital Economy' && deLevel1 === 'nri' && (
        <div className="level2-tabs level2-nri">
          <span className="l2-label">Deep dive by pillar →</span>
          {(window.NRI_PILLARS || ['Technology', 'People', 'Governance', 'Impact']).map(p => (
            <button key={p} className={'l2' + (nriPillar === p ? ' active' : '')} onClick={() => setNriPillar(p)}>
              <span className="l2-name">{p}</span>
              <span className="l2-pub">NRI</span>
            </button>
          ))}
        </div>
      )}

      <ViewErrorBoundary resetKey={domain + '|' + deLevel1 + '|' + (dePillar || '') + '|' + (nriPillar || '') + '|' + aiLevel1 + '|' + (gariPillar || '') + '|' + (pillar && pillar.id) + '|' + year + '|' + country}>
      {isOverview ? (
        <OverviewView key="overview" isAdmin={isAdmin} userEmail={ADMIN_USER.email} />
      ) : isOverallIMD ? (
        <div className="site"><OverallIMDView /></div>
      ) : isNRILevel1 ? (
        <div className="site"><OverallNRIView domain={domain} /></div>
      ) : isNRIPillar ? (
        <div className="site"><NRIPillarPage domain={domain} pillar={nriPillar} /></div>
      ) : isGARIOverall ? (
        <div className="site"><GARIOverallView domain={domain} /></div>
      ) : isGARIPillar ? (
        <div className="site">{gariPillar === '2025-framework'
          ? <GARI2025FrameworkView domain={domain} />
          : <GARIPillarPage domain={domain} pillar={gariPillar} />}</div>
      ) : emptyDomain ? (
        <div className="site"><div className="domain-empty">
          <div className="de-icon">◷</div>
          <div className="de-title">AI domain — coming soon</div>
          <div className="de-sub">The Government AI Readiness Index and Global AI Index pillars are not yet loaded in this build. Switch to <b>Digital Economy</b> to explore Singapore's benchmark performance.</div>
        </div></div>
      ) : (
        <div className="site">
          {error ? (
            <div className="error-state"><div>Failed to load data. Please try again.</div><button onClick={() => setYear(y => y)}>Retry</button></div>
          ) : loading || !data ? (
            <>
              <HeaderSkeleton />
              <div className="panel filterbar"><Skeleton h={34} w={150} /><Skeleton h={34} w={150} /></div>
              <div className="panel-row"><PanelSkeleton lines={9} /><PanelSkeleton lines={14} /></div>
            </>
          ) : pillar.layout === 'nri' ? (
            <NRIView domain={domain} years={years} country={country} year={year} onPickCountry={setCountry} onYear={setYear} />
          ) : pillar.layout === 'gai' ? (
            <GAIView domain={domain} years={years} country={country} year={year} onPickCountry={setCountry} onYear={setYear} />
          ) : !data.cur ? (
            <div className="empty-state">
              <div className="es-title">No data available for {country}{year ? ' · ' + year : ''}</div>
              <div className="es-sub">Try a different year or country from the filters.</div>
            </div>
          ) : (
            <>
              <PillarHeaderCard domain={domain} pillar={pillar} country={country} year={year} data={data} />
              <FilterBar years={years} countries={countries} year={year} country={country}
                onYear={setYear} onCountry={setCountry} yearLocked={false} hint={false} />
              <div className="panel-row grow">
                <ChartPanel pillar={pillar} country={country} year={year} data={data}
                  onPickCountry={setCountry} selectedSub={selectedSub} onReset={() => setSelectedSub(null)} />
                <TablePanel pillar={pillar} country={country} year={year} data={data}
                  onInfo={setInfo} selectedSub={selectedSub} onSelectSub={pickSub} />
              </div>
            </>
          )}
        </div>
      )}
      </ViewErrorBoundary>

      {/* global page footer (Overview, Overall-IMD, NRI and GARI render their own) */}
      {!isOverview && !isOverallIMD && !isNRIPage && !isGARIPage && (
      <div className="page-foot">
        {!isGAI && <div className="page-foot-class">Classification: Official (Open)</div>}
        <div className="page-foot-updated">{lastUpdated}</div>
      </div>
      )}
      </div>
      </div>

      <DefinitionPanel row={info} pillar={pillar} year={year} onClose={() => setInfo(null)} />
    </div>
  );
}

/* ---------- boot ---------- */
function BootLoader() {
  return (
    <div className="boot">
      <div className="boot-dot" />
      <div className="boot-title">DASH-DE – International Benchmarks</div>
      <div className="boot-sub">Connecting to Supabase…</div>
    </div>
  );
}

function Boot() {
  const [state, setState] = React.useState({ ready: false, source: null });
  React.useEffect(() => {
    let alive = true;
    (async () => {
      const source = await loadData();
      if (!alive) return;
      setState({ ready: true, source });
    })();
    return () => { alive = false; };
  }, []);

  // No in-app authentication: access to this embedded dashboard is controlled by the
  // parent system. Once data has loaded we render straight into the Overview tab.
  if (!state.ready) return <BootLoader />;
  return <App dataSource={state.source} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(<Boot />);

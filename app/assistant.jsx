/* ============================================================
   DASHDE — DASH-DE Assistant (embedded AI chat, Part C)
   A fixed, always-available chat launcher + panel. Answers are
   grounded in the live Supabase rows already loaded into
   window.RECS / window.DEFS — a bounded slice relevant to the
   question is retrieved client-side and passed to Claude (via the
   built-in window.claude.complete helper), with a scoped prompt
   that forbids drawing on outside knowledge (C6/C7). In a server
   deployment this retrieval+prompt step lives behind an API route
   so the key stays server-side; here it runs against the data the
   dashboard already holds in memory.
   ============================================================ */

const ASSIST_HINT_KEY = 'dashde_assist_hint_dismissed';
const ASSIST_OPENED_KEY = 'dashde_assist_opened';
const ASSIST_SEEN_TOKEN_KEY = 'dashde_assist_seen_token';

/* A token that changes whenever the underlying data refreshes — drives the
   recurring red notification dot (C3). */
function assistDataToken() {
  return String(window.LAST_UPDATED_RAW || window.LATEST_YEAR || (window.RECS ? window.RECS.length : 0));
}

/* Countries referenced in the question (always includes Singapore as the focus). */
function assistCountries(q) {
  const recs = window.RECS || [];
  const all = [...new Set(recs.map(r => r.c))];
  const lq = ' ' + q.toLowerCase() + ' ';
  const found = all.filter(c => lq.includes(' ' + c.toLowerCase()) || lq.includes(c.toLowerCase() + ' '));
  const set = new Set(found); set.add('Singapore');
  return [...set].slice(0, 5);
}

/* Bounded retrieval (C6): rank/score rows for the focus countries across every
   publication + year, plus (only when the question reads like a definition lookup)
   a slice of the shared `definition` values that power the ⓘ tooltips (C8). */
function buildAssistantContext(q) {
  const recs = window.RECS || [];
  const DEFS = window.DEFS || {};
  const countries = assistCountries(q);
  const rows = [];
  for (const r of recs) {
    if (!countries.includes(r.c)) continue;
    if (r.t !== '' && r.t != null) continue;       // pillar / sub-pillar overalls only (no leaf 3rd-tier)
    if (r.r == null && r.sc == null) continue;
    rows.push({ pub: (window.PUB_SHORT && window.PUB_SHORT[r.p]) || r.p, country: r.c, year: r.y,
      indicator: r.i, sub: r.s && r.s !== 'Overall' ? r.s : '', rank: r.r, score: r.sc });
  }
  rows.sort((a, b) => (a.pub).localeCompare(b.pub) || a.country.localeCompare(b.country) || a.year - b.year);
  const wantsDef = /\b(mean|means|measure|measures|define|definition|defines|explain|explains|what is|what does)\b/i.test(q);
  let definitions = null;
  if (wantsDef) {
    definitions = [];
    for (const k in DEFS) {
      const parts = k.split('||'); // pub||indicator||sub||third
      if (parts[3]) continue; // skip 3rd-tier to stay bounded
      const short = (window.PUB_SHORT && window.PUB_SHORT[parts[0]]) || parts[0];
      definitions.push({ pub: short, indicator: parts[1], sub: parts[2], definition: DEFS[k].d });
    }
    definitions = definitions.slice(0, 160);
  }
  return { focusCountries: countries, latestYear: window.LATEST_YEAR || null,
    publications: ['IMD WCY', 'IMD WDC', 'NRI', 'GAI', 'GARI'], rows: rows.slice(0, 700), definitions };
}

const ASSIST_SYSTEM = [
  'You are the DASH-DE Assistant, embedded in a Singapore government dashboard of international',
  'digital-economy and AI competitiveness rankings (publications: IMD WCY, IMD WDC, NRI, GAI = Global',
  'AI Index, GARI = Government AI Readiness Index).',
  '',
  'Answer ONLY from the JSON data provided in the DATA block. Do NOT use any outside knowledge about',
  'these publications, countries, Singapore, or AI/digital topics. Rank numbers are positions where',
  'LOWER = BETTER. If the question cannot be answered from the supplied data (a country/publication/year',
  'not present, or an unrelated/predictive/export request), say so plainly in one sentence — do not guess.',
  'For "what does X mean / explain" questions, answer using the matching `definition` value only; if none',
  'is present, say a definition is not yet available for that pillar in the dataset.',
  '',
  'Style: concise and analyst-appropriate, like a colleague summarising a data point — 1–3 sentences, no',
  'marketing tone. Formatting rules you MUST follow:',
  '- Wrap every key figure (a rank, a rank change, or a score) in double square brackets, e.g.',
  '  [[8th → 15th]], [[3rd]], or [[Score 81.4]].',
  '- End any substantive, data-backed answer with a final line in exactly this form:',
  '  Source: {PublicationShortName} {Year}',
].join('\n');

/* Split assistant text into rendered nodes: [[...]] becomes stat pills (matching the
   dashboard's YoY delta styling), a trailing "Source: ..." line becomes a citation. */
function renderAssistantText(text) {
  const lines = text.split('\n');
  const out = [];
  lines.forEach((line, li) => {
    const srcMatch = line.match(/^\s*source:\s*(.+)$/i);
    if (srcMatch) {
      out.push(<div key={'s' + li} className="assist-src">Source: {srcMatch[1].trim()}</div>);
      return;
    }
    if (!line.trim()) return;
    const parts = [];
    let rest = line, idx = 0;
    const re = /\[\[(.+?)\]\]/g;
    let m, last = 0;
    while ((m = re.exec(line)) !== null) {
      if (m.index > last) parts.push(line.slice(last, m.index));
      const inner = m[1];
      const down = /→|->|↓|drop|fell|fall/i.test(inner);
      parts.push(<span key={'p' + li + '_' + (idx++)} className={'assist-pill' + (down ? ' down' : '')}>{inner.replace(/->/g, '→')}</span>);
      last = m.index + m[0].length;
    }
    if (last < line.length) parts.push(line.slice(last));
    out.push(<p key={'l' + li} className="assist-line">{parts.length ? parts : line}</p>);
  });
  return out;
}

const ASSIST_QUICK = [
  "Compare Singapore's GAI vs GARI",
  "Singapore's 5-year NRI trend",
  'Which pillar dropped the most this year?',
];

/* Part D2 — detect report-style intent from free text so "write me a summary" routes
   to report mode instead of a short inline chat answer. */
function isReportRequest(message) {
  const kw = ['summary report', 'summary', 'report', 'draft', 'write up', 'write-up', 'write me', 'analysis for', 'briefing', 'brief on', 'full analysis'];
  const m = (message || '').toLowerCase();
  return kw.some(k => m.includes(k));
}

function DASHDEAssistant() {
  const [open, setOpen] = React.useState(false);
  const [hint, setHint] = React.useState(false);
  const [dot, setDot] = React.useState(false);
  const [input, setInput] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  // Part D — report mode overlays on top of the chat panel (D8); the chat panel below
  // stays mounted, so msgs / scroll are preserved while a report is open.
  const [reportPhase, setReportPhase] = React.useState(null); // null | 'scope' | 'report'
  const [reportScope, setReportScope] = React.useState(null);
  const [pendingScopeInit, setPendingScopeInit] = React.useState(null);
  const [msgs, setMsgs] = React.useState([
    { role: 'assistant', text: 'Hi! I can answer questions about rankings across IMD WCY, IMD WDC, NRI, GAI and GARI — grounded in the live dashboard data.' },
  ]);
  const scrollRef = React.useRef(null);

  React.useEffect(() => {
    try {
      const opened = localStorage.getItem(ASSIST_OPENED_KEY);
      if (!opened && !localStorage.getItem(ASSIST_HINT_KEY)) setHint(true);
      const token = assistDataToken();
      const seen = localStorage.getItem(ASSIST_SEEN_TOKEN_KEY);
      if (seen !== token) setDot(true); // new data since last opened → re-surface (C3)
    } catch (e) {}
  }, []);

  React.useEffect(() => {
    if (open && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, busy, open]);

  function openPanel() {
    setOpen(true); setHint(false); setDot(false);
    try {
      localStorage.setItem(ASSIST_OPENED_KEY, '1');
      localStorage.setItem(ASSIST_HINT_KEY, '1');
      localStorage.setItem(ASSIST_SEEN_TOKEN_KEY, assistDataToken());
    } catch (e) {}
  }
  function dismissHint() {
    setHint(false);
    try { localStorage.setItem(ASSIST_HINT_KEY, '1'); } catch (e) {}
  }

  async function ask(question) {
    const q = (question || '').trim();
    if (!q || busy) return;
    // D2 — report-style requests open the scope-confirmation step rather than answering inline.
    if (isReportRequest(q)) {
      setInput('');
      setMsgs(m => [...m, { role: 'user', text: q },
        { role: 'assistant', text: "Let's set the scope for your summary report — confirm what it should cover and I'll write it up." }]);
      openScope(null);
      return;
    }
    setInput('');
    setMsgs(m => [...m, { role: 'user', text: q }]);
    if (!(window.claude && window.claude.complete)) {
      setMsgs(m => [...m, { role: 'assistant', text: 'The assistant needs the live model connection, which is unavailable in this view. Try opening the dashboard in its hosted environment.' }]);
      return;
    }
    setBusy(true);
    try {
      const ctx = buildAssistantContext(q);
      const prompt = ASSIST_SYSTEM + '\n\nDATA (JSON):\n' + JSON.stringify(ctx) + '\n\nQUESTION: ' + q;
      const reply = await window.claude.complete({ messages: [{ role: 'user', content: prompt }] });
      setMsgs(m => [...m, { role: 'assistant', text: (reply || '').trim() || 'I could not find an answer in the dashboard data for that.' }]);
    } catch (e) {
      setMsgs(m => [...m, { role: 'assistant', text: 'Something went wrong reaching the assistant. Please try again.' }]);
    } finally {
      setBusy(false);
    }
  }

  function openScope(init) { setPendingScopeInit(init || null); setReportScope(null); setReportPhase('scope'); }
  function onGenerate(scope) { setReportScope(scope); setReportPhase('report'); }
  function closeReport() { setReportPhase(null); } // returns to open-chat state (D8.4)

  return (
    <>
      {/* one-time hint bubble (C3) */}
      {!open && hint && (
        <div className="assist-hint">
          <button className="assist-hint-x" onClick={dismissHint} aria-label="Dismiss">✕</button>
          <div className="assist-hint-txt">Have a question about a ranking? Ask me anything →</div>
        </div>
      )}

      {/* launcher (C3) — fixed colour across every tab */}
      {!open && (
        <button className="assist-launcher" onClick={openPanel} aria-label="Open DASH-DE Assistant">
          <span className="assist-launcher-ic">✦</span>
          {dot && <span className="assist-dot" />}
        </button>
      )}

      {/* open chat panel (C4) */}
      {open && (
        <div className="assist-panel" role="dialog" aria-label="DASH-DE Assistant">
          <div className="assist-head">
            <div className="assist-head-titles">
              <div className="assist-head-title"><span className="assist-head-ic">✦</span> DASH-DE Assistant</div>
              <div className="assist-head-sub">Ask about any ranking, pillar, or trend</div>
            </div>
            <button className="assist-close" onClick={() => setOpen(false)} aria-label="Close">✕</button>
          </div>

          <div className="assist-body" ref={scrollRef}>
            {msgs.map((m, i) => (
              <div key={i} className={'assist-msg ' + m.role}>
                {m.role === 'assistant' && <span className="assist-av">✦</span>}
                <div className="assist-bubble">{m.role === 'assistant' ? renderAssistantText(m.text) : m.text}</div>
              </div>
            ))}
            {busy && (
              <div className="assist-msg assistant">
                <span className="assist-av">✦</span>
                <div className="assist-bubble assist-typing"><span /><span /><span /></div>
              </div>
            )}
          </div>

          <div className="assist-chips">
            <button className="assist-chip assist-chip-report" disabled={busy} onClick={() => openScope(null)}>✷ Generate summary report</button>
            {ASSIST_QUICK.map(c => (
              <button key={c} className="assist-chip" disabled={busy} onClick={() => ask(c)}>{c}</button>
            ))}
          </div>

          <form className="assist-input-row" onSubmit={e => { e.preventDefault(); ask(input); }}>
            <input className="assist-input" value={input} disabled={busy} placeholder="Ask about a ranking, pillar…"
              onChange={e => setInput(e.target.value)} />
            <button className="assist-send" type="submit" disabled={busy || !input.trim()} aria-label="Send">↑</button>
          </form>

          <div className="assist-disclaimer">Answers are generated from live Supabase data — verify against source publications.</div>
        </div>
      )}

      {/* Part D overlays — layered ON TOP of the still-mounted chat panel (D8) */}
      {open && reportPhase === 'scope' && window.ReportScopeModal && (
        <ReportScopeModal
          currentView={window.__currentView}
          initial={reportScope || pendingScopeInit}
          onCancel={() => setReportPhase(null)}
          onGenerate={onGenerate} />
      )}
      {open && reportPhase === 'report' && reportScope && window.ReportModal && (
        <ReportModal
          scope={reportScope}
          country={(reportScope.country) || (window.__currentView && window.__currentView.country) || 'Singapore'}
          onClose={closeReport}
          onEditScope={() => openScope(reportScope)} />
      )}
    </>
  );
}

Object.assign(window, { DASHDEAssistant });

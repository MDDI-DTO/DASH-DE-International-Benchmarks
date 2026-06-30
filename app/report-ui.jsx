/* ============================================================
   DASHDE — Report mode UI (Part D): scope-confirm modal (D3),
   report modal (D4), and Copy/Word/PDF download mechanics (D6).
   Rendered by DASHDEAssistant as an overlay layered ON TOP of the
   chat panel (D8) — the chat panel stays mounted underneath.
   ============================================================ */

/* ---------- D3 · Scope confirmation ---------- */
function ReportScopeModal({ currentView, initial, onCancel, onGenerate }) {
  const cv = currentView || {};
  const [mode, setMode] = React.useState((initial && initial.mode) || (cv.pubs && cv.pubs.length ? 'current' : 'selected'));
  const [sel, setSel] = React.useState(() => {
    if (initial && initial.mode === 'selected' && initial.pubs) return new Set(initial.pubs);
    return new Set(cv.pubs && cv.pubs.length ? cv.pubs : ['IMD WCY', 'IMD WDC']);
  });

  function toggle(p) {
    setSel(prev => { const n = new Set(prev); n.has(p) ? n.delete(p) : n.add(p); return n; });
  }
  function submit() {
    let scope;
    if (mode === 'current') scope = { mode: 'current', pubs: cv.pubs || [], currentLabel: cv.label, country: cv.country, year: cv.year };
    else if (mode === 'full') scope = { mode: 'full', pubs: [...window.REPORT_PUBS] };
    else scope = { mode: 'selected', pubs: window.REPORT_PUBS.filter(p => sel.has(p)) };
    if (!scope.pubs.length) return;
    onGenerate(scope);
  }

  const canGen = mode !== 'selected' || sel.size > 0;
  return (
    <div className="report-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="report-scope" role="dialog" aria-label="Generate summary report">
        <div className="rep-head">
          <div className="rep-head-titles">
            <div className="rep-head-title"><span className="rep-ic">✦</span> Generate Summary Report</div>
            <div className="rep-head-sub">Confirm what this report should cover before I write it</div>
          </div>
          <button className="rep-x" onClick={onCancel} aria-label="Close">✕</button>
        </div>

        <div className="rep-scope-body">
          <div className="rep-q">What should this report cover?</div>

          <label className={'scope-opt' + (mode === 'current' ? ' on' : '') + (cv.pubs && cv.pubs.length ? '' : ' disabled')}>
            <input type="radio" name="scope" checked={mode === 'current'} disabled={!(cv.pubs && cv.pubs.length)} onChange={() => setMode('current')} />
            <span className="scope-radio" />
            <span className="scope-txt">
              <span className="scope-label">Just what I'm currently viewing</span>
              <span className="scope-desc">{cv.pubs && cv.pubs.length ? cv.label : 'Open a publication tab to use this option'}</span>
            </span>
          </label>

          <label className={'scope-opt' + (mode === 'selected' ? ' on' : '')}>
            <input type="radio" name="scope" checked={mode === 'selected'} onChange={() => setMode('selected')} />
            <span className="scope-radio" />
            <span className="scope-txt">
              <span className="scope-label">Selected publications</span>
              <span className="scope-desc">Choose one or more below</span>
              <span className="scope-chips" onClick={e => e.preventDefault()}>
                {window.REPORT_PUBS.map(p => (
                  <button key={p} type="button" className={'scope-chip' + (sel.has(p) ? ' on' : '')}
                    onClick={() => { setMode('selected'); toggle(p); }}>
                    {p}{sel.has(p) ? ' ✓' : ''}
                  </button>
                ))}
              </span>
            </span>
          </label>

          <label className={'scope-opt' + (mode === 'full' ? ' on' : '')}>
            <input type="radio" name="scope" checked={mode === 'full'} onChange={() => setMode('full')} />
            <span className="scope-radio" />
            <span className="scope-txt">
              <span className="scope-label">Full dashboard — all publications</span>
              <span className="scope-desc">A comprehensive cross-publication summary</span>
            </span>
          </label>

          <div className="rep-scope-note">Country (<b>{cv.country || 'Singapore'}</b>) and latest year are inherited from the dashboard's current filters.</div>
        </div>

        <div className="rep-foot rep-foot-scope">
          <button className="rep-btn ghost" onClick={onCancel}>Cancel</button>
          <button className="rep-btn primary" disabled={!canGen} onClick={submit}>Generate →</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- D4 · Generated report view ---------- */
function ReportModal({ scope, country, onClose, onEditScope }) {
  const [report, setReport] = React.useState(null);
  const [err, setErr] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const bodyRef = React.useRef(null);

  React.useEffect(() => {
    let alive = true;
    setReport(null); setErr(false);
    (async () => {
      try { const r = await window.generateReport(scope, country); if (alive) setReport(r); }
      catch (e) { if (alive) setErr(true); }
    })();
    return () => { alive = false; };
  }, [scope, country]);

  const dateStr = window.reportDateStr();
  const scopeDesc = window.scopeDescription(scope);

  function plainText() {
    if (!report) return '';
    const L = [];
    L.push(report.title);
    if (report.subtitle) L.push(report.subtitle);
    L.push('');
    if (report.overview) { L.push('OVERVIEW'); L.push(window.statsToPlain(report.overview)); L.push(''); }
    report.sections.forEach(s => {
      L.push(s.heading.toUpperCase());
      (s.paragraphs || []).forEach(p => L.push(window.statsToPlain(p)));
      L.push('');
    });
    if (report.takeaways && report.takeaways.length) {
      L.push('KEY TAKEAWAYS');
      report.takeaways.forEach(t => L.push('• ' + window.statsToPlain(t)));
      L.push('');
    }
    L.push('Classification: Official (Open)');
    L.push(window.statsToPlain(report.sourceNote));
    return L.join('\n');
  }

  function reportHTML() {
    const secHTML = report.sections.map(s =>
      `<h2>${window.escapeHTML ? window.escapeHTML(s.heading) : s.heading}</h2>` +
      (s.paragraphs || []).map(p => `<p>${window.statsToHTML(p)}</p>`).join('')
    ).join('');
    const takeHTML = (report.takeaways && report.takeaways.length)
      ? `<h2>Key Takeaways</h2><ul>${report.takeaways.map(t => `<li>${window.statsToHTML(t)}</li>`).join('')}</ul>` : '';
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${window.escapeHTML(report.title)}</title>
<style>
body{font-family:Georgia,'Times New Roman',serif;color:#16202B;line-height:1.5;max-width:720px;margin:40px auto;padding:0 28px;}
h1{font-size:21px;margin:0 0 4px;line-height:1.25;}
.sub{font-size:13px;color:#5A6573;font-style:italic;margin:0 0 22px;}
h2{font-size:15px;margin:22px 0 6px;color:#0C3B6E;font-family:Arial,Helvetica,sans-serif;}
p{margin:0 0 10px;font-size:13.5px;}
ul{margin:4px 0 12px;padding-left:20px;}li{margin:0 0 5px;font-size:13.5px;}
.foot{margin-top:26px;padding-top:12px;border-top:1px solid #D5DCE4;font-size:11px;color:#5A6573;}
.cls{font-weight:bold;color:#0C3B6E;}
</style></head><body>
<h1>${window.escapeHTML(report.title)}</h1>
<div class="sub">${window.escapeHTML(report.subtitle || '')}</div>
${report.overview ? `<h2>Overview</h2><p>${window.statsToHTML(report.overview)}</p>` : ''}
${secHTML}
${takeHTML}
<div class="foot"><div class="cls">Classification: Official (Open)</div><div>${window.statsToHTML(report.sourceNote)}</div></div>
</body></html>`;
  }

  function doCopy() {
    const t = plainText();
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 1600); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, done);
    else { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove(); done(); }
  }
  function doWord() {
    const html = reportHTML();
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    triggerDownload(blob, `${window.scopeFileSlug(scope)}_Summary_${window.reportDateSlug()}.doc`);
  }
  function doPDF() {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(reportHTML() + '<script>window.onload=function(){setTimeout(function(){window.print();},250);};<\/script>');
    w.document.close();
  }
  function triggerDownload(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click();
    a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  return (
    <div className="report-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="report-modal" role="dialog" aria-label="Summary report">
        <div className="rep-head">
          <div className="rep-head-titles">
            <div className="rep-head-title"><span className="rep-ic">✦</span> Summary Report</div>
            <div className="rep-head-sub">{scopeDesc} · {country || 'Singapore'} · Generated {dateStr}</div>
          </div>
          <button className="rep-x" onClick={onClose} aria-label="Close report">✕</button>
        </div>

        <div className="rep-scopebar">
          <span className="rep-scopebar-txt">Scope: <b>{scopeDesc}</b> · {country || 'Singapore'}</span>
          <button className="rep-editscope" onClick={onEditScope}>Edit scope &amp; regenerate →</button>
        </div>

        <div className="rep-doc" ref={bodyRef}>
          {!report && !err && (
            <div className="rep-loading">
              <div className="rep-spin" />
              <div className="rep-loading-txt">Retrieving live data and drafting the summary…</div>
            </div>
          )}
          {err && <div className="rep-loading"><div className="rep-loading-txt">The report could not be generated. Please try again.</div></div>}
          {report && (
            <article className="rep-article">
              <h1 className="rep-title">{report.title}</h1>
              <div className="rep-subtitle">{report.subtitle}</div>
              {report.overview && (<><h2 className="rep-h2">Overview</h2><p className="rep-p">{window.renderStatNodes(report.overview, 'ov')}</p></>)}
              {report.sections.map((s, si) => (
                <React.Fragment key={si}>
                  <h2 className="rep-h2">{s.heading}</h2>
                  {(s.paragraphs || []).map((p, pi) => <p key={pi} className="rep-p">{window.renderStatNodes(p, 's' + si + '_' + pi)}</p>)}
                </React.Fragment>
              ))}
              {report.takeaways && report.takeaways.length > 0 && (
                <><h2 className="rep-h2">Key Takeaways</h2>
                <ul className="rep-takeaways">{report.takeaways.map((t, ti) => <li key={ti}>{window.renderStatNodes(t, 't' + ti)}</li>)}</ul></>
              )}
              <div className="rep-srcnote">{window.renderStatNodes(report.sourceNote, 'src')}</div>
              {report.generatedOffline && <div className="rep-offline">Generated locally from the loaded dataset — the live model connection was unavailable, so this uses the dashboard's in-memory data directly.</div>}
            </article>
          )}
        </div>

        <div className="rep-foot">
          <span className="rep-class">Classification: Official (Open)</span>
          <div className="rep-actions">
            <button className="rep-btn ghost" disabled={!report} onClick={doCopy}>{copied ? 'Copied ✓' : 'Copy text'}</button>
            <button className="rep-btn ghost" disabled={!report} onClick={doWord}>Download Word</button>
            <button className="rep-btn primary" disabled={!report} onClick={doPDF}>⬇ PDF</button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ReportScopeModal, ReportModal });

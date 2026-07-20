/* ============================================================
   DASHDE — "Download Report" (top-nav entry point)
   A second, standalone report flow distinct from the DASH-DE
   Assistant's report mode: always scoped to Singapore across all
   5 publications (no scope picker), generated text is directly
   editable before download, and the PDF embeds 4 chart screenshots
   captured live from freshly-rendered chart components via
   html2canvas. Reuses report.jsx's generateReport/statsToHTML
   pipeline so figures match the rest of the dashboard exactly.
   ============================================================ */

const DLR_PUBS = ['IMD WCY', 'IMD WDC', 'NRI', 'GARI', 'GAI'];
const DLR_COUNTRY = 'Singapore';

function DownloadReportButton({ onClick }) {
  return (
    <button className="download-report-btn" onClick={onClick} title="Generate a one-page AI summary of Singapore's position">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      Download Report
    </button>
  );
}

/* ---------- chart data assembly (mirrors buildReportData's per-pub helpers) ---------- */
function dlrChartData(country) {
  const out = {};
  out.wcy = { series: (window.overallSeries ? window.overallSeries('IMD WCY', 'Overall', country) : []), color: '#0A6EA8', label: 'IMD WCY — Overall Ranking Trend' };
  out.nri = { series: (window.overallSeries ? window.overallSeries('NRI', 'Network Readiness Index', country) : []), color: '#534AB7', label: 'NRI — Overall Ranking Trend' };

  // GARI overall trend, 2021–2025 (overall rank is cross-era comparable per lib.jsx)
  const gariYs = (window.gariYears ? window.gariYears() : []).filter(y => y >= 2021 && y <= 2025).sort((a, b) => a - b);
  out.gari = {
    series: gariYs.map(y => { const r = window.gariOverallRow ? window.gariOverallRow(country, y) : null; return r ? { y, r: r.rank, sc: r.score } : null; }).filter(Boolean),
    color: '#BE5A00', label: 'GARI — Overall Ranking Trend (2021–2025)',
  };

  // GAI sub-pillar rank profile — strongest pillar for the country, its first sub-pillar
  let gaiRows = [], gaiTitle = 'GAI — Sub-Pillar Country Comparison';
  try {
    const dims = window.gaiPillars ? window.gaiPillars() : [];
    const gaiYs = window.gaiYears ? window.gaiYears() : [];
    const year = gaiYs.length ? gaiYs[0] : window.LATEST_YEAR; // gaiYears() is newest-first
    let best = null;
    dims.forEach(d => {
      const po = window.gaiPillarOverall ? window.gaiPillarOverall(d, country, year) : null;
      if (po && po.r != null && (!best || po.r < best.r)) best = { dim: d, r: po.r };
    });
    const pillar = best ? best.dim : dims[0];
    if (pillar) {
      const subs = window.gaiPillarSubs ? window.gaiPillarSubs(pillar, country, year) : [];
      const sub = subs.length ? subs[0].sub : null;
      if (sub) {
        gaiRows = window.attachYoY(window.gaiCompare(pillar, sub, year, 'all', country), 'Global AI Index', pillar, year, sub, '');
        gaiTitle = `GAI — ${sub} Country Comparison`;
      }
    }
  } catch (e) { /* leave empty — panel omitted from PDF if no data */ }
  out.gai = { rows: gaiRows, label: gaiTitle };

  return out;
}

/* Off-screen chart mounts, captured via html2canvas once rendered. Rendered at a
   fixed size (not display:none, so layout + SVG paint actually happen) but pushed
   far outside the viewport so nothing flashes on screen. */
function DlrChartRig({ data, onReady }) {
  const wrapRef = React.useRef(null);
  const doneRef = React.useRef(false);
  React.useEffect(() => {
    if (doneRef.current) return;
    if (typeof window.html2canvas !== 'function') { onReady({}); return; }
    const el = wrapRef.current;
    const capture = async () => {
      const ids = ['dlr-c-wcy', 'dlr-c-nri', 'dlr-c-gari', 'dlr-c-gai'];
      const imgs = {};
      for (const id of ids) {
        const node = el.querySelector('#' + id);
        if (!node) continue;
        try {
          const canvas = await window.html2canvas(node, { scale: 2, backgroundColor: '#FFFFFF', useCORS: true });
          imgs[id] = canvas.toDataURL('image/png');
        } catch (e) { /* skip this chart on failure */ }
      }
      doneRef.current = true;
      onReady(imgs);
    };
    const t = setTimeout(capture, 260); // let SVG/flag images settle
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={wrapRef} style={{ position: 'fixed', left: -10000, top: 0, width: 520, background: '#fff', pointerEvents: 'none' }} aria-hidden="true">
      {data.wcy.series && data.wcy.series.length >= 2 && (
        <div id="dlr-c-wcy" style={{ width: 480, height: 210, padding: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0C3B6E', marginBottom: 4 }}>{data.wcy.label}</div>
          <div style={{ width: 456, height: 170 }}><window.RankTrendChart series={data.wcy.series} country={DLR_COUNTRY} color={data.wcy.color} /></div>
        </div>
      )}
      {data.nri.series && data.nri.series.length >= 2 && (
        <div id="dlr-c-nri" style={{ width: 480, height: 210, padding: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0C3B6E', marginBottom: 4 }}>{data.nri.label}</div>
          <div style={{ width: 456, height: 170 }}><window.RankTrendChart series={data.nri.series} country={DLR_COUNTRY} color={data.nri.color} /></div>
        </div>
      )}
      {data.gari.series && data.gari.series.length >= 2 && (
        <div id="dlr-c-gari" style={{ width: 480, height: 210, padding: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0C3B6E', marginBottom: 4 }}>{data.gari.label}</div>
          <div style={{ width: 456, height: 170 }}><window.RankTrendChart series={data.gari.series} country={DLR_COUNTRY} color={data.gari.color} /></div>
        </div>
      )}
      {data.gai.rows && data.gai.rows.length > 0 && (
        <div id="dlr-c-gai" style={{ width: 480, padding: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0C3B6E', marginBottom: 4 }}>{data.gai.label}</div>
          <div style={{ width: 456 }}><window.CountryBarChart rows={data.gai.rows.slice(0, 8)} selectedCountry={DLR_COUNTRY} interactive={false} highlightColor="#BE185D" widthByScore /></div>
        </div>
      )}
    </div>
  );
}

/* ---------- generation progress step list ---------- */
const DLR_STEPS = ['Retrieving latest rankings from Supabase…', "Analysing Singapore's position across all publications…", 'Drafting summary…'];
function DlrGenerating() {
  const [step, setStep] = React.useState(0);
  React.useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 900), t2 = setTimeout(() => setStep(2), 1900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  return (
    <div className="rep-loading">
      <div className="rep-spin" />
      <div className="dlr-steps">
        {DLR_STEPS.map((s, i) => <div key={i} className={'dlr-step' + (i <= step ? ' on' : '')}>✦ {s}</div>)}
      </div>
    </div>
  );
}

function DownloadReportModal({ onClose }) {
  const [report, setReport] = React.useState(null);
  const [err, setErr] = React.useState(false);
  const [chartImgs, setChartImgs] = React.useState(null);
  const [copied, setCopied] = React.useState(false);
  const [gen, setGen] = React.useState(0); // bump to force regenerate
  const editRef = React.useRef(null);
  const chartData = React.useMemo(() => dlrChartData(DLR_COUNTRY), [gen]);

  React.useEffect(() => {
    let alive = true;
    setReport(null); setErr(false); setChartImgs(null);
    const scope = { mode: 'full', pubs: DLR_PUBS };
    (async () => {
      try { const r = await window.generateReport(scope, DLR_COUNTRY); if (alive) setReport(r); }
      catch (e) { if (alive) setErr(true); }
    })();
    return () => { alive = false; };
  }, [gen]);

  const dateStr = window.reportDateStr();

  function docHTML() {
    // Prefer the user's edited HTML if the editable area has been mounted; falls
    // back to the freshly-generated markup (matches Word/PDF export conventions
    // used by the Assistant's report modal).
    const inner = editRef.current ? editRef.current.innerHTML : reportBodyHTML();
    const chartHTML = chartImgs ? Object.values(chartImgs).map(src => `<img src="${src}" style="width:100%;max-width:520px;display:block;margin:14px auto;">`).join('') : '';
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${window.escapeHTML(report.title)}</title>
<style>
body{font-family:Georgia,'Times New Roman',serif;color:#16202B;line-height:1.5;max-width:720px;margin:40px auto;padding:0 28px;}
h1{font-size:27px;margin:0 0 4px;line-height:1.25;}
.sub{font-size:16px;color:#5A6573;font-style:italic;margin:0 0 22px;}
h2{font-size:20px;margin:22px 0 6px;color:#0C3B6E;font-family:Arial,Helvetica,sans-serif;}
p{margin:0 0 10px;font-size:18px;}
ul{margin:4px 0 12px;padding-left:20px;}li{margin:0 0 5px;font-size:18px;}
.foot{margin-top:26px;padding-top:12px;border-top:1px solid #D5DCE4;font-size:13px;color:#5A6573;}
.cls{font-weight:bold;color:#0C3B6E;}
</style></head><body>${inner}${chartHTML}
<div class="foot"><div class="cls">Classification: Official (Open)</div><div>Source: DASH-DE · Generated ${dateStr}</div></div>
</body></html>`;
  }

  function reportBodyHTML() {
    const secHTML = report.sections.map(s =>
      `<h2>${window.escapeHTML(s.heading)}</h2>` + (s.paragraphs || []).map(p => `<p>${window.statsToHTML(p)}</p>`).join('')
    ).join('');
    const takeHTML = (report.takeaways && report.takeaways.length)
      ? `<h2>Key Takeaways</h2><ul>${report.takeaways.map(t => `<li>${window.statsToHTML(t)}</li>`).join('')}</ul>` : '';
    return `<h1>${window.escapeHTML(report.title)}</h1><div class="sub">${window.escapeHTML(report.subtitle || '')}</div>
${report.overview ? `<h2>Overview</h2><p>${window.statsToHTML(report.overview)}</p>` : ''}${secHTML}${takeHTML}`;
  }

  function doCopy() {
    const text = editRef.current ? editRef.current.innerText : '';
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 1600); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done);
    else { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove(); done(); }
  }
  function doPDF() {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(docHTML() + '<script>window.onload=function(){setTimeout(function(){window.print();},250);};<\/script>');
    w.document.close();
  }
  function doRegenerate() {
    if (window.confirm('Regenerate the report? Your edits to the current draft will be discarded.')) setGen(g => g + 1);
  }

  return (
    <div className="report-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="report-modal" role="dialog" aria-label="Download report">
        <div className="rep-head">
          <div className="rep-head-titles">
            <div className="rep-head-title"><span className="rep-ic">⬇</span> Report Preview</div>
            <div className="rep-head-sub">Singapore's International Benchmark Performance · {dateStr}</div>
          </div>
          <button className="rep-x" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="rep-scopebar">
          <span className="rep-scopebar-txt">Review and edit the text below before downloading.</span>
        </div>

        <div className="rep-doc">
          {!report && !err && <DlrGenerating />}
          {err && <div className="rep-loading"><div className="rep-loading-txt">The report could not be generated. Please try again.</div></div>}
          {report && (
            <article className="rep-article dlr-editable" contentEditable suppressContentEditableWarning ref={editRef}
              dangerouslySetInnerHTML={{ __html: reportBodyHTML() }} />
          )}
          {report && <DlrChartRig data={chartData} onReady={setChartImgs} />}
        </div>

        <div className="rep-foot">
          <span className="rep-class">⚠ AI-generated from live data. Review figures before external distribution.</span>
          <div className="rep-actions">
            <button className="rep-btn ghost" disabled={!report} onClick={doRegenerate}>Regenerate</button>
            <button className="rep-btn ghost" disabled={!report} onClick={doCopy}>{copied ? 'Copied ✓' : 'Copy text'}</button>
            <button className="rep-btn primary" disabled={!report} onClick={doPDF}>⬇ Download PDF</button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DownloadReportButton, DownloadReportModal });

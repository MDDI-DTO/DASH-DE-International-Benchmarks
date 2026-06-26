/* ============================================================
   DASHDE — Admin portal (working UI demo)
   ============================================================ */
/* Role IS the authentication now — only Admin users can reach this portal
   (the Admin button is hidden from Viewers and the route is guarded in app.jsx),
   so no separate password gate is needed. */
function AdminPortal({ user, onExit }) {
  const [tab, setTab] = React.useState('upload');
  return (
    <div className="admin-root">
      <div className="topbar">
        <div className="tb-brand"><span className="tb-dot" /> DASHDE — International Benchmarks <span className="tb-admin-tag">Admin</span></div>
        <div className="tb-right">
          {user && <span className="tb-welcome">{displayName(user)}</span>}
          <button className="tb-btn" onClick={onExit}>Exit admin</button>
        </div>
      </div>
      <div className="admin-body">
        <div className="admin-nav">
          <button className={'an-item' + (tab === 'upload' ? ' active' : '')} onClick={() => setTab('upload')}>Data upload</button>
          <button className={'an-item' + (tab === 'users' ? ' active' : '')} onClick={() => setTab('users')}>User access</button>
        </div>
        <div className="admin-main">
          {tab === 'upload' ? <DataUpload /> : <UserAccess currentUser={user} />}
        </div>
      </div>
    </div>
  );
}

function DataUpload() {
  const [drag, setDrag] = React.useState(false);
  const [parsing, setParsing] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [result, setResult] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  const inputRef = React.useRef(null);

  // Normalise an arbitrary xlsx row into the international_benchmarks schema.
  function normaliseRow(raw) {
    const lower = {};
    for (const k of Object.keys(raw)) lower[k.trim().toLowerCase()] = raw[k];
    const pick = (...names) => {
      for (const n of names) if (lower[n] != null && lower[n] !== '') return lower[n];
      return null;
    };
    const num = v => (v == null || v === '' ? null : Number(v));
    return {
      year: num(pick('year')),
      publication: pick('publication'),
      indicator: pick('indicator'),
      sub_indicator: pick('sub_indicator', 'sub indicator', 'subindicator'),
      third_tier_indicator: pick('third_tier_indicator', 'third tier indicator', 'third_tier'),
      definition: pick('definition'),
      rank: num(pick('rank')),
      country: pick('country'),
      score: num(pick('score')),
    };
  }

  async function upsertAll(rows) {
    if (!window.sb) throw new Error('Supabase client not available.');
    const CHUNK = 500;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const batch = rows.slice(i, i + CHUNK);
      const { error } = await window.sb
        .from('international_benchmarks')
        .upsert(batch, { onConflict: 'year,publication,indicator,sub_indicator,third_tier_indicator,country' });
      if (error) throw error;
      setProgress(Math.round(Math.min(100, ((i + batch.length) / rows.length) * 100)));
    }
  }

  function handleFile(file) {
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name)) { setToast({ type: 'err', msg: 'Please upload a .xlsx file.' }); return; }
    setParsing(true); setProgress(0); setResult(null);
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { defval: null });
        const cols = json.length ? Object.keys(json[0]) : [];
        setResult({ name: file.name, rows: json.length, cols, sample: json.slice(0, 6) });
        const mapped = json.map(normaliseRow).filter(r => r.publication && r.indicator && r.country && r.year != null);
        upsertAll(mapped)
          .then(async () => {
            setParsing(false); setProgress(100);
            setToast({ type: 'ok', msg: `Upserted ${mapped.length.toLocaleString()} rows into international_benchmarks.` });
            setTimeout(() => setToast(null), 4500);
            // pull the freshly-written data into the live dashboard
            if (window.loadData) await window.loadData();
          })
          .catch(err => {
            setParsing(false);
            setToast({ type: 'err', msg: 'Supabase upsert failed: ' + (err.message || err) });
            setTimeout(() => setToast(null), 7000);
          });
      } catch (err) {
        setParsing(false); setToast({ type: 'err', msg: 'Failed to parse file: ' + err.message });
      }
    };
    reader.readAsArrayBuffer(file);
  }

  return (
    <div className="au-wrap">
      <h2 className="admin-h">Data upload</h2>
      <p className="admin-p">Drop an <code>.xlsx</code> export to parse client-side and upsert into the <code>international_benchmarks</code> table
        <span className="onconflict"> on conflict <code>year, publication, indicator, sub_indicator, third_tier_indicator, country</code></span>.</p>

      <div className={'dropzone' + (drag ? ' drag' : '')}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => inputRef.current.click()}>
        <input ref={inputRef} type="file" accept=".xlsx" hidden onChange={e => handleFile(e.target.files[0])} />
        <div className="dz-icon">⬆</div>
        <div className="dz-main">Drag &amp; drop an .xlsx file</div>
        <div className="dz-sub">or click to browse</div>
      </div>

      {parsing && (
        <div className="upload-prog">
          <div className="up-label">Upserting rows… {progress}%</div>
          <div className="up-bar"><div className="up-fill" style={{ width: progress + '%' }} /></div>
        </div>
      )}

      {result && (
        <div className="preview">
          <div className="preview-head">
            <span className="preview-file">{result.name}</span>
            <span className="preview-count">{result.rows.toLocaleString()} rows · {result.cols.length} columns</span>
          </div>
          <div className="preview-table-wrap">
            <table className="preview-table">
              <thead><tr>{result.cols.map(c => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>
                {result.sample.map((r, i) => (
                  <tr key={i}>{result.cols.map(c => <td key={c}>{r[c] == null ? '' : String(r[c])}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="preview-foot">Showing first {result.sample.length} of {result.rows.toLocaleString()} rows</div>
        </div>
      )}

      {toast && <div className={'toast ' + toast.type}>{toast.type === 'ok' ? '✓ ' : '✕ '}{toast.msg}</div>}
    </div>
  );
}

/* ============================================================
   User access management
   Reads dashboard_users (or the bundled demo directory), and
   supports inline role edit, access suspend/reinstate, remove,
   and add. Every write attempts Supabase first and degrades to
   local state with an honest toast when the anon key is blocked.
   ============================================================ */
function UserAccess({ currentUser }) {
  const [users, setUsers] = React.useState(DASHDE_USERS.slice());
  const [live, setLive] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState('Viewer');
  const [roleMenu, setRoleMenu] = React.useState(null); // id of row whose role menu is open
  const [toast, setToast] = React.useState(null);

  React.useEffect(() => {
    let alive = true;
    fetchUserDirectory().then(({ users, live }) => {
      if (!alive) return;
      // make sure the signed-in admin appears in the directory
      let list = users.slice();
      if (currentUser && !list.some(u => String(u.email).toLowerCase() === String(currentUser.email).toLowerCase())) {
        list = [currentUser, ...list];
      }
      setUsers(list); setLive(live);
    });
    return () => { alive = false; };
  }, []);

  function flash(msg, err) { setToast({ msg, err }); setTimeout(() => setToast(null), 2800); }
  const isSelf = u => currentUser && String(u.email).toLowerCase() === String(currentUser.email).toLowerCase();
  const writable = u => window.sb && live && !String(u.id).startsWith('demo-') && !String(u.id).startsWith('local-');

  async function setAccess(u, next) {
    setUsers(us => us.map(x => x.id === u.id ? { ...x, has_access: next } : x));
    if (writable(u)) {
      const { error } = await window.sb.from('dashboard_users').update({ has_access: next }).eq('id', u.id);
      if (error) { setUsers(us => us.map(x => x.id === u.id ? { ...x, has_access: u.has_access } : x)); flash('Update failed: ' + (error.message || error), true); return; }
      flash('Saved to Supabase');
    } else { flash('Access ' + (next ? 'reinstated' : 'suspended') + ' (local)'); }
  }

  async function changeRole(u, nextRole) {
    setRoleMenu(null);
    if (u.role === nextRole) return;
    setUsers(us => us.map(x => x.id === u.id ? { ...x, role: nextRole } : x));
    if (writable(u)) {
      const { error } = await window.sb.from('dashboard_users').update({ role: nextRole }).eq('id', u.id);
      if (error) { setUsers(us => us.map(x => x.id === u.id ? { ...x, role: u.role } : x)); flash('Update failed: ' + (error.message || error), true); return; }
      flash('Saved to Supabase');
    } else { flash('Role set to ' + nextRole + ' (local)'); }
  }

  async function remove(u) {
    if (isSelf(u)) return;
    if (!window.confirm(`Permanently remove ${u.email}? Consider suspending access instead.`)) return;
    setUsers(us => us.filter(x => x.id !== u.id));
    if (writable(u)) {
      const { error } = await window.sb.from('dashboard_users').delete().eq('id', u.id);
      if (error) { flash('Remove failed: ' + (error.message || error), true); return; }
      flash('Removed · saved to Supabase');
    } else { flash('User removed (local)'); }
  }

  async function add(e) {
    e.preventDefault();
    const addr = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr)) { flash('Enter a valid email address', true); return; }
    if (users.some(u => u.email.toLowerCase() === addr.toLowerCase())) { flash('That email already exists', true); return; }
    const row = { email: addr, role, has_access: true };
    if (window.sb) {
      const { data, error } = await window.sb.from('dashboard_users').insert(row).select();
      if (!error && data && data.length) {
        setUsers(us => [{ ...data[0], role: normRole(data[0].role) }, ...us]); setEmail(''); setLive(true);
        flash('User added · saved to Supabase'); return;
      }
      setUsers(us => [{ id: 'local-' + Date.now(), ...row, created_at: new Date().toISOString() }, ...us]); setEmail('');
      flash('Added locally — Supabase write blocked', true); return;
    }
    setUsers(us => [{ id: 'local-' + Date.now(), ...row, created_at: new Date().toISOString() }, ...us]); setEmail('');
    flash('Added locally — no Supabase client', true);
  }

  const activeCount = users.filter(u => u.has_access).length;

  return (
    <div className="ua-wrap" onClick={() => roleMenu && setRoleMenu(null)}>
      <h2 className="admin-h">User access</h2>
      <p className="admin-p">Manage who can sign in to the dashboard. Changes persist to the <code>dashboard_users</code> table.
        {!live && <span className="onconflict"> Showing the demo directory — the live table is empty or not yet writable, so edits apply locally.</span>}</p>

      {/* column legend */}
      <div className="ua-legend">
        <div className="ua-leg-item"><span className="ua-leg-k">Active access</span> Temporarily suspend or reinstate a user without deleting their account or changing their role.</div>
        <div className="ua-leg-item"><span className="ua-leg-k">Role</span> Click any role pill to change it inline. Admins reach this portal; Viewers see the dashboard only.</div>
        <div className="ua-leg-item"><span className="ua-leg-k">Remove</span> Permanently deletes the user record. Prefer suspending access over removal.</div>
      </div>

      {/* add user form */}
      <form className="ua2-add" onSubmit={add}>
        <input className="ua-input" placeholder="name@agency.gov.sg" value={email} onChange={e => setEmail(e.target.value)} />
        <div className="flt-select-wrap ua-rolesel">
          <select className="flt-select" value={role} onChange={e => setRole(e.target.value)}>
            <option value="Viewer">Viewer</option>
            <option value="Admin">Admin</option>
          </select>
          <svg className="flt-caret" width="9" height="6" viewBox="0 0 9 6"><path d="M1 1l3.5 3.5L8 1" stroke="#6B7280" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <button className="ua-btn" type="submit">Add user</button>
      </form>
      <div className="ua-hint"><b>Admin</b> — full access including admin portal · <b>Viewer</b> — dashboard access only</div>

      {/* user table */}
      <div className="ua2-table">
        <div className="ua2-head">
          <span>Email</span><span>Role</span><span>Date added</span><span>Active access</span><span className="ua2-actions-h">Actions</span>
        </div>
        {users.map(u => {
          const self = isSelf(u);
          return (
            <div className="ua2-row" key={u.id || u.email}>
              <span className="ua2-email">{u.email}{self && <span className="you-tag">(you)</span>}</span>

              <span className="role-cell">
                <span className="role-pill-wrap">
                  <button className={'role-pill ' + (u.role === 'Admin' ? 'admin' : 'viewer')}
                    onClick={e => { e.stopPropagation(); setRoleMenu(roleMenu === u.id ? null : u.id); }}>
                    {u.role}<span className="role-caret">▾</span>
                  </button>
                  {roleMenu === u.id && (
                    <div className="role-menu" onClick={e => e.stopPropagation()}>
                      {[['Admin', 'Full access including admin portal'], ['Viewer', 'Dashboard access only']].map(([r, desc]) => (
                        <button key={r} className="role-opt" onClick={() => changeRole(u, r)}>
                          <span className="role-opt-check">{u.role === r ? '✓' : ''}</span>
                          <span><span className="role-opt-name">{r}</span><span className="role-opt-desc">{desc}</span></span>
                        </button>
                      ))}
                    </div>
                  )}
                </span>
              </span>

              <span className="date-added">{fmtDateAdded(u.created_at)}</span>

              <span className="access-cell">
                {self ? (
                  <><button className="toggle on" disabled aria-label="Always on"><span className="toggle-knob" /></button><span className="always-on">Always on</span></>
                ) : (
                  <><button className={'toggle' + (u.has_access ? ' on' : '')} onClick={() => setAccess(u, !u.has_access)} aria-label="Toggle access"><span className="toggle-knob" /></button>
                    <span className={'access-label ' + (u.has_access ? 'on' : 'off')}>{u.has_access ? 'Active' : 'Suspended'}</span></>
                )}
              </span>

              <span className="ua2-actions">
                {!self && <button className="remove-btn" onClick={() => remove(u)}><span className="rm-ic">✕</span> Remove</button>}
              </span>
            </div>
          );
        })}
      </div>

      <div className="ua2-foot">{users.length} user{users.length === 1 ? '' : 's'} total · {activeCount} with active access</div>

      {toast && <div className={'toast ' + (toast.err ? 'err' : 'ok')}>{toast.err ? '✕ ' : '✓ '}{toast.msg}</div>}
    </div>
  );
}

Object.assign(window, { AdminPortal });

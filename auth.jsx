/* ============================================================
   DASHDE — Authentication + user directory
   Reads the dashboard_users table when populated; otherwise
   falls back to this bundled demo directory so the role-based
   login / admin flows are fully demonstrable. The anon key is
   read-only against Supabase, so writes degrade to local state
   with an honest toast (see admin.jsx).
   ============================================================ */

const DEMO_PASSWORD = 'dashde';

/* Bundled demo directory — used when dashboard_users is empty/unreachable. */
const DASHDE_USERS = [
  { id: 'demo-1', email: 'wei.tan@dashde.gov.sg',     name: 'Wei Lin Tan', role: 'Admin',  has_access: true,  created_at: '2026-05-29T09:12:00Z' },
  { id: 'demo-2', email: 'sherlynn.yeo@gov.sg',      name: 'Sherlynn Yeo', role: 'Viewer', has_access: true,  created_at: '2026-05-22T14:03:00Z' },
  { id: 'demo-3', email: 'james.lim@imda.gov.sg',     name: 'James Lim',   role: 'Admin',  has_access: true,  created_at: '2026-05-14T08:41:00Z' },
  { id: 'demo-4', email: 'mei.chen@gov.sg',           name: 'Mei Chen',    role: 'Viewer', has_access: true,  created_at: '2026-04-30T11:27:00Z' },
  { id: 'demo-5', email: 'alex.romero@example.com',   name: 'Alex Romero', role: 'Viewer', has_access: false, created_at: '2026-04-12T16:55:00Z' },
  { id: 'demo-6', email: 'sara.koh@gov.sg',           name: 'Sara Koh',    role: 'Viewer', has_access: false, created_at: '2026-03-08T10:09:00Z' },
];

const SESSION_KEY = 'dashde_session_email';

/* ---------- helpers ---------- */
function prettyFromEmail(email) {
  if (!email) return 'User';
  const local = email.split('@')[0];
  return local.split(/[._-]+/).filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
function displayName(u) {
  if (!u) return 'User';
  if (u.name) return u.name;
  const fl = [u.first_name, u.last_name].filter(Boolean).join(' ');
  if (fl) return fl;
  return prettyFromEmail(u.email);
}
function firstName(u) { return displayName(u).split(' ')[0]; }
function normRole(r) {
  const v = String(r || 'Viewer').toLowerCase();
  return v === 'admin' ? 'Admin' : 'Viewer';
}
function fmtDateAdded(v) {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d)) return String(v);
  const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${String(d.getDate()).padStart(2, '0')} ${m[d.getMonth()]} ${d.getFullYear()}`;
}

/* Load the user directory: live dashboard_users if it has rows, else the demo seed. */
async function fetchUserDirectory() {
  if (window.sb) {
    try {
      const { data, error } = await window.sb
        .from('dashboard_users')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data && data.length) {
        return { users: data.map(u => ({ ...u, role: normRole(u.role) })), live: true };
      }
    } catch (e) { /* fall through to demo */ }
  }
  return { users: DASHDE_USERS.slice(), live: false };
}

function findByEmail(users, email) {
  const e = String(email || '').trim().toLowerCase();
  return users.find(u => String(u.email).toLowerCase() === e) || null;
}

/* ---------- login page ---------- */
function LoginPage({ users, onLogin }) {
  const [email, setEmail] = React.useState('');
  const [pw, setPw] = React.useState('');
  const [err, setErr] = React.useState('');

  function submit(e) {
    e.preventDefault();
    const u = findByEmail(users, email);
    if (!u) { setErr('No account found for that email address.'); return; }
    if (!u.has_access) { setErr('Access suspended. Contact an administrator.'); return; }
    if (pw !== DEMO_PASSWORD) { setErr('Incorrect password.'); return; }
    onLogin(u);
  }

  function quick(addr) { setEmail(addr); setPw(DEMO_PASSWORD); setErr(''); }

  return (
    <div className="login-stage">
      <div className="login-card">
        <div className="login-brand"><span className="login-dot" /> DASHDE</div>
        <div className="login-title">Sign in</div>
        <div className="login-sub">International Benchmarks · Restricted access</div>

        <form onSubmit={submit}>
          <div className="login-field">
            <label className="login-label">Email address</label>
            <input className={'login-input' + (err ? ' error' : '')} type="email" autoComplete="username"
              placeholder="name@agency.gov.sg" value={email} autoFocus
              onChange={e => { setEmail(e.target.value); setErr(''); }} />
          </div>
          <div className="login-field">
            <label className="login-label">Password</label>
            <input className={'login-input' + (err ? ' error' : '')} type="password" autoComplete="current-password"
              placeholder="••••••••" value={pw}
              onChange={e => { setPw(e.target.value); setErr(''); }} />
          </div>
          {err && <div className="login-err">{err}</div>}
          <button className="login-btn" type="submit">Sign in</button>
        </form>

        <div className="login-demos">
          <div className="login-demos-h">Demo accounts · password <code>{DEMO_PASSWORD}</code></div>
          <div className="login-demos-row">
            <button type="button" className="login-demo" onClick={() => quick('wei.tan@dashde.gov.sg')}>
              <span className="ld-role admin">Admin</span> wei.tan@dashde.gov.sg
            </button>
            <button type="button" className="login-demo" onClick={() => quick('sherlynn.yeo@gov.sg')}>
              <span className="ld-role viewer">Viewer</span> sherlynn.yeo@gov.sg
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  DASHDE_USERS, DEMO_PASSWORD, SESSION_KEY,
  displayName, firstName, normRole, fmtDateAdded,
  fetchUserDirectory, findByEmail, LoginPage,
});

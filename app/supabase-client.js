/* ============================================================
   DASHDE — Supabase connection
   The project's existing Supabase project + anon key. The client
   is created from the supabase-js UMD bundle loaded just above
   this script. Exposed as window.sb for the data + admin layers.
   ============================================================ */
(function () {
  var SUPABASE_URL = 'https://ftlymckgxdkvgcguhlxh.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0bHltY2tneGRrdmdjZ3VobHhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2NDg2MDUsImV4cCI6MjA5NTIyNDYwNX0.k6P21MYJoWZxhueDw_seoFHb21qnIURJXFaYN3e-M98';

  window.SB_CONFIG = { url: SUPABASE_URL, key: SUPABASE_ANON_KEY };

  try {
    // supabase-js UMD exposes window.supabase.createClient
    window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } catch (e) {
    console.error('[DASHDE] Supabase client init failed:', e);
    window.sb = null;
  }
})();

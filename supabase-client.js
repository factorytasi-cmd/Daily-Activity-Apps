// =========================================================
// LUSS — Koneksi ke Supabase
// =========================================================

const SUPABASE_URL = 'https://bxskofuhepzyvvyyifmo.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_GhisykcOaK2inqR98SKiiA_OPwkgORH';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);


/** Daftar akun baru. */
async function signUp(email, password, fullName) {
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName }
    }
  });
  if (error) throw error;
  return data;
}

/** Login pakai email. */
async function signIn(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

/** Keluar dari akun. */
async function signOut() {
  const { error } = await supabaseClient.auth.signOut();
  if (error) throw error;
  window.location.href = 'index.html';
}

/** Ambil session yang sedang aktif (null kalau belum login). */
async function getSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  return session;
}

/** Ambil baris profil dari tabel profiles berdasarkan user id. */
async function getProfile(userId) {
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

/**
 * Dipanggil di halaman yang WAJIB login (home, dashboard, dll).
 * Kalau belum login, langsung dilempar ke halaman login.
 * Kalau sudah, mengembalikan { session, profile }.
 */
async function requireAuth() {
  const session = await getSession();
  if (!session) {
    window.location.href = 'index.html';
    return null;
  }
  const profile = await getProfile(session.user.id);
  return { session, profile };
}

/**
 * Dipanggil di halaman login/signup.
 * Kalau ternyata sudah login, langsung dilempar ke home.
 */
async function redirectIfLoggedIn() {
  const session = await getSession();
  if (session) {
    window.location.href = 'home.html';
  }
}

// =========================================================
// CARA PAKAI DI setiap HTML:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
// <script src="supabase-client.js"></script>
// (library supabase-js harus dimuat SEBELUM file ini)
// =========================================================

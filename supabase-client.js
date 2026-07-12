// =========================================================
// LUSS — Koneksi ke Supabase
// File ini menghubungkan aplikasi ke database & auth Supabase.
// =========================================================

// Ganti dua nilai ini kalau suatu saat pindah project Supabase
const SUPABASE_URL = 'https://bxskofuhepzyvvyyifmo.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_GhisykcOaK2inqR98SKiiA_OPwkgORH';

// Membuat koneksi (client) ke Supabase.
// Membutuhkan library supabase-js yang dimuat lebih dulu lewat CDN,
// lihat contoh tag <script> di bagian bawah file ini.
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);


// ---------------------------------------------------------
// FUNGSI AUTH — daftar, masuk (login menerima username ATAU email), keluar
// ---------------------------------------------------------

/**
 * Daftar akun baru.
 * @param {string} email
 * @param {string} password
 * @param {string} username
 */
async function signUp(email, password, username) {
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: { username } // disimpan sementara, nanti disinkronkan ke tabel profiles
    }
  });
  if (error) throw error;
  return data;
}

/**
 * Login pakai email.
 * @param {string} email
 * @param {string} password
 */
async function signIn(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

/** Keluar dari akun. */
async function signOut() {
  const { error } = await supabaseClient.auth.signOut();
  if (error) throw error;
}

/** Mendapatkan data user yang sedang login (null kalau belum login). */
async function getCurrentUser() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  return user;
}

// =========================================================
// CARA PAKAI DI index.html:
//
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
// <script src="supabase-client.js"></script>
//
// Urutan ini penting: library supabase-js harus dimuat SEBELUM
// file supabase-client.js ini.
// =========================================================

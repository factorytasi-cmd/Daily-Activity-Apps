// =========================================================
// LUSS — Util pengulangan activity (daily / weekly / monthly)
// =========================================================

const NAMA_HARI = ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'];
const NAMA_BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

/** Senin=1 ... Minggu=7 */
function isoWeekday(date){
  const d = date.getDay();
  return d === 0 ? 7 : d;
}

/** Ke berapa kali weekday ini muncul di bulan itu (minggu ke berapa). */
function weekdayOccurrence(date){
  return Math.ceil(date.getDate() / 7);
}

function formatDateKey(date){
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,'0');
  const d = String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(date){
  return `${NAMA_HARI[isoWeekday(date)-1]}, ${date.getDate()} ${NAMA_BULAN[date.getMonth()]} ${date.getFullYear()}`;
}

function isToday(date){
  const t = new Date(); t.setHours(0,0,0,0);
  const d = new Date(date); d.setHours(0,0,0,0);
  return t.getTime() === d.getTime();
}

/** Apakah sebuah activity jatuh tempo pada tanggal tertentu. */
function isActivityDueOnDate(activity, date){
  if (activity.recurrence_type === 'daily') return true;

  if (activity.recurrence_type === 'weekly') {
    return (activity.weekly_days || []).includes(isoWeekday(date));
  }

  if (activity.recurrence_type === 'monthly') {
    if (activity.monthly_mode === 'fixed_date') {
      return activity.monthly_date === date.getDate();
    }
    if (activity.monthly_mode === 'pattern') {
      return activity.monthly_pattern_weekday === isoWeekday(date)
        && activity.monthly_pattern_occurrence === weekdayOccurrence(date);
    }
  }
  return false;
}

/** Teks ringkas jadwal, dipakai di halaman kelola activity. */
function ringkasJadwal(activity){
  if (activity.recurrence_type === 'daily') return 'Setiap hari';
  if (activity.recurrence_type === 'weekly') {
    const hari = (activity.weekly_days || []).map(n => NAMA_HARI[n-1]);
    return hari.length ? `Setiap ${hari.join(', ')}` : 'Weekly';
  }
  if (activity.recurrence_type === 'monthly') {
    if (activity.monthly_mode === 'fixed_date') return `Tanggal ${activity.monthly_date} tiap bulan`;
    if (activity.monthly_mode === 'pattern') {
      return `${NAMA_HARI[activity.monthly_pattern_weekday-1]}, minggu ke-${activity.monthly_pattern_occurrence}`;
    }
  }
  return '';
}

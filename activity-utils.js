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

/** Ubah array checklist_logs jadi map cepat: "activityId|YYYY-MM-DD" -> is_done */
function buildLogsMap(logs){
  const map = {};
  (logs || []).forEach(l => { map[`${l.activity_id}|${l.log_date}`] = l.is_done; });
  return map;
}

/** Hitung streak (hari berturut-turut semua activity due-nya selesai). Hari ini tidak memutus streak kalau belum selesai. */
function computeStreak(activities, logsMap, today){
  let streak = 0;
  const cursor = new Date(today); cursor.setHours(0,0,0,0);
  const todayKey = formatDateKey(today);

  for (let i = 0; i < 60; i++){
    const due = activities.filter(a => isActivityDueOnDate(a, cursor));
    const key = formatDateKey(cursor);

    if (due.length === 0){
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }

    const allDone = due.every(a => logsMap[`${a.id}|${key}`] === true);

    if (allDone){
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else if (key === todayKey){
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

/** Progres 7 hari terakhir (termasuk hari ini), buat grafik & persentase minggu ini. */
function computeWeekProgress(activities, logsMap, today){
  const days = [];
  for (let i = 6; i >= 0; i--){
    const d = new Date(today); d.setDate(d.getDate() - i);
    const due = activities.filter(a => isActivityDueOnDate(a, d));
    const doneCount = due.filter(a => logsMap[`${a.id}|${formatDateKey(d)}`] === true).length;
    days.push({ label: NAMA_HARI[isoWeekday(d)-1].slice(0,2), dueCount: due.length, doneCount, isToday: isToday(d) });
  }
  const totalDue = days.reduce((s,d) => s + d.dueCount, 0);
  const totalDone = days.reduce((s,d) => s + d.doneCount, 0);
  const percent = totalDue > 0 ? Math.round((totalDone/totalDue)*100) : 0;
  return { days, percent };
}

/** Ranking tiap activity berdasar persentase selesai dalam N hari terakhir. */
function computeActivityRanking(activities, logsMap, today, windowDays){
  const results = activities.map(a => {
    let due = 0, done = 0;
    for (let i = 0; i < windowDays; i++){
      const d = new Date(today); d.setDate(d.getDate() - i);
      if (isActivityDueOnDate(a, d)){
        due++;
        if (logsMap[`${a.id}|${formatDateKey(d)}`] === true) done++;
      }
    }
    return { activity: a, due, done, percent: due > 0 ? Math.round((done/due)*100) : 0 };
  }).filter(r => r.due > 0);

  results.sort((x,y) => y.percent - x.percent);
  return results;
}
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

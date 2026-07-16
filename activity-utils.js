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

/** Progress hari ini saja. */
function computeTodayProgress(activities, logsMap, today){
  const due = activities.filter(a => isActivityDueOnDate(a, today));
  const done = due.filter(a => logsMap[`${a.id}|${formatDateKey(today)}`] === true).length;
  return { due: due.length, done, percent: due.length > 0 ? Math.round((done/due.length)*100) : 0 };
}

/** Progress minggu ini (Senin s.d. hari ini, minggu berjalan/belum selesai). */
function computeThisWeekProgress(activities, logsMap, today){
  const monday = new Date(today); monday.setDate(monday.getDate() - (isoWeekday(today) - 1));
  let due = 0, done = 0;
  for (let d = new Date(monday); d.getTime() <= today.getTime(); d.setDate(d.getDate()+1)){
    const dayDue = activities.filter(a => isActivityDueOnDate(a, d));
    due += dayDue.length;
    done += dayDue.filter(a => logsMap[`${a.id}|${formatDateKey(d)}`] === true).length;
  }
  return { due, done, percent: due > 0 ? Math.round((done/due)*100) : 0 };
}

/** Progress bulan ini (tanggal 1 s.d. hari ini, bulan berjalan/belum selesai). */
function computeThisMonthProgress(activities, logsMap, today){
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  let due = 0, done = 0;
  for (let d = new Date(firstOfMonth); d.getTime() <= today.getTime(); d.setDate(d.getDate()+1)){
    const dayDue = activities.filter(a => isActivityDueOnDate(a, d));
    due += dayDue.length;
    done += dayDue.filter(a => logsMap[`${a.id}|${formatDateKey(d)}`] === true).length;
  }
  return { due, done, percent: due > 0 ? Math.round((done/due)*100) : 0 };
}

/** Ambil top-N dan bottom-N dari ranking tanpa overlap. */
function pickTopBottom(ranking, n){
  if (ranking.length <= n) return { top: ranking, bottom: [] };
  const top = ranking.slice(0, n);
  const remaining = ranking.slice(n);
  const bottom = remaining.slice(-n).reverse(); // paling tidak konsisten ditampilkan duluan
  return { top, bottom };
}

function isToday(date){
  const t = new Date(); t.setHours(0,0,0,0);
  const d = new Date(date); d.setHours(0,0,0,0);
  return t.getTime() === d.getTime();
}

/** Apakah sebuah activity jatuh tempo pada tanggal tertentu. */
function isActivityDueOnDate(activity, date){
  const dateKey = formatDateKey(date);

  // Hormati batas tanggal efektif (mulai berlaku / berhenti berlaku)
  if (activity.effective_from && dateKey < activity.effective_from) return false;
  if (activity.effective_until && dateKey > activity.effective_until) return false;

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
/** Breakdown harian: due/done tiap hari, N hari terakhir termasuk hari ini. */
function computeDailyBreakdown(activities, logsMap, today, days){
  const result = [];
  for (let i = days - 1; i >= 0; i--){
    const d = new Date(today); d.setDate(d.getDate() - i);
    const due = activities.filter(a => isActivityDueOnDate(a, d));
    const doneCount = due.filter(a => logsMap[`${a.id}|${formatDateKey(d)}`] === true).length;
    result.push({
      label: NAMA_HARI[isoWeekday(d)-1].slice(0,2),
      dueCount: due.length, doneCount,
      percent: due.length > 0 ? Math.round((doneCount/due.length)*100) : 0,
      isCurrent: isToday(d)
    });
  }
  return result;
}

/** Breakdown mingguan: due/done per blok 7 hari, N minggu terakhir (minggu ini di paling kanan). */
function computeWeeklyBreakdown(activities, logsMap, today, weeksCount){
  const result = [];
  for (let w = weeksCount - 1; w >= 0; w--){
    const weekEnd = new Date(today); weekEnd.setDate(weekEnd.getDate() - (w*7));
    const weekStart = new Date(weekEnd); weekStart.setDate(weekStart.getDate() - 6);
    let due = 0, done = 0;
    for (let d = new Date(weekStart); d.getTime() <= weekEnd.getTime(); d.setDate(d.getDate()+1)){
      const dayDue = activities.filter(a => isActivityDueOnDate(a, d));
      due += dayDue.length;
      done += dayDue.filter(a => logsMap[`${a.id}|${formatDateKey(d)}`] === true).length;
    }
    result.push({
      label: w === 0 ? 'Ini' : `${weekStart.getDate()}-${weekEnd.getDate()} ${NAMA_BULAN[weekEnd.getMonth()].slice(0,3)}`,
      dueCount: due, doneCount: done,
      percent: due > 0 ? Math.round((done/due)*100) : 0,
      isCurrent: w === 0
    });
  }
  return result;
}

/** Breakdown bulanan: due/done per bulan kalender, N bulan terakhir (bulan ini di paling kanan). */
function computeMonthlyBreakdown(activities, logsMap, today, monthsCount){
  const result = [];
  for (let m = monthsCount - 1; m >= 0; m--){
    const monthDate = new Date(today.getFullYear(), today.getMonth() - m, 1);
    const isCurrentMonth = (m === 0);
    const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth()+1, 0).getDate();
    const lastDay = isCurrentMonth ? today.getDate() : daysInMonth;
    let due = 0, done = 0;
    for (let day = 1; day <= lastDay; day++){
      const d = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
      const dayDue = activities.filter(a => isActivityDueOnDate(a, d));
      due += dayDue.length;
      done += dayDue.filter(a => logsMap[`${a.id}|${formatDateKey(d)}`] === true).length;
    }
    result.push({
      label: NAMA_BULAN[monthDate.getMonth()].slice(0,3),
      dueCount: due, doneCount: done,
      percent: due > 0 ? Math.round((done/due)*100) : 0,
      isCurrent: isCurrentMonth
    });
  }
  return result;
}

/**
 * Breakdown bulanan yang sadar arsip: bulan dalam 6 bulan terakhir dihitung
 * dari data mentah (logsMap), bulan yang lebih lama diambil dari monthly_stats
 * (hasil arsip otomatis), karena detail hariannya sudah dihapus dari server.
 */
function computeMonthlyBreakdownArchiveAware(activities, logsMap, monthlyStatsMap, today, monthsCount){
  const rawCutoff = new Date(today); rawCutoff.setMonth(rawCutoff.getMonth() - 6);
  const result = [];

  for (let m = monthsCount - 1; m >= 0; m--){
    const monthDate = new Date(today.getFullYear(), today.getMonth() - m, 1);
    const yearMonthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth()+1).padStart(2,'0')}`;
    const isCurrentMonth = (m === 0);

    let due = 0, done = 0;

    if (monthDate >= new Date(rawCutoff.getFullYear(), rawCutoff.getMonth(), 1)){
      // Masih dalam window data mentah, hitung langsung dari jadwal activity
      const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth()+1, 0).getDate();
      const lastDay = isCurrentMonth ? today.getDate() : daysInMonth;
      for (let day = 1; day <= lastDay; day++){
        const d = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
        const dayDue = activities.filter(a => isActivityDueOnDate(a, d));
        due += dayDue.length;
        done += dayDue.filter(a => logsMap[`${a.id}|${formatDateKey(d)}`] === true).length;
      }
    } else if (monthlyStatsMap[yearMonthKey]) {
      // Sudah diarsip, pakai rangkuman
      due = monthlyStatsMap[yearMonthKey].total_due;
      done = monthlyStatsMap[yearMonthKey].total_done;
    }

    result.push({
      label: NAMA_BULAN[monthDate.getMonth()].slice(0,3),
      dueCount: due, doneCount: done,
      percent: due > 0 ? Math.round((done/due)*100) : 0,
      isCurrent: isCurrentMonth
    });
  }
  return result;
}

// =========================================================
// Performance & ranking per TIPE activity (Harian/Mingguan/Bulanan)
// Dipakai di Dashboard versi baru -- terpisah dari breakdown rentang waktu.
// =========================================================

/** Kumpulan tanggal buat tipe "harian": 7 hari terakhir, TIDAK termasuk hari ini. */
function getDailyTypeDates(today, daysBack){
  const dates = [];
  for (let i = 1; i <= daysBack; i++){
    const d = new Date(today); d.setDate(d.getDate() - i);
    dates.push(d);
  }
  return dates;
}

/** Kumpulan tanggal buat tipe "mingguan": N minggu PENUH sebelumnya, TIDAK termasuk minggu berjalan. */
function getWeeklyTypeDates(today, weeksBack){
  const currentMonday = new Date(today);
  currentMonday.setDate(currentMonday.getDate() - (isoWeekday(today) - 1));

  const dates = [];
  for (let w = 1; w <= weeksBack; w++){
    const weekStart = new Date(currentMonday); weekStart.setDate(weekStart.getDate() - 7*w);
    for (let i = 0; i < 7; i++){
      const d = new Date(weekStart); d.setDate(d.getDate() + i);
      dates.push(d);
    }
  }
  return dates;
}

/** Kumpulan tanggal buat tipe "bulanan": N bulan kalender PENUH sebelumnya, TIDAK termasuk bulan berjalan. */
function getMonthlyTypeDates(today, monthsBack){
  const dates = [];
  for (let m = 1; m <= monthsBack; m++){
    const monthDate = new Date(today.getFullYear(), today.getMonth() - m, 1);
    const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth()+1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++){
      dates.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), day));
    }
  }
  return dates;
}

/** Performance keseluruhan (persentase) untuk 1 tipe activity, dalam rentang waktunya sendiri. */
function computeTypePerformance(activities, logsMap, type, dateList){
  const typeActivities = activities.filter(a => a.recurrence_type === type);
  let due = 0, done = 0;
  typeActivities.forEach(a => {
    dateList.forEach(d => {
      if (isActivityDueOnDate(a, d)){
        due++;
        if (logsMap[`${a.id}|${formatDateKey(d)}`] === true) done++;
      }
    });
  });
  return { due, done, percent: due > 0 ? Math.round((done/due)*100) : 0 };
}

/** Ranking activity dalam 1 tipe, dalam rentang waktunya sendiri. */
function computeTypeRanking(activities, logsMap, type, dateList){
  const typeActivities = activities.filter(a => a.recurrence_type === type);
  const results = typeActivities.map(a => {
    let due = 0, done = 0;
    dateList.forEach(d => {
      if (isActivityDueOnDate(a, d)){
        due++;
        if (logsMap[`${a.id}|${formatDateKey(d)}`] === true) done++;
      }
    });
    return { activity: a, due, done, percent: due > 0 ? Math.round((done/due)*100) : 0 };
  }).filter(r => r.due > 0);

  results.sort((x,y) => y.percent - x.percent);
  return results;
}

function ringkasJadwal(activity){
  if (activity.recurrence_type === 'daily') return 'Setiap hari';
  if (activity.recurrence_type === 'weekly') {
    const hari = (activity.weekly_days || []).map(n => NAMA_HARI[n-1]);
    return hari.length ? `Setiap ${hari.join(', ')}` : 'Mingguan';
  }
  if (activity.recurrence_type === 'monthly') {
    if (activity.monthly_mode === 'fixed_date') return `Tanggal ${activity.monthly_date} tiap bulan`;
    if (activity.monthly_mode === 'pattern') {
      return `${NAMA_HARI[activity.monthly_pattern_weekday-1]}, minggu ke-${activity.monthly_pattern_occurrence}`;
    }
  }
  return '';
}

const DIAS_MAP = { "Lunes": 1, "Martes": 2, "Miércoles": 3, "Jueves": 4, "Viernes": 5 };

/**
 * Devuelve el próximo entrenamiento a partir de una lista de TrainingSchedule.
 * { schedule, daysUntil, fecha (Date), fechaISO (YYYY-MM-DD) } o null.
 */
export function getNextTraining(schedules = [], now = new Date()) {
  const todayDow = now.getDay();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  let best = null;
  let bestDiff = Infinity;

  for (const s of schedules) {
    const dow = DIAS_MAP[s.dia_semana];
    if (dow === undefined) continue;

    const [h, m] = (s.hora_inicio || "18:00").split(":").map(Number);
    const trainTime = h * 60 + m;

    let diff = dow - todayDow;
    if (diff < 0) diff += 7;
    if (diff === 0 && currentTime >= trainTime) diff = 7;

    if (s.fecha_inicio) {
      const inicio = new Date(`${s.fecha_inicio}T00:00:00`);
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const diasHastaInicio = Math.round((inicio - startOfToday) / 86400000);
      while (diff < diasHastaInicio) diff += 7;
    }

    if (diff < bestDiff) { bestDiff = diff; best = s; }
  }

  if (!best) return null;

  const fecha = new Date(now.getFullYear(), now.getMonth(), now.getDate() + bestDiff);
  const fechaISO = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;

  return { schedule: best, daysUntil: bestDiff, fecha, fechaISO };
}

export function labelEntreno(next) {
  if (!next) return "";
  if (next.daysUntil === 0) return "hoy";
  if (next.daysUntil === 1) return "mañana";
  return `el ${next.schedule.dia_semana.toLowerCase()} ${next.fecha.getDate()}/${next.fecha.getMonth() + 1}`;
}
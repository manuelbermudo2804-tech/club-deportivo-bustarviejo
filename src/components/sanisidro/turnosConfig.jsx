// Configuración de turnos de voluntarios para San Isidro 2026
// Si se cambia un cupo, recordar revisar también la lógica de turno_3 forzado a completo.

export const TURNOS = [
  { id: "turno_1", label: "Turno 1", horario: "11:00 - 13:00", plazas: 6,  forzarCompleto: false, color: "yellow",  emoji: "☀️" },
  { id: "turno_2", label: "Turno 2", horario: "13:00 - 16:00", plazas: 7,  forzarCompleto: false, color: "orange",  emoji: "🌞" },
  { id: "turno_3", label: "Turno 3", horario: "16:00 - 19:00", plazas: 7,  forzarCompleto: true,  color: "purple",  emoji: "🌅" },
  { id: "turno_4", label: "Turno 4", horario: "19:00 - cierre", plazas: 7, forzarCompleto: false, color: "indigo",  emoji: "🌙" },
];

export const getTurno = (id) => TURNOS.find(t => t.id === id) || null;

// Cuenta plazas ocupadas por turno (excluye descartados)
export const countByTurno = (voluntarios) => {
  const map = {};
  TURNOS.forEach(t => { map[t.id] = 0; });
  (voluntarios || []).forEach(v => {
    if (v.estado === "descartado") return;
    if (v.turno && map[v.turno] !== undefined) map[v.turno] += 1;
  });
  return map;
};

// Devuelve si un turno está completo (por cupo o por marca manual)
export const isTurnoCompleto = (turno, ocupadas) => {
  if (!turno) return false;
  if (turno.forzarCompleto) return true;
  return ocupadas >= turno.plazas;
};
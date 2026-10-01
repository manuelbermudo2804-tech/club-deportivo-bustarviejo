import { base44 } from "@/api/base44Client";

const KEY = "attendance_pending_queue";

const read = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
};
const write = (q) => localStorage.setItem(KEY, JSON.stringify(q));
const keyOf = (d) => `${d.categoria}__${d.fecha}`;

export const queueAttendance = (data) => {
  const q = read();
  q[keyOf(data)] = data;
  write(q);
};

export const isPending = (categoria, fecha) => !!read()[`${categoria}__${fecha}`];
export const pendingCount = () => Object.keys(read()).length;

// Idempotente: siempre busca si ya existe antes de crear, así un reintento nunca duplica
export const sendAttendance = async (data) => {
  const found = await base44.entities.Attendance.filter({ categoria: data.categoria, fecha: data.fecha });
  const saved = found[0]
    ? await base44.entities.Attendance.update(found[0].id, data)
    : await base44.entities.Attendance.create(data);
  const q = read();
  delete q[keyOf(data)];
  write(q);
  return saved;
};

export const flushQueue = async () => {
  const items = Object.values(read());
  let sent = 0;
  for (const item of items) {
    try { await sendAttendance(item); sent++; } catch { /* sigue pendiente */ }
  }
  return sent;
};
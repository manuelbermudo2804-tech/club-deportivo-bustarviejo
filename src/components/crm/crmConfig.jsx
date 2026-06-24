// Configuración compartida del CRM de Patrocinadores.
// Las etapas del pipeline comercial, en orden, con sus etiquetas y colores.

export const ETAPAS = [
  { id: "prospecto", label: "Prospecto", color: "slate", emoji: "🔍" },
  { id: "contactado", label: "Contactado", color: "blue", emoji: "📞" },
  { id: "reunion", label: "Reunión", color: "indigo", emoji: "📅" },
  { id: "propuesta", label: "Propuesta enviada", color: "purple", emoji: "📄" },
  { id: "negociacion", label: "Negociación", color: "amber", emoji: "🤝" },
  { id: "ganado", label: "Cerrado ganado", color: "green", emoji: "✅" },
  { id: "perdido", label: "Cerrado perdido", color: "red", emoji: "❌" },
];

export const ETAPA_MAP = ETAPAS.reduce((acc, e) => {
  acc[e.id] = e;
  return acc;
}, {});

// Clases Tailwind por color (literales para que no las purgue el build)
export const COLOR_CLASSES = {
  slate: { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-300", dot: "bg-slate-400", header: "bg-slate-50" },
  blue: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300", dot: "bg-blue-500", header: "bg-blue-50" },
  indigo: { bg: "bg-indigo-100", text: "text-indigo-700", border: "border-indigo-300", dot: "bg-indigo-500", header: "bg-indigo-50" },
  purple: { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-300", dot: "bg-purple-500", header: "bg-purple-50" },
  amber: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300", dot: "bg-amber-500", header: "bg-amber-50" },
  green: { bg: "bg-green-100", text: "text-green-700", border: "border-green-300", dot: "bg-green-500", header: "bg-green-50" },
  red: { bg: "bg-red-100", text: "text-red-700", border: "border-red-300", dot: "bg-red-500", header: "bg-red-50" },
};

export const TIPOS_INTERACCION = [
  { id: "llamada", label: "Llamada", emoji: "📞" },
  { id: "email", label: "Email", emoji: "✉️" },
  { id: "whatsapp", label: "WhatsApp", emoji: "💬" },
  { id: "reunion", label: "Reunión", emoji: "📅" },
  { id: "propuesta", label: "Propuesta", emoji: "📄" },
  { id: "nota", label: "Nota", emoji: "📝" },
];

const daysBetween = (dateStr, ref = new Date()) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return Math.floor((d - ref) / (1000 * 60 * 60 * 24));
};

// Devuelve la alerta más relevante de un patrocinador, o null.
// Tipos: 'renovacion' (contrato termina pronto), 'seguimiento' (próxima acción vencida),
// 'sin_contacto' (mucho tiempo sin actividad en pipeline abierto).
export function getSponsorAlert(sponsor) {
  const etapa = sponsor.etapa_crm || (sponsor.activo ? "ganado" : "prospecto");

  // Renovación: contrato activo que termina en los próximos 60 días
  if (etapa === "ganado" && sponsor.fecha_fin) {
    const dias = daysBetween(sponsor.fecha_fin);
    if (dias !== null && dias >= 0 && dias <= 60) {
      return { tipo: "renovacion", color: "amber", emoji: "🟠", label: `Renovación en ${dias} día${dias === 1 ? "" : "s"}` };
    }
    if (dias !== null && dias < 0) {
      return { tipo: "vencido", color: "red", emoji: "🔴", label: `Contrato vencido hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? "" : "s"}` };
    }
  }

  const etapasAbiertas = ["prospecto", "contactado", "reunion", "propuesta", "negociacion"];
  if (etapasAbiertas.includes(etapa)) {
    // Seguimiento: próxima acción con fecha pasada
    const diasAccion = daysBetween(sponsor.proxima_accion_fecha);
    if (diasAccion !== null && diasAccion <= 0) {
      return { tipo: "seguimiento", color: "red", emoji: "🔴", label: "Seguimiento pendiente" };
    }
    // Sin contacto: más de 15 días desde el último contacto (o desde creación)
    const ref = sponsor.fecha_ultimo_contacto || sponsor.created_date;
    const diasSinContacto = ref ? Math.abs(daysBetween(ref)) : null;
    if (diasSinContacto !== null && diasSinContacto >= 15) {
      return { tipo: "sin_contacto", color: "orange", emoji: "🟠", label: `Sin actividad hace ${diasSinContacto} días` };
    }
  }

  return null;
}

export const fmtEuro = (n) =>
  (n || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
// Permisos individuales del "entrenador en prácticas" (menor de edad).
// Criterio LOPIVI: nunca supervisa solo y no accede a datos personales,
// médicos ni económicos, ni a chats privados con familias.
export const CATEGORIAS_PRACTICAS = [
  "Fútbol Pre-Benjamín (Mixto)",
  "Fútbol Benjamín (Mixto)",
  "Fútbol Alevín (Mixto)",
  "Fútbol Alevín Femenino",
  "Fútbol Infantil (Mixto)",
  "Fútbol Cadete",
  "Fútbol Juvenil",
  "Fútbol Aficionado",
  "Fútbol Femenino",
  "Baloncesto (Mixto)",
];

export const PERMISOS_PRACTICAS = [
  {
    key: "ver_convocatorias",
    titulo: "Convocatorias",
    descripcion: "Ver los partidos convocados: rival, hora, lugar y confirmaciones.",
    emoji: "📋",
  },
  {
    key: "ver_nombres_convocatoria",
    titulo: "Nombres de los convocados",
    descripcion: "Además de los totales, ver la lista de quién viene y quién no.",
    emoji: "👥",
    dependeDe: "ver_convocatorias",
  },
  {
    key: "crear_convocatorias",
    titulo: "Acceso completo a convocatorias",
    descripcion: "Además de verlas, puede crear convocatorias del equipo. Si está apagado, solo lectura.",
    emoji: "✍️",
    dependeDe: "ver_convocatorias",
    avanzado: true,
  },
  {
    key: "asistencia",
    titulo: "Control de asistencia",
    descripcion: "Pasar lista del equipo que entrena: presente, tarde o ausente.",
    emoji: "✅",
    avanzado: true,
  },
  {
    key: "evaluaciones",
    titulo: "Valoraciones del entrenamiento",
    descripcion: "Al pasar lista, puntuar la actitud (1-5) y dejar una nota corta de cada jugador.",
    emoji: "⭐",
    dependeDe: "asistencia",
    avanzado: true,
  },
  {
    key: "chat_staff",
    titulo: "Chat del cuerpo técnico",
    descripcion: "Participar en el chat interno del staff junto a los entrenadores adultos.",
    emoji: "💬",
    avanzado: true,
  },
  {
    key: "ejercicios",
    titulo: "Biblioteca de ejercicios",
    descripcion: "Consultar ejercicios y planificar sesiones.",
    emoji: "📚",
  },
  {
    key: "pizarra",
    titulo: "Pizarra táctica",
    descripcion: "Dibujar jugadas y esquemas.",
    emoji: "🎯",
  },
];

export const AVISO_PRACTICAS =
  "Estás como entrenador en prácticas: siempre con un entrenador adulto presente. No tienes acceso a datos personales, médicos ni económicos de otros jugadores.";
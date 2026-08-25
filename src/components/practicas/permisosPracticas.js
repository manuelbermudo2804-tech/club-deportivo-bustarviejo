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
    key: "ver_horarios",
    titulo: "Horarios y calendario del equipo",
    descripcion: "Ver los entrenamientos y partidos del equipo que entrena.",
    emoji: "🕐",
  },
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
    titulo: "Crear y editar convocatorias",
    descripcion: "Permiso completo: puede convocar y modificar. Si está apagado, solo lectura.",
    emoji: "✏️",
    dependeDe: "ver_convocatorias",
    avanzado: true,
  },
  {
    key: "asistencia",
    titulo: "Control de asistencia",
    descripcion: "Pasar lista en los entrenamientos: presente, tarde o ausente.",
    emoji: "✅",
  },
  {
    key: "evaluaciones",
    titulo: "Evaluaciones deportivas",
    descripcion: "Ver y rellenar evaluaciones técnicas del equipo.",
    emoji: "📝",
    avanzado: true,
  },
  {
    key: "chat_staff",
    titulo: "Chat del cuerpo técnico",
    descripcion: "Participa en el chat de staff del club (nunca en chats con familias).",
    emoji: "💬",
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
  {
    key: "competicion",
    titulo: "Clasificaciones y resultados",
    descripcion: "Información pública de la competición y análisis de rivales.",
    emoji: "🏆",
  },
];

export const AVISO_PRACTICAS =
  "Estás como entrenador en prácticas: siempre con un entrenador adulto presente. No tienes acceso a datos personales, médicos ni económicos de otros jugadores.";
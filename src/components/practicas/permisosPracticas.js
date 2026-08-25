// Permisos individuales del "entrenador en prácticas" (menor de edad).
// Criterio LOPIVI: nunca supervisa solo, ni accede a datos personales,
// médicos, económicos ni a chats con familias u otros menores.
export const PERMISOS_PRACTICAS = [
  {
    key: "ver_horarios",
    titulo: "Horarios y calendario del equipo",
    descripcion: "Ver los entrenamientos y partidos de su equipo.",
    emoji: "🕐",
  },
  {
    key: "ver_convocatorias",
    titulo: "Convocatorias (solo lectura)",
    descripcion: "Ver los partidos convocados: rival, hora, lugar y cuántos han confirmado.",
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
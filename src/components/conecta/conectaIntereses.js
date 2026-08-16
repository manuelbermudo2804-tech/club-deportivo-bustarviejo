// Catálogo de intereses para "Conecta con familias"
export const INTERESES = [
  { id: "running", label: "🏃 Correr / running" },
  { id: "ciclismo", label: "🚴 Ciclismo / MTB" },
  { id: "senderismo", label: "🥾 Senderismo / montaña" },
  { id: "futbol_veteranos", label: "⚽ Fútbol de veteranos" },
  { id: "padel", label: "🎾 Pádel" },
  { id: "baloncesto", label: "🏀 Baloncesto" },
  { id: "gimnasio", label: "🏋️ Gimnasio / fitness" },
  { id: "natacion", label: "🏊 Natación" },
  { id: "yoga", label: "🧘 Yoga / pilates" },
  { id: "ver_partidos", label: "📺 Ver partidos juntos" },
  { id: "planes_familia", label: "👨‍👩‍👧 Planes con los niños" },
];

export const getInteresLabel = (id) => INTERESES.find(i => i.id === id)?.label || id;
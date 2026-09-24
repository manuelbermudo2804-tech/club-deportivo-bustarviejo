// Época especial activa según la fecha. Se puede forzar con ?epoca=navidad (para previsualizar).
export const EPOCAS = {
  navidad: { emojis: "🎄 ❄️ 🎅", texto: "¡Feliz Navidad de parte de toda la familia del club!", clase: "from-red-600 to-green-700" },
  reyes: { emojis: "👑 🐫 🎁", texto: "¡Que los Reyes Magos os traigan muchos goles!", clase: "from-amber-500 to-purple-700" },
  halloween: { emojis: "🎃 👻 🦇", texto: "¡Feliz Halloween! Cuidado con los porteros fantasma...", clase: "from-orange-500 to-purple-900" },
  carnaval: { emojis: "🎭 🎉 🎊", texto: "¡Es Carnaval! ¿De qué te vas a disfrazar?", clase: "from-pink-500 to-yellow-500" },
  fin_temporada: { emojis: "🏅 🏆 👏", texto: "¡Enhorabuena por la temporada, campeones!", clase: "from-amber-400 to-orange-600" },
  verano: { emojis: "☀️ 🏖️ ⚽", texto: "¡Feliz verano! Descansad y volved con muchas ganas", clase: "from-sky-500 to-yellow-400" },
};

export function getEpocaActual(date = new Date()) {
  const forced = new URLSearchParams(window.location.search).get("epoca");
  if (forced && EPOCAS[forced]) return forced;
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if (m === 10 && d >= 20) return "halloween";
  if (m === 12 && d >= 1) return "navidad";
  if (m === 1 && d <= 6) return "reyes";
  if (m === 2) return "carnaval";
  if (m === 6) return "fin_temporada";
  if (m === 7 || m === 8) return "verano";
  return null;
}
// Previsión meteorológica de Bustarviejo (Open-Meteo, sin claves).
const LAT = 40.8556;
const LON = -3.7089;

const URL = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
  `&hourly=temperature_2m,apparent_temperature,precipitation_probability,wind_speed_10m,wind_gusts_10m` +
  `&timezone=Europe%2FMadrid&forecast_days=3`;

let cache = null;
let cacheTime = 0;

export async function fetchPrevision() {
  if (cache && Date.now() - cacheTime < 15 * 60 * 1000) return cache;
  const res = await fetch(URL);
  if (!res.ok) throw new Error('No se pudo obtener la previsión');
  const data = await res.json();
  cache = data.hourly;
  cacheTime = Date.now();
  return cache;
}

/**
 * Devuelve la peor condición dentro de la franja del entrenamiento.
 * fecha: 'YYYY-MM-DD', horaInicio/horaFin: 'HH:MM'
 */
export function meteoEnFranja(hourly, fecha, horaInicio, horaFin) {
  if (!hourly?.time) return null;
  const h1 = parseInt(String(horaInicio).split(':')[0], 10);
  const h2 = parseInt(String(horaFin || horaInicio).split(':')[0], 10);
  const idxs = [];
  hourly.time.forEach((t, i) => {
    if (!t.startsWith(fecha)) return;
    const h = parseInt(t.slice(11, 13), 10);
    if (h >= h1 && h <= Math.max(h1, h2)) idxs.push(i);
  });
  if (!idxs.length) return null;

  const max = (arr) => Math.max(...idxs.map((i) => Number(arr?.[i] ?? 0)));
  const min = (arr) => Math.min(...idxs.map((i) => Number(arr?.[i] ?? 0)));

  return {
    viento: max(hourly.wind_speed_10m),
    rachas: max(hourly.wind_gusts_10m),
    lluvia: max(hourly.precipitation_probability),
    temperatura: min(hourly.temperature_2m),
    sensacion: min(hourly.apparent_temperature),
  };
}
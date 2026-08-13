// Reglas de evaluación meteorológica del Meteo Club.
// El viento es el factor determinante; los grupos pequeños son los sensibles.

export const GRUPOS = {
  pequenos: 'Pequeños',
  medianos: 'Medianos',
  mayores: 'Mayores',
};

// Grupo de edad por categoría
export function getGrupoCategoria(categoria = '') {
  const c = categoria.toLowerCase();
  if (c.includes('pre-benjam') || c.includes('benjam') || c.includes('alev')) return 'pequenos';
  if (c.includes('infantil') || c.includes('cadete')) return 'medianos';
  if (c.includes('juvenil') || c.includes('aficionado')) return 'mayores';
  if (c.includes('femenino')) return 'medianos';
  return 'medianos';
}

// Baloncesto es indoor: fuera del sistema
export function esIndoor(categoria = '') {
  return categoria.toLowerCase().includes('baloncesto');
}

export const DEFAULT_UMBRALES = {
  pequenos: { viento_ambar: 20, viento_rojo: 30, rachas_rojo: 45, temp_minima: 6, lluvia_ambar: 40, lluvia_rojo: 60 },
  medianos: { viento_ambar: 30, viento_rojo: 45, rachas_rojo: 60, temp_minima: 3, lluvia_ambar: 55, lluvia_rojo: 75 },
  mayores: { viento_ambar: 40, viento_rojo: 60, rachas_rojo: 75, temp_minima: 0, lluvia_ambar: 65, lluvia_rojo: 85 },
};

export function getUmbrales(config, grupo) {
  const u = config?.umbrales?.[grupo];
  return { ...DEFAULT_UMBRALES[grupo], ...(u || {}) };
}

/**
 * Evalúa una franja meteorológica para una categoría.
 * meteo: { viento, rachas, lluvia, temperatura }
 * Devuelve { nivel, motivos[], recomendacion, sugerirSemicubierto }
 */
export function evaluarMeteo(meteo, grupo, config) {
  const u = getUmbrales(config, grupo);
  const motivos = [];
  let nivel = 'verde';

  const subir = (n) => {
    if (n === 'rojo') nivel = 'rojo';
    else if (n === 'ambar' && nivel !== 'rojo') nivel = 'ambar';
  };

  const viento = Number(meteo?.viento ?? 0);
  const rachas = Number(meteo?.rachas ?? 0);
  const lluvia = Number(meteo?.lluvia ?? 0);
  const temp = Number(meteo?.temperatura ?? 20);

  if (viento >= u.viento_rojo) {
    motivos.push(`Viento fuerte (${Math.round(viento)} km/h), por encima del límite (${u.viento_rojo} km/h)`);
    subir('rojo');
  } else if (viento >= u.viento_ambar) {
    motivos.push(`Viento notable (${Math.round(viento)} km/h)`);
    subir('ambar');
  }

  if (rachas >= u.rachas_rojo) {
    motivos.push(`Rachas de ${Math.round(rachas)} km/h`);
    subir('rojo');
  }

  if (lluvia >= u.lluvia_rojo) {
    motivos.push(`Probabilidad de lluvia alta (${Math.round(lluvia)}%)`);
    subir('rojo');
  } else if (lluvia >= u.lluvia_ambar) {
    motivos.push(`Posible lluvia (${Math.round(lluvia)}%)`);
    subir('ambar');
  }

  if (temp <= u.temp_minima) {
    motivos.push(`Temperatura baja (${Math.round(temp)}°)`);
    subir('rojo');
  } else if (temp <= u.temp_minima + 3) {
    motivos.push(`Frío (${Math.round(temp)}°)`);
    subir('ambar');
  }

  const sugerirSemicubierto = nivel === 'rojo' && grupo === 'pequenos';

  let recomendacion;
  if (nivel === 'verde') recomendacion = 'Entrenamiento sin problema';
  else if (nivel === 'ambar') recomendacion = 'Valorar cambio';
  else recomendacion = sugerirSemicubierto ? 'Llevar al semicubierto' : 'Condiciones duras: valorar modificar la sesión';

  return { nivel, motivos, recomendacion, sugerirSemicubierto };
}

export const NIVEL_STYLES = {
  verde: { emoji: '🟢', label: 'Sin problema', card: 'bg-green-50 border-green-200', text: 'text-green-800' },
  ambar: { emoji: '🟠', label: 'Valorar cambio', card: 'bg-orange-50 border-orange-200', text: 'text-orange-800' },
  rojo: { emoji: '🔴', label: 'Riesgo alto', card: 'bg-red-50 border-red-200', text: 'text-red-800' },
};

export const DECISION_LABELS = {
  mantener: '✅ Se mantiene',
  semicubierto: '🔄 Trasladado al semicubierto',
  modificar: '⚠️ Sesión modificada',
  aplazar: '⏰ Aplazado',
  cancelar: '❌ Cancelado',
};
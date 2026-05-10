// Calcula los puntos y aciertos de una entrada según el reglamento del Fantasy Mundial CDB.
// Tabla de puntos:
// - Campeón acertado: 25
// - Subcampeón acertado: 15
// - Cada semifinalista acertado: 10 (incluye campeón y subcampeón)
// - Máximo goleador: 15
// - Selección sorpresa: 10
// - Resultado exacto de la final: 30

export function calculateFantasyPoints(entry, config) {
  const desglose = { campeon: 0, subcampeon: 0, semifinalistas: 0, maximo_goleador: 0, seleccion_sorpresa: 0, final_exacta: 0 };
  let aciertos = 0;

  if (config?.campeon_oficial && entry.campeon === config.campeon_oficial) {
    desglose.campeon = 25;
    aciertos++;
  }
  if (config?.subcampeon_oficial && entry.subcampeon === config.subcampeon_oficial) {
    desglose.subcampeon = 15;
    aciertos++;
  }

  const semisOficial = new Set(config?.semifinalistas_oficial || []);
  const semisEntry = new Set(entry.semifinalistas || []);
  let semisAcertadas = 0;
  semisEntry.forEach((s) => { if (semisOficial.has(s)) semisAcertadas++; });
  desglose.semifinalistas = semisAcertadas * 10;
  aciertos += semisAcertadas;

  if (config?.maximo_goleador_oficial && entry.maximo_goleador === config.maximo_goleador_oficial) {
    desglose.maximo_goleador = 15;
    aciertos++;
  }
  if (config?.seleccion_sorpresa_oficial && entry.seleccion_sorpresa === config.seleccion_sorpresa_oficial) {
    desglose.seleccion_sorpresa = 10;
    aciertos++;
  }

  const finalLoc = config?.resultado_final_local_oficial;
  const finalVis = config?.resultado_final_visitante_oficial;
  if (
    finalLoc !== null && finalLoc !== undefined &&
    finalVis !== null && finalVis !== undefined &&
    Number(entry.resultado_final_local) === Number(finalLoc) &&
    Number(entry.resultado_final_visitante) === Number(finalVis)
  ) {
    desglose.final_exacta = 30;
    aciertos++;
  }

  const puntos = Object.values(desglose).reduce((a, b) => a + b, 0);
  return { puntos, aciertos, desglose };
}
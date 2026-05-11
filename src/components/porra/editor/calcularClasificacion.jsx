// Calcula automáticamente la clasificación (1º-4º) de un grupo
// a partir de las predicciones 1/X/2 del usuario
//
// Reglas de desempate (FIFA):
// 1. Puntos
// 2. Diferencia de goles (no la usamos porque el user solo predice 1/X/2 sin marcador → 0)
// 3. Empates/victorias entre ellos (no aplicable sin marcador)
// → Como solo tenemos 1/X/2, ordenamos por: puntos > nº victorias > orden alfabético (fallback estable)
export function calcularClasificacionGrupo(grupo, partidos, equipos, predicciones) {
  const equiposGrupo = equipos.filter(e => e.grupo === grupo);
  if (equiposGrupo.length === 0) return [];

  // Inicializar tabla
  const tabla = {};
  equiposGrupo.forEach(e => {
    tabla[e.codigo] = { codigo: e.codigo, pts: 0, victorias: 0, empates: 0, derrotas: 0 };
  });

  const partidosGrupo = partidos.filter(p => p.fase === 'grupos' && p.grupo === grupo);
  partidosGrupo.forEach(p => {
    const pred = predicciones?.[p.id];
    if (!pred) return;
    const local = tabla[p.equipo_local_codigo];
    const visit = tabla[p.equipo_visitante_codigo];
    if (!local || !visit) return;

    if (pred === '1') {
      local.pts += 3; local.victorias += 1;
      visit.derrotas += 1;
    } else if (pred === '2') {
      visit.pts += 3; visit.victorias += 1;
      local.derrotas += 1;
    } else if (pred === 'X') {
      local.pts += 1; local.empates += 1;
      visit.pts += 1; visit.empates += 1;
    }
  });

  // Ordenar: puntos > victorias > código (estable)
  const ordenados = Object.values(tabla).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.victorias !== a.victorias) return b.victorias - a.victorias;
    return a.codigo.localeCompare(b.codigo);
  });

  return ordenados.map(t => t.codigo);
}

// Comprueba si todos los 6 partidos de un grupo están predichos
export function grupoTotalmentePredicho(grupo, partidos, predicciones) {
  const partidosGrupo = partidos.filter(p => p.fase === 'grupos' && p.grupo === grupo);
  return partidosGrupo.every(p => !!predicciones?.[p.id]);
}
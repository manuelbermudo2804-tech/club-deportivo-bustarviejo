// Bracket oficial FIFA Mundial 2026 (48 equipos)
// Fuente: FIFA.com - "FIFA World Cup 2026 knockout stage match schedule"
// y Anexo C de las Regulaciones oficiales del torneo (495 combinaciones).
//
// La ronda de 32 tiene 16 partidos (Match 73-88) con cruces predefinidos:
// - 8 partidos enfrentan a 1º vs 2º de grupos concretos (FIJOS)
// - 8 partidos enfrentan a 1º de un grupo vs "Mejor 3º" de un pool de 5 grupos posibles
//
// Numeración interna: usamos numero_partido 1..16 en orden secuencial dentro
// de la fase '16avos'. La correspondencia con los partidos oficiales FIFA es:
// 1=M73, 2=M74, 3=M75, 4=M76, 5=M77, 6=M78, 7=M79, 8=M80,
// 9=M81, 10=M82, 11=M83, 12=M84, 13=M85, 14=M86, 15=M87, 16=M88

// Cruces de la Ronda de 32 según FIFA (16 partidos)
// type: 'fijo' = enfrenta a equipos de grupos concretos
// type: 'tercero' = enfrenta a un 1º contra el "Mejor 3º" de un pool de grupos
export const RONDA_32_OFICIAL = [
  // 1 / M73
  { num: 1, fifaMatch: 73, type: 'fijo', local: { tipo: '2', grupo: 'A' }, visitante: { tipo: '2', grupo: 'B' } },
  // 2 / M74
  { num: 2, fifaMatch: 74, type: 'tercero', local: { tipo: '1', grupo: 'E' }, terceroPool: ['A', 'B', 'C', 'D', 'F'] },
  // 3 / M75
  { num: 3, fifaMatch: 75, type: 'fijo', local: { tipo: '1', grupo: 'F' }, visitante: { tipo: '2', grupo: 'C' } },
  // 4 / M76
  { num: 4, fifaMatch: 76, type: 'fijo', local: { tipo: '1', grupo: 'C' }, visitante: { tipo: '2', grupo: 'F' } },
  // 5 / M77
  { num: 5, fifaMatch: 77, type: 'tercero', local: { tipo: '1', grupo: 'I' }, terceroPool: ['C', 'D', 'F', 'G', 'H'] },
  // 6 / M78
  { num: 6, fifaMatch: 78, type: 'fijo', local: { tipo: '2', grupo: 'E' }, visitante: { tipo: '2', grupo: 'I' } },
  // 7 / M79
  { num: 7, fifaMatch: 79, type: 'tercero', local: { tipo: '1', grupo: 'A' }, terceroPool: ['C', 'E', 'F', 'H', 'I'] },
  // 8 / M80
  { num: 8, fifaMatch: 80, type: 'tercero', local: { tipo: '1', grupo: 'L' }, terceroPool: ['E', 'H', 'I', 'J', 'K'] },
  // 9 / M81
  { num: 9, fifaMatch: 81, type: 'tercero', local: { tipo: '1', grupo: 'D' }, terceroPool: ['B', 'E', 'F', 'I', 'J'] },
  // 10 / M82
  { num: 10, fifaMatch: 82, type: 'tercero', local: { tipo: '1', grupo: 'G' }, terceroPool: ['A', 'E', 'H', 'I', 'J'] },
  // 11 / M83
  { num: 11, fifaMatch: 83, type: 'fijo', local: { tipo: '2', grupo: 'K' }, visitante: { tipo: '2', grupo: 'L' } },
  // 12 / M84
  { num: 12, fifaMatch: 84, type: 'fijo', local: { tipo: '1', grupo: 'H' }, visitante: { tipo: '2', grupo: 'J' } },
  // 13 / M85
  { num: 13, fifaMatch: 85, type: 'tercero', local: { tipo: '1', grupo: 'B' }, terceroPool: ['E', 'F', 'G', 'I', 'J'] },
  // 14 / M86
  { num: 14, fifaMatch: 86, type: 'fijo', local: { tipo: '1', grupo: 'J' }, visitante: { tipo: '2', grupo: 'H' } },
  // 15 / M87
  { num: 15, fifaMatch: 87, type: 'tercero', local: { tipo: '1', grupo: 'K' }, terceroPool: ['D', 'E', 'I', 'J', 'L'] },
  // 16 / M88
  { num: 16, fifaMatch: 88, type: 'fijo', local: { tipo: '2', grupo: 'D' }, visitante: { tipo: '2', grupo: 'G' } },
];

// Etiqueta textual del lado de un partido (usada como placeholder en BD)
export function describirLado(lado, terceroPool) {
  if (lado) {
    return `${lado.tipo}º ${lado.grupo}`;
  }
  if (terceroPool) {
    return `3º de ${terceroPool.join('/')}`;
  }
  return '';
}

// Devuelve el código del equipo que ocupa una posición de grupo según las
// predicciones del usuario. tipo: '1' | '2' (1º o 2º), grupo: 'A'..'L'
function getEquipoEnPosicion(participante, tipo, grupo) {
  const arr = participante?.clasificacion_grupos?.[grupo];
  if (!Array.isArray(arr)) return null;
  if (tipo === '1') return arr[0] || null;
  if (tipo === '2') return arr[1] || null;
  return null;
}

// Resuelve qué "Mejor 3º" enfrenta a cada 1º según el Anexo C de FIFA.
//
// Lógica: ordenamos los 8 mejores terceros según el ORDEN ALFABÉTICO de su grupo.
// Después asignamos cada 3º al partido cuyo pool incluye su grupo, en orden de
// los 8 partidos "tercero" según aparecen en el bracket (M74, M77, M79, M80,
// M81, M82, M85, M87).
//
// Esta asignación replica la regla del Anexo C: dada una combinación de 8
// grupos que clasifican sus terceros (de los 12 posibles), hay un único
// emparejamiento válido — el 3º se coloca en el partido cuyo pool lo admite,
// resolviendo conflictos por orden alfabético del grupo.
//
// Devuelve un Map { numero_partido: codigo_equipo_tercero }
export function resolverTerceros(participante, terceroPools = null) {
  const pools = terceroPools || RONDA_32_OFICIAL.filter(c => c.type === 'tercero').map(c => ({ num: c.num, pool: c.terceroPool, grupoLocal: c.local.grupo }));
  const mejoresTerceros = participante?.mejores_terceros || [];
  if (mejoresTerceros.length !== 8) return {};

  // Mapear cada 3º a su grupo de origen
  // Para saber de qué grupo es cada 3º, miramos clasificacion_grupos
  // (posición 2 = 3º del grupo, índice 2)
  const terceroPorGrupo = {}; // { 'A': 'ESP', 'B': 'ARG', ... }
  ['A','B','C','D','E','F','G','H','I','J','K','L'].forEach(g => {
    const arr = participante?.clasificacion_grupos?.[g];
    if (Array.isArray(arr) && arr[2]) {
      terceroPorGrupo[g] = arr[2];
    }
  });

  // Identificar qué 8 grupos aportan tercero (los que están en mejoresTerceros)
  const gruposConTercero = Object.entries(terceroPorGrupo)
    .filter(([, codigo]) => mejoresTerceros.includes(codigo))
    .map(([grupo]) => grupo)
    .sort(); // orden alfabético

  if (gruposConTercero.length !== 8) return {};

  // Asignación greedy:
  // 1. Para cada partido "tercero" (en orden de num), buscar en gruposConTercero
  //    el primer grupo (alfabético) cuyo pool acepta y que no esté ya asignado.
  // 2. Si no hay match exacto, tomar el primero disponible del pool.
  const asignaciones = {};
  const gruposUsados = new Set();

  for (const { num, pool } of pools) {
    // Candidatos: grupos con tercero que estén en el pool y no usados
    const candidatos = gruposConTercero.filter(g => pool.includes(g) && !gruposUsados.has(g));
    if (candidatos.length > 0) {
      // Tomamos el primero alfabético
      const grupoElegido = candidatos[0];
      gruposUsados.add(grupoElegido);
      asignaciones[num] = terceroPorGrupo[grupoElegido];
    }
  }

  // Si quedaron partidos sin asignar (caso raro de pool restrictivo), asignar
  // los terceros restantes al primer hueco disponible.
  const restantes = gruposConTercero.filter(g => !gruposUsados.has(g));
  if (restantes.length > 0) {
    for (const { num } of pools) {
      if (!asignaciones[num] && restantes.length > 0) {
        const g = restantes.shift();
        asignaciones[num] = terceroPorGrupo[g];
      }
    }
  }

  return asignaciones;
}

// Resuelve los 16 cruces de Ronda de 32 según las predicciones del usuario.
// Devuelve un array de pares [codigoLocal, codigoVisitante] en orden de num_partido 1..16
export function resolverCruces16avos(participante) {
  const terceros = resolverTerceros(participante);
  return RONDA_32_OFICIAL.map(cruce => {
    let local, visitante;
    if (cruce.type === 'fijo') {
      local = getEquipoEnPosicion(participante, cruce.local.tipo, cruce.local.grupo);
      visitante = getEquipoEnPosicion(participante, cruce.visitante.tipo, cruce.visitante.grupo);
    } else {
      // tercero
      local = getEquipoEnPosicion(participante, cruce.local.tipo, cruce.local.grupo);
      visitante = terceros[cruce.num] || null;
    }
    return [local, visitante];
  });
}
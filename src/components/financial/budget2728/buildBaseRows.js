// Construye las partidas de referencia para planificar la temporada siguiente.
// Si hay presupuesto base, su estructura manda: lo cobrado/pagado de la temporada
// solo se suma a la partida a la que está asignado ("llevado hasta hoy"), nunca
// como partidas nuevas encima (eso duplicaba ingresos y gastos).

export const normalizeSeason = (value) => String(value || "").replace(/[^\d]/g, "");
export const sameSeason = (a, b) => normalizeSeason(a) === normalizeSeason(b);
export const clean = (value) => String(value || "").trim();
export const canonicalName = (value) => {
  const name = clean(value).toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (["inscripciones jugadores", "inscripcion jugadores", "inscripciones"].includes(name)) return "inscripciones";
  if (["loteria navidad", "loteria"].includes(name)) return "loteria";
  if (["subvenciones ayuntamiento", "subvenciones"].includes(name)) return "subvenciones";
  return name;
};
export const keyFor = (category, name) => clean(category).toLocaleLowerCase("es") + "||" + canonicalName(name);

const TRASPASO = /transferencia.*stripe|stripe.*transferencia|transferencia.*club deportivo bustarviejo|traspaso entre cuentas|transferencia interna/i;

// Entre varios presupuestos de la misma temporada, el más completo (más partidas con importe).
export function pickBudget(budgets, season) {
  const filled = (b) => (b.partidas || []).filter((p) => Number(p.presupuestado) > 0).length;
  return budgets.filter((b) => sameSeason(b.temporada, season)).sort((a, b) => filled(b) - filled(a))[0] || null;
}

const countable = (t) => {
  if (t.estado === "Anulado") return false;
  const income = t.tipo === "Ingreso";
  if (income && t.estado !== "Cobrado") return false;
  if (!income && t.estado !== "Pagado") return false;
  return !(income && TRASPASO.test(String(t.concepto || "")));
};

export function buildBaseRows({ baseBudget, transactions, baseSeason, targetSeason }) {
  const map = new Map();
  const unassigned = { ingresos: 0, gastos: 0, count: 0 };
  const ensure = (category, name, kind) => {
    const safeCategory = clean(category) || (kind === "Ingreso" ? "Ingresos" : "Gastos sin clasificar");
    const safeName = clean(name) || "Partida sin informar";
    const key = keyFor(safeCategory, safeName);
    if (!map.has(key)) map.set(key, { key, categoria: safeCategory, nombre: safeName, historico: 0, presupuestoBase: 0, source: new Set(), kind });
    return map.get(key);
  };

  const lines = (baseBudget?.partidas || []).map((p) => {
    const kind = p.categoria === "Ingresos" ? "Ingreso" : "Gasto";
    const row = ensure(p.categoria, p.nombre, kind);
    row.presupuestoBase += Number(p.presupuestado || 0);
    row.source.add("Presupuesto base");
    return { p, row, kind };
  });

  const seasonTx = (season) => transactions.filter((t) => sameSeason(t.temporada, season) && countable(t));

  if (baseBudget) {
    seasonTx(baseSeason).forEach((t) => {
      const kind = t.tipo === "Ingreso" ? "Ingreso" : "Gasto";
      const target = lines.find((l) => l.kind === kind && t.partida_id && l.p.id === t.partida_id) ||
        lines.find((l) => l.kind === kind && canonicalName(l.p.nombre) === canonicalName(t.partida_nombre)) ||
        lines.find((l) => l.kind === kind && canonicalName(l.p.nombre) === canonicalName(t.categoria));
      const amount = Math.abs(Number(t.cantidad || 0));
      if (target) {
        target.row.historico += amount;
        target.row.source.add("Llevado hasta hoy");
      } else {
        unassigned[kind === "Ingreso" ? "ingresos" : "gastos"] += amount;
        unassigned.count++;
      }
    });
  } else {
    // Sin presupuesto base: se usa lo cobrado/pagado por categoría (o la última temporada con datos).
    let season = baseSeason;
    if (!transactions.some((t) => sameSeason(t.temporada, baseSeason))) {
      const seasons = [...new Set(transactions.map((t) => t.temporada).filter(Boolean))]
        .sort((a, b) => normalizeSeason(b).localeCompare(normalizeSeason(a)));
      season = seasons.find((s) => normalizeSeason(s) < normalizeSeason(targetSeason));
    }
    if (season) seasonTx(season).forEach((t) => {
      const kind = t.tipo === "Ingreso" ? "Ingreso" : "Gasto";
      const row = ensure(kind === "Ingreso" ? "Ingresos" : "Gastos Variables", clean(t.categoria) || clean(t.partida_nombre) || "Categoría sin informar", kind);
      row.historico += Math.abs(Number(t.cantidad || 0));
      row.source.add(sameSeason(season, baseSeason) ? "Cobrado/pagado" : "Histórico " + season);
    });
  }

  const rows = [...map.values()].map((r) => ({ ...r, source: [...r.source] })).sort((a, b) =>
    Number(b.kind === "Ingreso") - Number(a.kind === "Ingreso") || a.categoria.localeCompare(b.categoria, "es") || a.nombre.localeCompare(b.nombre, "es")
  );

  // Aviso: varias partidas de ingresos que parecen la misma cuota de jugadores.
  const feeLines = rows.filter((r) => r.kind === "Ingreso" && r.presupuestoBase > 0 &&
    /inscrip|cuotas? (jugador|equipo)|equipos cuotas/.test(canonicalName(r.nombre)));
  const possibleDuplicates = feeLines.length > 1 ? feeLines.map((r) => r.nombre) : [];

  return { rows, unassigned, possibleDuplicates, hasBaseBudget: Boolean(baseBudget) };
}
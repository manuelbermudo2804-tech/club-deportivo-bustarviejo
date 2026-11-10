// Cruza un ingreso del extracto bancario con una cuota pendiente.
// Reconoce el nombre del jugador o del padre/madre/tutor aunque el banco lo escriba
// en mayúsculas, sin tildes, con los apellidos delante o recortado, y acepta tanto
// el importe total de la cuota como lo que quedaba pendiente tras un pago parcial.

const norm = (v) => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const STOP = new Set(["del", "las", "los", "san", "y"]);
const tokens = (name) => norm(name).split(" ").filter((t) => t.length > 2 && !STOP.has(t));

// El nombre "aparece" si están todas sus palabras, o al menos dos (nombre + un apellido)
function nameInConcept(name, conceptWords) {
  const tk = tokens(name);
  if (tk.length === 0) return false;
  const hits = tk.filter((t) => conceptWords.has(t)).length;
  return hits === tk.length || hits >= 2;
}

const pendingAmount = (p) => {
  const total = Math.abs(Number(p.cantidad) || 0);
  const cobrado = Math.max(0, Number(p.importe_cobrado) || 0);
  return Math.max(0, total - cobrado);
};

export function buildPaymentMatcher(payments, players = []) {
  const tutorsByPlayer = new Map(players.map((pl) => [pl.id, [pl.nombre_tutor_legal, pl.nombre_tutor_2].filter(Boolean)]));
  const eligible = payments.filter((p) =>
    p.is_deleted !== true && !p.reconciliado_banco && !["Pagado", "Anulado"].includes(p.estado)
  );

  return function findPayment(mov, usedIds) {
    if (mov.tipo !== "ingreso") return null;
    const words = new Set(norm(mov.concepto).split(" "));
    const amountOk = (p) =>
      Math.abs(Math.abs(Number(p.cantidad) || 0) - mov.importe) < 0.02 ||
      Math.abs(pendingAmount(p) - mov.importe) < 0.02;
    const candidates = eligible.filter((p) => !usedIds.has(p.id) && amountOk(p));

    const byPlayer = candidates.filter((p) => nameInConcept(p.jugador_nombre, words));
    if (byPlayer.length >= 1) return byPlayer[0];

    // Si solo aparece el nombre del padre/madre, solo se enlaza cuando no hay duda
    // (por ejemplo, dos hermanos con la misma cuota quedan para revisión manual).
    const byTutor = candidates.filter((p) => (tutorsByPlayer.get(p.jugador_id) || []).some((n) => nameInConcept(n, words)));
    return byTutor.length === 1 ? byTutor[0] : null;
  };
}
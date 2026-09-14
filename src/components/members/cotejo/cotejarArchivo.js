// Lógica de cotejo: compara las filas de un archivo con los socios existentes.

const norm = (v) => (v ? String(v).trim().toLowerCase() : "");
const normNombre = (v) =>
  norm(v)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
const normDni = (v) => (v ? String(v).replace(/[^0-9a-zA-Z]/g, "").toUpperCase() : "");
const normSeason = (v) => (v ? String(v).replace(/[^\d]/g, "") : "");

/**
 * @param {Array} filas   filas del archivo: { nombre, email, telefono, dni }
 * @param {Array} members registros ClubMember existentes
 * @param {string} temporadaActiva
 * @returns {{ yaSocios: [], exSocios: [], nuevos: [] }}
 */
export function cotejarArchivo(filas, members, temporadaActiva) {
  const temporadaKey = normSeason(temporadaActiva);
  const yaSocios = [];
  const exSocios = [];
  const nuevos = [];

  filas.forEach((fila, i) => {
    const email = norm(fila.email);
    const dni = normDni(fila.dni);
    const nombre = normNombre(fila.nombre);

    const coincidencias = members.filter((m) => {
      if (email && norm(m.email) === email) return true;
      if (dni && normDni(m.dni) === dni) return true;
      if (nombre && normNombre(m.nombre_completo) === nombre) return true;
      return false;
    });

    const base = {
      key: `${i}-${email || dni || nombre}`,
      nombre: fila.nombre || coincidencias[0]?.nombre_completo || "",
      email: fila.email || coincidencias[0]?.email || "",
      telefono: fila.telefono || coincidencias[0]?.telefono || "",
      dni: fila.dni || coincidencias[0]?.dni || "",
    };

    if (coincidencias.length === 0) {
      nuevos.push(base);
      return;
    }

    const enTemporadaActual = coincidencias.some((m) => normSeason(m.temporada) === temporadaKey);
    if (enTemporadaActual) {
      yaSocios.push(base);
      return;
    }

    const temporadas = coincidencias.map((m) => m.temporada).filter(Boolean).sort();
    exSocios.push({ ...base, ultima_temporada: temporadas[temporadas.length - 1] || "" });
  });

  return { yaSocios, exSocios, nuevos };
}
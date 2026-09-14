// Lógica de cotejo: compara las filas de un archivo con los socios existentes.

const norm = (v) => (v ? String(v).trim().toLowerCase() : "");
const sinAcentos = (v) =>
  norm(v)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
// Nombre en "tokens ordenados": así "Pérez Gómez, Juan" == "Juan Perez Gomez"
const nombreKey = (v) => sinAcentos(v).split(" ").filter(Boolean).sort().join(" ");
const normDni = (v) => (v ? String(v).replace(/[^0-9a-zA-Z]/g, "").toUpperCase() : "");
// Teléfono: últimos 9 dígitos (ignora prefijos +34, espacios, etc.)
const normTel = (v) => {
  const d = v ? String(v).replace(/\D/g, "") : "";
  return d.length >= 9 ? d.slice(-9) : "";
};
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

  // Índices precalculados de la base de socios
  const socios = members.map((m) => ({
    raw: m,
    email: norm(m.email),
    dni: normDni(m.dni),
    nombre: nombreKey(m.nombre_completo),
    tel: normTel(m.telefono),
  }));

  filas.forEach((fila, i) => {
    const email = norm(fila.email);
    const dni = normDni(fila.dni);
    const nombre = nombreKey(fila.nombre);
    const tel = normTel(fila.telefono);

    const coincidencias = socios
      .filter((s) => {
        if (email && s.email === email) return true;
        if (dni && s.dni === dni) return true;
        if (tel && s.tel === tel) return true;
        if (nombre && s.nombre === nombre) return true;
        return false;
      })
      .map((s) => s.raw);

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
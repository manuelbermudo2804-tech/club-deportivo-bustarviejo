// Documentos exigidos por el convenio con el Ayuntamiento de Bustarviejo.
// auto = la app genera ese documento en la pestaña indicada.
export const DOCUMENTOS_BASE = [
  { clave: "hacienda", carpeta: "01 · Administrativa", titulo: "Certificado de estar al corriente con Hacienda", caduca: true },
  { clave: "seguridad_social", carpeta: "01 · Administrativa", titulo: "Certificado de estar al corriente con la Seguridad Social", caduca: true },
  { clave: "art13", carpeta: "01 · Administrativa", titulo: "Declaración responsable (art. 13 Ley General de Subvenciones)" },
  { clave: "titularidad", carpeta: "01 · Administrativa", titulo: "Certificado actualizado de titularidad bancaria" },
  { clave: "domicilio", carpeta: "01 · Administrativa", titulo: "Documento del domicilio social en Bustarviejo", opcional: true },
  { clave: "memoria_actuacion", carpeta: "02 · Memorias", titulo: "Memoria de actuación", ayuda: "Puedes redactarla desde Memoria del Club con los datos de la temporada." },
  { clave: "proyecto_deportivo", carpeta: "02 · Memorias", titulo: "Proyecto / memoria deportiva (Junta, objetivos, equipos)" },
  { clave: "presupuesto", carpeta: "02 · Memorias", titulo: "Presupuesto de ingresos y gastos de la temporada", opcional: true },
  { clave: "relacion_gastos", carpeta: "03 · Gastos", titulo: "Relación numerada de gastos con facturas y justificantes de pago", auto: "gastos" },
  { clave: "cuadro_global", carpeta: "04 · Ingresos", titulo: "Cuadro global de ingresos y gastos", auto: "cuadro" },
  { clave: "otras_subvenciones", carpeta: "04 · Ingresos", titulo: "Relación de otras subvenciones (o declaración de no haberlas recibido)", auto: "cuadro" },
  { clave: "competiciones", carpeta: "05 · Deportiva", titulo: "Certificado de participación en competiciones (Federación)" },
  { clave: "listado_inscritos", carpeta: "05 · Deportiva", titulo: "Listado de personas inscritas en el club", auto: "deportistas" },
];

export const TAB_LABEL = { gastos: "Gastos", cuadro: "Ingresos y gastos", deportistas: "Deportistas" };

export const normSeason = (t) => (t || "").replace("/", "-").trim();

export const currentSeason = () => {
  const now = new Date();
  const y = now.getFullYear();
  const inicio = now.getMonth() + 1 >= 9 ? y : y - 1;
  return `${inicio}-${inicio + 1}`;
};

export const seasonRange = (temporada) => {
  const [a, b] = normSeason(temporada).split("-");
  return { desde: `${a}-09-01`, hasta: `${b}-08-31`, inicio: a, fin: b };
};

// Un movimiento pertenece a la temporada si lo dice su campo, o (si no lo tiene) por su fecha.
export const inSeason = (temporadaItem, fecha, temporada) => {
  if (temporadaItem) return normSeason(temporadaItem) === normSeason(temporada);
  if (!fecha) return false;
  const { desde, hasta } = seasonRange(temporada);
  const f = String(fecha).slice(0, 10);
  return f >= desde && f <= hasta;
};

export const eur = (n) => (Number(n) || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" });

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("es-ES") : "");

export const esEstaSubvencion = (t, entidad) => {
  const prov = (t.proveedor_cliente || "").toLowerCase();
  return prov.includes("ayuntamiento") || (entidad && prov.includes(entidad.toLowerCase()));
};
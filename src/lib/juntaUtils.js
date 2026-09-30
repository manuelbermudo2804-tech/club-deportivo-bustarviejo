export const RESPUESTAS = {
  voy: { label: "Voy", emoji: "✅", cls: "bg-green-100 text-green-800" },
  no_voy: { label: "No puedo", emoji: "❌", cls: "bg-red-100 text-red-800" },
  delego: { label: "Delego voto", emoji: "✍️", cls: "bg-blue-100 text-blue-800" },
};

export function faltaTexto(fecha) {
  const ms = new Date(fecha) - new Date();
  if (ms <= 0) return "¡Es hoy / en curso!";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (d > 0) return `Faltan ${d} d ${h} h`;
  return `Faltan ${h} h ${m} min`;
}

export function fechaLarga(fecha) {
  return new Date(fecha).toLocaleString("es-ES", {
    weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
  });
}

const norm = (s) => (s || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

// Busca en los datos libres del formulario web el valor cuya clave contenga alguna palabra
const pick = (datos, words) => {
  const k = Object.keys(datos || {}).find((key) => words.some((w) => norm(key).includes(w)));
  return k ? datos[k] : undefined;
};

function webRespuesta(datos) {
  const txt = norm(Object.values(datos || {}).filter((v) => typeof v === "string").join(" "));
  if (txt.includes("deleg")) return "delego";
  if (/no (voy|puedo|asist)/.test(txt)) return "no_voy";
  return "voy";
}

export function socioEstado(email, nombre, socios) {
  const e = norm(email), n = norm(nombre);
  const s = socios.find((m) => (e && norm(m.email) === e) || (n && norm(m.nombre_completo) === n));
  if (!s) return "no";
  return s.estado_pago === "Pagado" ? "si" : "pendiente";
}

export function unirRespuestas(appRows, webRows, socios) {
  const rows = appRows.map((r) => ({
    id: r.id, origen: "App", nombre: r.nombre, email: r.email, telefono: "",
    respuesta: r.respuesta, personas: r.personas || 1, pregunta: r.pregunta || "", fecha: r.updated_date,
  }));
  const emails = new Set(rows.map((r) => norm(r.email)));
  webRows.forEach((w) => {
    const d = w.datos || {};
    const email = w.email || pick(d, ["email", "correo"]);
    if (email && emails.has(norm(email))) return;
    rows.push({
      id: w.id, origen: "Web", nombre: w.nombre || pick(d, ["nombre"]) || "—", email: email || "",
      telefono: w.telefono || pick(d, ["telefono", "movil"]) || "", respuesta: webRespuesta(d),
      personas: Number(pick(d, ["person", "acompa", "cuant"])) || 1,
      pregunta: pick(d, ["pregunt", "tema", "coment", "duda"]) || "", fecha: w.created_date,
    });
  });
  return rows.map((r) => ({ ...r, socio: socioEstado(r.email, r.nombre, socios) }));
}
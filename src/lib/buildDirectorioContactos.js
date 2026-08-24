import { base44 } from "@/api/base44Client";

const norm = (s) => (s || "").trim().toLowerCase();
const normTel = (t) => (t || "").replace(/[\s.\-()]/g, "");

/**
 * Reúne en una sola lista a todas las personas registradas en la app,
 * fusionando por email (o teléfono si no hay email) y marcando de qué
 * partes del club viene cada una y si tiene consentimiento comercial.
 */
export async function buildDirectorioContactos() {
  const [jugadores, socios, porristas, inscripciones, consentimientos] = await Promise.all([
    base44.entities.Player.list("-created_date", 2000),
    base44.entities.ClubMember.list("-created_date", 2000),
    base44.entities.PorraParticipante.list("-created_date", 2000),
    base44.entities.LandingSubmission.list("-created_date", 2000),
    base44.entities.ConsentimientoComercial.list("-fecha", 2000),
  ]);

  const mapa = new Map();

  const add = ({ nombre, email, telefono, origen, detalle, fecha }) => {
    const key = norm(email) || normTel(telefono);
    if (!key) return;
    const actual = mapa.get(key) || {
      key,
      nombre: "",
      email: norm(email),
      telefono: normTel(telefono),
      origenes: new Set(),
      detalles: new Set(),
      fecha: null,
    };
    if (nombre && (!actual.nombre || actual.nombre.length < nombre.length)) actual.nombre = nombre.trim();
    if (!actual.email && email) actual.email = norm(email);
    if (!actual.telefono && telefono) actual.telefono = normTel(telefono);
    actual.origenes.add(origen);
    if (detalle) actual.detalles.add(detalle);
    if (fecha && (!actual.fecha || new Date(fecha) > new Date(actual.fecha))) actual.fecha = fecha;
    mapa.set(key, actual);
  };

  jugadores.forEach((p) => {
    const cat = p.categoria_principal || p.deporte;
    add({
      nombre: p.nombre_tutor_legal || p.nombre,
      email: p.email_padre,
      telefono: p.telefono,
      origen: "Familia",
      detalle: p.nombre,
      fecha: p.created_date,
    });
    if (p.email_tutor_2 || p.telefono_tutor_2) {
      add({
        nombre: p.nombre_tutor_2,
        email: p.email_tutor_2,
        telefono: p.telefono_tutor_2,
        origen: "Familia",
        detalle: p.nombre,
        fecha: p.created_date,
      });
    }
    if (p.email_jugador) {
      add({
        nombre: p.nombre,
        email: p.email_jugador,
        telefono: p.telefono,
        origen: "Jugador/a",
        detalle: cat,
        fecha: p.created_date,
      });
    }
  });

  socios.forEach((s) =>
    add({
      nombre: s.nombre_completo,
      email: s.email,
      telefono: s.telefono,
      origen: "Socio/a",
      detalle: s.numero_socio,
      fecha: s.created_date,
    })
  );

  porristas.forEach((p) =>
    add({
      nombre: p.nombre,
      email: p.email,
      telefono: p.telefono,
      origen: "Porra",
      detalle: p.alias_equipo,
      fecha: p.created_date,
    })
  );

  inscripciones.forEach((l) =>
    add({
      nombre: l.nombre,
      email: l.email,
      telefono: l.telefono,
      origen: "Inscripción web",
      detalle: l.landing_slug,
      fecha: l.created_date,
    })
  );

  consentimientos.forEach((c) =>
    add({
      nombre: c.nombre,
      email: c.email,
      telefono: c.telefono,
      origen: "Formulario",
      detalle: c.origen,
      fecha: c.fecha || c.created_date,
    })
  );

  // Estado de consentimiento por email
  const consentPorEmail = new Map();
  consentimientos.forEach((c) => {
    const k = norm(c.email);
    if (!k) return;
    const previo = consentPorEmail.get(k);
    if (!previo || new Date(c.fecha || 0) > new Date(previo.fecha || 0)) consentPorEmail.set(k, c);
  });

  return Array.from(mapa.values())
    .map((c) => {
      const cons = consentPorEmail.get(c.email);
      return {
        ...c,
        origenes: Array.from(c.origenes),
        detalles: Array.from(c.detalles).filter(Boolean),
        consentimiento: !cons || cons.revocado
          ? "sin_consentimiento"
          : cons.acepta_promociones
          ? "club"
          : "patrocinadores",
        acepta_promociones: !!cons && !cons.revocado && !!cons.acepta_promociones,
        acepta_patrocinadores: !!cons && !cons.revocado && !!cons.acepta_patrocinadores,
      };
    })
    .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es"));
}
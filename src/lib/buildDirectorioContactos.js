import { base44 } from "@/api/base44Client";

const norm = (s) => (s || "").trim().toLowerCase();
const normTel = (t) => (t || "").replace(/[\s.\-()]/g, "");

const LIMITE = 2000;

const lista = (entidad, orden = "-created_date") =>
  base44.entities[entidad].list(orden, LIMITE).catch(() => []);

/**
 * Reúne en una sola lista a todas las personas registradas en la app,
 * fusionando por email (o teléfono si no hay email) y marcando de qué
 * partes del club viene cada una y si tiene consentimiento comercial.
 */
export async function buildDirectorioContactos() {
  // Se piden en tandas para no saturar el límite de peticiones
  const [jugadores, socios, porristas, inscripciones, consentimientos] = await Promise.all([
    lista("Player"),
    lista("ClubMember"),
    lista("PorraParticipante"),
    lista("LandingSubmission"),
    lista("ConsentimientoComercial", "-fecha"),
  ]);

  const [sanIsidro, sanIsidroVol, preInscripciones, contactos, accesos] = await Promise.all([
    lista("SanIsidroRegistration"),
    lista("SanIsidroVoluntario"),
    lista("PreInscripcion"),
    lista("ContactForm"),
    lista("AccessRequest"),
  ]);

  const [patroInteres, patroTorneo, patroTorneoInteres, propuestas, colaboraciones, femenino, voluntarios] =
    await Promise.all([
      lista("SponsorInterest"),
      lista("TorneoPatrocinioSolicitud"),
      lista("TournamentSponsorInterest"),
      lista("PropuestaPatrocinio"),
      lista("CollaborationPayment"),
      lista("FemeninoInterest"),
      lista("VolunteerProfile"),
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

  preInscripciones.forEach((p) =>
    add({
      nombre: p.nombre,
      email: p.email,
      telefono: p.telefono,
      origen: "Pre-inscripción web",
      detalle: p.nombre_equipo,
      fecha: p.created_date,
    })
  );

  sanIsidro.forEach((r) =>
    add({
      nombre: r.nombre_responsable,
      email: r.email_responsable,
      telefono: r.telefono_responsable,
      origen: "San Isidro",
      detalle: r.nombre_equipo || r.jugador_nombre,
      fecha: r.created_date,
    })
  );

  sanIsidroVol.forEach((v) =>
    add({
      nombre: v.nombre,
      telefono: v.telefono,
      origen: "San Isidro (voluntario)",
      fecha: v.created_date,
    })
  );

  contactos.forEach((c) =>
    add({
      nombre: c.nombre,
      email: c.email,
      telefono: c.telefono,
      origen: "Contacto web",
      fecha: c.fecha_contacto || c.created_date,
    })
  );

  accesos.forEach((a) =>
    add({
      nombre: a.nombre_progenitor,
      email: a.email,
      telefono: a.telefono,
      origen: "Solicitud de acceso",
      detalle: a.nombre_jugador,
      fecha: a.created_date,
    })
  );

  femenino.forEach((f) =>
    add({
      nombre: f.nombre_padre || f.nombre_jugadora,
      email: f.email,
      telefono: f.telefono,
      origen: "Interés femenino",
      detalle: f.nombre_jugadora,
      fecha: f.created_date,
    })
  );

  voluntarios.forEach((v) =>
    add({
      nombre: v.nombre,
      email: v.email,
      telefono: v.telefono,
      origen: "Voluntariado",
      fecha: v.created_date,
    })
  );

  patroInteres.forEach((s) =>
    add({
      nombre: s.nombre_contacto,
      email: s.email,
      telefono: s.telefono,
      origen: "Patrocinio",
      detalle: s.nombre_comercio,
      fecha: s.created_date,
    })
  );

  [...patroTorneo, ...patroTorneoInteres].forEach((s) =>
    add({
      nombre: s.nombre_contacto,
      email: s.email,
      telefono: s.telefono,
      origen: "Patrocinio torneo",
      detalle: s.nombre_empresa,
      fecha: s.created_date,
    })
  );

  propuestas.forEach((p) =>
    add({
      nombre: p.contacto_nombre,
      email: p.contacto_email,
      telefono: p.contacto_telefono,
      origen: "Propuesta patrocinio",
      fecha: p.created_date,
    })
  );

  colaboraciones.forEach((c) =>
    add({
      nombre: c.contacto_nombre,
      email: c.email,
      telefono: c.telefono,
      origen: "Colaboración",
      detalle: c.nombre_comercio,
      fecha: c.created_date,
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
        acepta_promociones: !!cons && !cons.revocado && !!cons.acepta_promociones,
        acepta_patrocinadores: !!cons && !cons.revocado && !!cons.acepta_patrocinadores,
      };
    })
    .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es"));
}
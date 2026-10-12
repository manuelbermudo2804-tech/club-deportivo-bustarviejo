import { base44 } from "@/api/base44Client";

export const PAQUETES = "Oro 2000€/año (logo en banner principal de la app, menciones en anuncios, galería y newsletters), Plata 1000€/año (banner + anuncios importantes), Bronce 500€/año (banner rotativo), o colaboración personalizada (equipación de un equipo, torneo, eventos)";

export async function buscarEmpresas({ zona, sector, cantidad, excluir = [] }) {
  const res = await base44.integrations.Core.InvokeLLM({
    model: "gemini_3_flash",
    add_context_from_internet: true,
    prompt: `Eres un buscador de patrocinadores para el Club Deportivo Bustarviejo (club de fútbol de Bustarviejo, Sierra Norte de Madrid).
Usa Google Maps y búsquedas web para hacer un listado EXHAUSTIVO de negocios REALES y en activo cuya dirección esté DENTRO del municipio de "${zona}" (no pueblos vecinos salvo que la zona indicada incluya varios). ${sector ? `Solo del sector "${sector}".` : "De todos los sectores: bares, restaurantes, tiendas, alimentación, panaderías, talleres, construcción, reformas, fontaneros, electricistas, inmobiliarias, alojamientos, clínicas, fisioterapia, peluquerías, gimnasios, asesorías, etc."}
Devuelve hasta ${cantidad} empresas distintas.
NO incluyas ninguna de estas, porque ya las tenemos: ${excluir.length ? excluir.join("; ") : "(ninguna)"}. Tampoco incluyas organismos públicos ni el propio club. Para cada una da datos de contacto públicos reales (no inventes: si no encuentras email o teléfono, déjalo vacío).
Explica en una frase por qué encajaría como patrocinador y qué tipo de patrocinio le propondrías.`,
    response_json_schema: {
      type: "object",
      properties: {
        empresas: {
          type: "array",
          items: {
            type: "object",
            properties: {
              nombre: { type: "string" }, sector: { type: "string" }, localidad: { type: "string" },
              direccion: { type: "string" }, telefono: { type: "string" }, email: { type: "string" },
              web: { type: "string" }, por_que: { type: "string" },
              paquete_sugerido: { type: "string", enum: ["Oro", "Plata", "Bronce", "Personalizado"] },
            },
          },
        },
      },
    },
  });
  return res.empresas || [];
}

export async function generarPropuesta(sponsor, { tono, enfoque }) {
  return base44.integrations.Core.InvokeLLM({
    prompt: `Redacta una propuesta de patrocinio en español del Club Deportivo Bustarviejo para la empresa "${sponsor.nombre}"${sponsor.sector ? ` (sector: ${sponsor.sector})` : ""}${sponsor.direccion ? `, ubicada en ${sponsor.direccion}` : ""}.
Datos del club: club de fútbol de Bustarviejo (Sierra Norte de Madrid), equipos desde prebenjamín hasta aficionado y femenino, unas 200 familias que usan a diario la app del club, presencia en redes sociales y torneo propio Sierra Norte Madrid Cup. Web: www.cdbustarviejo.com.
Paquetes: ${PAQUETES}.
${sponsor.interes ? `Idea de colaboración: ${sponsor.interes}.` : ""}
${enfoque ? `Enfoque pedido: ${enfoque}.` : ""}
Tono: ${tono}. Personaliza los beneficios para su tipo de negocio. Cierra proponiendo una reunión o llamada breve. Firma como "Junta Directiva - CD Bustarviejo".
Devuelve un asunto de email, el email completo (sin markdown, párrafos separados por línea en blanco) y una versión corta para WhatsApp (máximo 6 líneas).`,
    response_json_schema: {
      type: "object",
      properties: { asunto: { type: "string" }, email: { type: "string" }, whatsapp: { type: "string" } },
    },
  });
}

export async function guardarProspecto(e) {
  return base44.entities.Sponsor.create({
    nombre: e.nombre,
    sector: e.sector || "",
    direccion: [e.direccion, e.localidad].filter(Boolean).join(", "),
    contacto_telefono: e.telefono || "",
    contacto_email: e.email || "",
    website_url: e.web || "",
    interes: e.por_que || "",
    paquete: e.paquete_sugerido || "Bronce",
    etapa_crm: "prospecto",
    activo: false,
    notas: "Encontrada con el buscador de empresas",
  });
}

export async function marcarEnviada(sponsor, canal, autor) {
  const hoy = new Date();
  const seguimiento = new Date(hoy.getTime() + 7 * 864e5).toISOString().slice(0, 10);
  return base44.entities.Sponsor.update(sponsor.id, {
    etapa_crm: "propuesta",
    fecha_ultimo_contacto: hoy.toISOString().slice(0, 10),
    proxima_accion_fecha: seguimiento,
    proxima_accion_texto: "Hacer seguimiento de la propuesta enviada",
    historial_crm: [...(sponsor.historial_crm || []), { fecha: hoy.toISOString(), tipo: "propuesta", descripcion: `Propuesta enviada por ${canal}`, autor }],
  });
}
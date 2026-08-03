import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';
import { generateObject } from "npm:ai@7.0.16";
import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible@3.0.5";
import { z } from "npm:zod@4.4.3";

// Extrae partidos de una imagen (foto del calendario) o texto pegado usando IA.
// Empareja nombres de equipos y campos contra los datos reales del torneo y
// devuelve una lista de partidos LISTOS para crear (con ids ya resueltos).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Solo administradores' }, { status: 403 });
    }

    const { torneo_id, categoria_id, image_url, texto } = await req.json();
    if (!torneo_id || !categoria_id) {
      return Response.json({ error: 'Falta torneo_id o categoria_id' }, { status: 400 });
    }
    if (!image_url && !texto) {
      return Response.json({ error: 'Sube una imagen o pega el texto de los partidos' }, { status: 400 });
    }

    const equipos = await base44.asServiceRole.entities.TorneoEquipo.filter({ categoria_id });
    if (equipos.length < 2) {
      return Response.json({ error: 'La categoría necesita al menos 2 equipos' }, { status: 400 });
    }
    const torneo = await base44.asServiceRole.entities.Torneo.get(torneo_id);

    // Lista de campos disponibles (sede · campo)
    const camposDisponibles = [];
    (torneo?.sedes || []).forEach((s) => {
      const campos = s.campos && s.campos.length > 0 ? s.campos : [""];
      campos.forEach((c) => camposDisponibles.push({ sede_nombre: s.nombre, campo: c, etiqueta: c ? `${s.nombre} · ${c}` : s.nombre }));
    });

    const { baseURL, token } = base44.asServiceRole.aiGateway.connection();
    const models = createOpenAICompatible({ name: "base44", baseURL, apiKey: token, supportsStructuredOutputs: true });

    const listaEquipos = equipos.map((e) => e.nombre).join("\n- ");
    const listaCampos = camposDisponibles.length > 0 ? camposDisponibles.map((c) => c.etiqueta).join("\n- ") : "(ninguno configurado)";

    const instruccion = `Eres un asistente que lee un calendario de partidos de un torneo de fútbol y extrae cada partido.

EQUIPOS DISPONIBLES (usa EXACTAMENTE estos nombres, empareja aunque estén abreviados o con errores):
- ${listaEquipos}

CAMPOS/SEDES DISPONIBLES (usa EXACTAMENTE estas etiquetas si reconoces el campo):
- ${listaCampos}

Para cada partido devuelve:
- equipo_local: nombre EXACTO de la lista de equipos (el más parecido)
- equipo_visitante: nombre EXACTO de la lista de equipos
- fecha_hora: en formato ISO "YYYY-MM-DDTHH:mm" si aparece hora/fecha, o null si no aparece. Si solo hay hora sin fecha, usa la fecha ${new Date().toISOString().slice(0,10)}.
- campo_etiqueta: la etiqueta EXACTA de la lista de campos que corresponda, o null si no se reconoce.

Ignora líneas que no sean partidos. Si un nombre de equipo no coincide con ninguno de la lista, omite ese partido.`;

    const schema = z.object({
      partidos: z.array(z.object({
        equipo_local: z.string(),
        equipo_visitante: z.string(),
        fecha_hora: z.string().nullable(),
        campo_etiqueta: z.string().nullable(),
      })),
    });

    const content = [{ type: "text", text: instruccion }];
    if (image_url) content.push({ type: "image", image: image_url });
    if (texto) content.push({ type: "text", text: `TEXTO DE LOS PARTIDOS:\n${texto}` });

    const { object } = await generateObject({
      model: models("automatic"),
      schema,
      messages: [{ role: "user", content }],
    });

    // Resolver nombres → ids
    const norm = (s) => (s || "").toLowerCase().trim();
    const findEq = (nombre) => equipos.find((e) => norm(e.nombre) === norm(nombre));
    const findCampo = (etq) => camposDisponibles.find((c) => norm(c.etiqueta) === norm(etq));

    const resueltos = [];
    const descartados = [];
    for (const p of (object.partidos || [])) {
      const local = findEq(p.equipo_local);
      const visit = findEq(p.equipo_visitante);
      if (!local || !visit || local.id === visit.id) {
        descartados.push(`${p.equipo_local} vs ${p.equipo_visitante}`);
        continue;
      }
      const campo = p.campo_etiqueta ? findCampo(p.campo_etiqueta) : null;
      resueltos.push({
        equipo_local_id: local.id,
        equipo_visitante_id: visit.id,
        equipo_local_nombre: local.nombre,
        equipo_visitante_nombre: visit.nombre,
        fecha_hora: p.fecha_hora || "",
        sede_nombre: campo?.sede_nombre || "",
        campo: campo?.campo || "",
        campo_label: campo?.etiqueta || "",
      });
    }

    return Response.json({ partidos: resueltos, descartados });
  } catch (e) {
    return Response.json({ error: e.message || 'Error al leer los partidos' }, { status: 500 });
  }
});
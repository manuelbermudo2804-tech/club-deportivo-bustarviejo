import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Endpoint público: actualiza las predicciones de un participante usando su token mágico.
// No requiere autenticación — el token es el mecanismo de acceso.
// Body: { token: string, updates: {...} }
// Solo se permiten actualizar campos relacionados con predicciones.

const ALLOWED_FIELDS = new Set([
  'predicciones_grupos',
  'clasificacion_grupos',
  'desempates_resueltos',
  'mejores_terceros',
  'predicciones_eliminatorias',
  'prediccion_tercer_puesto',
  'predicciones_especiales',
  'completado_grupos',
  'completado_terceros',
  'completado_bracket',
  'completado_especiales',
  'porcentaje_completado',
]);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { token, updates } = body;

    if (!token || typeof token !== 'string') {
      return Response.json({ error: 'Token no válido' }, { status: 400 });
    }
    if (!updates || typeof updates !== 'object') {
      return Response.json({ error: 'Sin cambios' }, { status: 400 });
    }

    const parts = await base44.asServiceRole.entities.PorraParticipante.filter({ token_acceso: token });
    const participante = parts[0];
    if (!participante) {
      return Response.json({ error: 'Porra no encontrada' }, { status: 404 });
    }
    if (participante.bloqueada) {
      return Response.json({ error: 'Porra bloqueada' }, { status: 403 });
    }

    // Filtrar solo campos permitidos
    const safeUpdates = {};
    for (const [k, v] of Object.entries(updates)) {
      if (ALLOWED_FIELDS.has(k)) safeUpdates[k] = v;
    }

    if (Object.keys(safeUpdates).length === 0) {
      return Response.json({ error: 'Sin cambios válidos' }, { status: 400 });
    }

    await base44.asServiceRole.entities.PorraParticipante.update(participante.id, safeUpdates);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
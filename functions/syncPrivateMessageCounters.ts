import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const event = payload?.event;
    let data = payload?.data;

    if (!event || event.entity_name !== 'PrivateMessage' || event.type !== 'create') {
      return Response.json({ ok: true, skipped: true });
    }

    // Cargar mensaje si no vino en payload
    if (!data || payload?.payload_too_large) {
      const msgs = await base44.asServiceRole.entities.PrivateMessage.filter({ id: event.entity_id });
      data = msgs?.[0];
    }

    if (!data) {
      return Response.json({ ok: false, error: 'Mensaje no encontrado' }, { status: 404 });
    }

    const convId = data.conversacion_id;
    if (!convId) {
      return Response.json({ ok: false, error: 'Mensaje sin conversacion_id' }, { status: 400 });
    }

    const convList = await base44.asServiceRole.entities.PrivateConversation.filter({ id: convId });
    const conv = convList?.[0];
    if (!conv) {
      return Response.json({ ok: false, error: 'Conversación no encontrada' }, { status: 404 });
    }

    const updates = {
      // Actualizar resumen para ordenación/lista
      ultimo_mensaje: (data.mensaje || '').slice(0, 200),
      ultimo_mensaje_fecha: new Date().toISOString(),
    };

    // Incrementar contadores de no leídos
    if (data.remitente_tipo === 'staff') {
      updates.no_leidos_familia = (conv.no_leidos_familia || 0) + 1;
    } else if (data.remitente_tipo === 'familia') {
      updates.no_leidos_staff = (conv.no_leidos_staff || 0) + 1;
    }

    await base44.asServiceRole.entities.PrivateConversation.update(conv.id, updates);

    return Response.json({ ok: true, updated: updates });
  } catch (error) {
    console.error('[syncPrivateMessageCounters] Error:', error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});
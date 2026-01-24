import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * AUTOMACIÓN: Incrementa contadores no_leidos cuando se crean CoordinatorMessages
 * Se llama AUTOMÁTICAMENTE cuando se crea un nuevo CoordinatorMessage
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event } = payload;

    // Solo procesar creaciones de CoordinatorMessage
    if (event?.entity_name !== 'CoordinatorMessage' || event?.type !== 'create') {
      return Response.json({ status: 'skipped', reason: 'not a create event' });
    }

    const message = event.data;
    if (!message?.conversacion_id) {
      return Response.json({ status: 'error', reason: 'missing conversacion_id' });
    }

    // Obtener la conversación
    const conversations = await base44.asServiceRole.entities.CoordinatorConversation.filter({
      id: message.conversacion_id
    });

    if (conversations.length === 0) {
      return Response.json({ status: 'error', reason: 'conversation not found' });
    }

    const conversation = conversations[0];
    let updates = {};

    // Si el mensaje es DE un padre → incrementar no_leidos_coordinador
    if (message.autor === 'padre') {
      const currentCount = conversation.no_leidos_coordinador || 0;
      updates.no_leidos_coordinador = currentCount + 1;
      console.log(`📧 Padre → Coordinador: no_leidos_coordinador ${currentCount} → ${currentCount + 1}`);
    }

    // Si el mensaje es DEL coordinador → incrementar no_leidos_familia
    if (message.autor === 'coordinador') {
      const currentCount = conversation.no_leidos_familia || 0;
      updates.no_leidos_familia = currentCount + 1;
      console.log(`📧 Coordinador → Familia: no_leidos_familia ${currentCount} → ${currentCount + 1}`);
    }

    // Actualizar si hay cambios
    if (Object.keys(updates).length > 0) {
      await base44.asServiceRole.entities.CoordinatorConversation.update(
        conversation.id,
        updates
      );
      return Response.json({ status: 'ok', updated: updates });
    }

    return Response.json({ status: 'ok', reason: 'no updates needed' });
  } catch (error) {
    console.error('Error en syncCoordinatorMessageCounters:', error);
    return Response.json({ status: 'error', message: error.message }, { status: 500 });
  }
});
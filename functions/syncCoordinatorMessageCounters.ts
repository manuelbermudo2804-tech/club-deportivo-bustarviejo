import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * AUTOMACIÓN: Incrementa contadores no_leidos cuando se crean CoordinatorMessages
 * Se llama AUTOMÁTICAMENTE cuando se crea un nuevo CoordinatorMessage
 */
Deno.serve(async (req) => {
  try {
    const payload = await req.json();

    const { event } = payload;

    // Solo procesar creaciones de CoordinatorMessage
    if (event?.entity_name !== 'CoordinatorMessage' || event?.type !== 'create') {
      return Response.json({ status: 'skipped', reason: 'not a create event' });
    }

    const message = event.data;
    if (!message?.conversacion_id) {
      console.error('❌ Missing conversacion_id in message:', message);
      return Response.json({ status: 'error', reason: 'missing conversacion_id' });
    }

    // NO usar createClientFromRequest - usar SDK directo
    // La automación debe ejecutarse como sistema sin auth
    const { Base44Client } = await import('npm:@base44/sdk@0.8.6');
    const base44 = new Base44Client({
      appId: Deno.env.get('BASE44_APP_ID'),
      accessToken: 'system' // Token de sistema para automaciones
    });

    // Obtener la conversación usando service role
    const conversations = await base44.asServiceRole.entities.CoordinatorConversation.filter({
      id: message.conversacion_id
    });

    if (conversations.length === 0) {
      console.error('❌ Conversation not found:', message.conversacion_id);
      return Response.json({ status: 'error', reason: 'conversation not found' });
    }

    const conversation = conversations[0];
    let updates = {};

    // Si el mensaje es DE un padre → incrementar no_leidos_coordinador
    if (message.autor === 'padre') {
      const currentCount = conversation.no_leidos_coordinador || 0;
      updates.no_leidos_coordinador = currentCount + 1;
      console.log(`✅ [Automación] Padre escribió: no_leidos_coordinador ${currentCount} → ${currentCount + 1}`);
    }

    // Si el mensaje es DEL coordinador → incrementar no_leidos_familia
    if (message.autor === 'coordinador') {
      const currentCount = conversation.no_leidos_familia || 0;
      updates.no_leidos_familia = currentCount + 1;
      console.log(`✅ [Automación] Coordinador escribió: no_leidos_familia ${currentCount} → ${currentCount + 1}`);
    }

    // Actualizar si hay cambios
    if (Object.keys(updates).length > 0) {
      try {
        await base44.asServiceRole.entities.CoordinatorConversation.update(
          conversation.id,
          updates
        );
        console.log(`✅ Conversación actualizada:`, updates);
        return Response.json({ status: 'ok', updated: updates });
      } catch (updateError) {
        console.error('❌ Error al actualizar conversación:', updateError);
        throw updateError;
      }
    }

    return Response.json({ status: 'ok', reason: 'no updates needed' });
  } catch (error) {
    console.error('❌ Error en syncCoordinatorMessageCounters:', error);
    return Response.json({ 
      status: 'error', 
      message: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});
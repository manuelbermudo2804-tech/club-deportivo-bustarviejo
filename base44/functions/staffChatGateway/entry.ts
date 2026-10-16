import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || '');
    const email = (user.email || '').toLowerCase();

    const isRegularStaff = user.role === 'admin' || user.es_entrenador === true ||
      user.es_coordinador === true || user.es_tesorero === true;
    let practiceAllowed = false;
    if (!isRegularStaff) {
      const linked = await base44.asServiceRole.entities.Player.filter({
        acceso_menor_email: user.email, activo: true
      }).catch(() => []);
      practiceAllowed = linked.some(p =>
        p.acceso_menor_revocado !== true &&
        p.entrenador_practicas?.activo === true &&
        p.entrenador_practicas?.chat_staff === true
      );
    }
    if (!isRegularStaff && !practiceAllowed) {
      return Response.json({ error: 'Sin permiso para el chat del cuerpo técnico' }, { status: 403 });
    }

    const getGeneralConversation = async () => {
      const convs = await base44.asServiceRole.entities.StaffConversation.filter({ categoria: 'General' });
      if (convs.length) return convs[0];
      if (user.role !== 'admin' && !user.es_entrenador && !user.es_coordinador) {
        return null;
      }
      return await base44.asServiceRole.entities.StaffConversation.create({
        nombre: 'Chat Interno Staff', categoria: 'General', participantes: [], activa: true
      });
    };

    if (action === 'get_conversation') {
      const conversation = await getGeneralConversation();
      if (!conversation) return Response.json({ error: 'No existe la conversación general' }, { status: 404 });
      return Response.json({ conversation });
    }

    if (action === 'list_messages') {
      const conversation = await getGeneralConversation();
      if (!conversation) return Response.json({ error: 'No existe la conversación general' }, { status: 404 });
      const messages = await base44.asServiceRole.entities.StaffMessage.filter(
        { conversacion_id: conversation.id }, 'created_date', 1000
      );
      return Response.json({ conversation, messages });
    }

    if (action === 'create_message') {
      const conversation = await getGeneralConversation();
      if (!conversation || body.conversacion_id !== conversation.id) {
        return Response.json({ error: 'Conversación no válida' }, { status: 403 });
      }
      const data = body.message || {};
      const message = await base44.asServiceRole.entities.StaffMessage.create({
        conversacion_id: conversation.id,
        autor_email: user.email,
        autor_nombre: user.role === 'admin' ? 'Administrador' : (user.full_name || 'Staff'),
        autor_rol: user.role === 'admin' ? 'admin' : (user.es_coordinador ? 'coordinador' : 'entrenador'),
        mensaje: String(data.mensaje || ''),
        audio_url: data.audio_url,
        audio_duracion: data.audio_duracion,
        adjuntos: data.adjuntos || [],
        encuesta: data.encuesta,
        ubicacion: data.ubicacion,
        respuesta_a: data.respuesta_a,
        mensaje_citado: data.mensaje_citado,
        leido_por: [{ email: user.email, nombre: user.full_name, fecha: new Date().toISOString() }]
      });
      await base44.asServiceRole.entities.StaffConversation.update(conversation.id, {
        ultimo_mensaje: message.mensaje || 'Archivo/acción en el chat',
        ultimo_mensaje_fecha: new Date().toISOString(),
        ultimo_mensaje_autor: user.full_name || 'Staff'
      }).catch(() => {});
      return Response.json({ message });
    }

    if (action === 'update_message') {
      const { id, patch } = body;
      if (!id || !patch || typeof patch !== 'object' || Array.isArray(patch)) {
        return Response.json({ error: 'Datos de actualización no válidos' }, { status: 400 });
      }
      const message = (await base44.asServiceRole.entities.StaffMessage.filter({ id }))[0];
      if (!message) return Response.json({ error: 'Mensaje no encontrado' }, { status: 404 });
      const conversation = await getGeneralConversation();
      if (!conversation || message.conversacion_id !== conversation.id) {
        return Response.json({ error: 'Mensaje fuera de la conversación general' }, { status: 403 });
      }
      const allowedFields = ['mensaje','editado','fecha_edicion','eliminado','reacciones','encuesta','anclado','anclado_por','anclado_fecha','leido_por'];
      const clean = {};
      for (const key of allowedFields) if (Object.hasOwn(patch, key)) clean[key] = patch[key];
      if (!Object.keys(clean).length) return Response.json({ error: 'No hay campos permitidos' }, { status: 400 });
      if (practiceAllowed && !isRegularStaff) {
        const isOwn = (message.autor_email || '').toLowerCase() === email;
        const onlyOwnMessageActions = Object.keys(clean).every(k =>
          ['reacciones','encuesta','leido_por'].includes(k) || (isOwn && ['mensaje','editado','fecha_edicion','eliminado'].includes(k))
        );
        if (!onlyOwnMessageActions) return Response.json({ error: 'No tienes permiso para esta acción' }, { status: 403 });
        if (clean.encuesta && !message.encuesta) return Response.json({ error: 'Encuesta no válida' }, { status: 400 });
        if (clean.eliminado === true && !isOwn) return Response.json({ error: 'Solo puedes borrar tus mensajes' }, { status: 403 });
      }
      const updated = await base44.asServiceRole.entities.StaffMessage.update(id, clean);
      return Response.json({ message: updated || { ...message, ...clean } });
    }

    if (action === 'update_conversation') {
      const conversation = await getGeneralConversation();
      if (!conversation || body.id !== conversation.id) return Response.json({ error: 'Conversación no válida' }, { status: 403 });
      const patch = body.patch || {};
      const clean = {};
      if (typeof patch.ultimo_mensaje === 'string') clean.ultimo_mensaje = patch.ultimo_mensaje;
      if (typeof patch.ultimo_mensaje_fecha === 'string') clean.ultimo_mensaje_fecha = patch.ultimo_mensaje_fecha;
      if (typeof patch.ultimo_mensaje_autor === 'string') clean.ultimo_mensaje_autor = patch.ultimo_mensaje_autor;
      const updated = await base44.asServiceRole.entities.StaffConversation.update(conversation.id, clean);
      return Response.json({ conversation: updated || { ...conversation, ...clean } });
    }

    return Response.json({ error: 'Acción no soportada' }, { status: 400 });
  } catch (error) {
    console.error('staffChatGateway error:', error?.message || error);
    return Response.json({ error: 'No se pudo procesar la operación del chat' }, { status: 500 });
  }
});
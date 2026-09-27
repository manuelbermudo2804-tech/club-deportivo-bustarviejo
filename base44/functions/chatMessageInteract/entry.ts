import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

// Interacciones sobre mensajes de chat de grupo que NO son del propio usuario:
// marcar como leído, reaccionar y votar encuestas.
// Solo se permite si el usuario puede LEER el mensaje (misma regla que el chat).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, messageIds, messageId, emoji, optionIndex } = await req.json();
    const now = new Date().toISOString();

    // Carga el mensaje con permisos del usuario: si no puede leerlo, no puede tocarlo.
    const loadAllowed = async (id) => {
      try {
        const rows = await base44.entities.ChatMessage.filter({ id });
        return rows[0] || null;
      } catch {
        return null;
      }
    };

    if (action === 'mark_read') {
      const ids = (Array.isArray(messageIds) ? messageIds : []).slice(0, 50);
      let updated = 0;
      for (const id of ids) {
        const msg = await loadAllowed(id);
        if (!msg) continue;
        const leido = msg.leido_por || [];
        if (leido.some((l) => l.email === user.email)) continue;
        await base44.asServiceRole.entities.ChatMessage.update(id, {
          leido_por: [...leido, { email: user.email, nombre: user.full_name, fecha: now }],
        });
        updated++;
      }
      return Response.json({ ok: true, updated });
    }

    if (action === 'delete') {
      const own = (await base44.asServiceRole.entities.ChatMessage.filter({ id: messageId }))[0];
      if (!own) return Response.json({ error: 'Mensaje no encontrado' }, { status: 404 });
      if ((own.remitente_email || '').toLowerCase() !== (user.email || '').toLowerCase()) return Response.json({ error: 'Solo puedes borrar tus mensajes' }, { status: 403 });
      await base44.asServiceRole.entities.ChatMessage.update(messageId, { eliminado: true, mensaje: 'Este mensaje fue eliminado' });
      return Response.json({ ok: true });
    }

    const msg = await loadAllowed(messageId);
    if (!msg) return Response.json({ error: 'Mensaje no encontrado' }, { status: 404 });

    if (action === 'delete_legacy') {
      // Solo el autor puede borrar su propio mensaje
      if (msg.remitente_email !== user.email) return Response.json({ error: 'Solo puedes borrar tus mensajes' }, { status: 403 });
      await base44.asServiceRole.entities.ChatMessage.update(messageId, { eliminado: true, mensaje: 'Este mensaje fue eliminado' });
      return Response.json({ ok: true });
    }

    if (action === 'react') {
      if (!emoji) return Response.json({ error: 'Falta emoji' }, { status: 400 });
      const reacciones = msg.reacciones || [];
      const ya = reacciones.some((r) => r.user_email === user.email && r.emoji === emoji);
      const nuevas = ya
        ? reacciones.filter((r) => !(r.user_email === user.email && r.emoji === emoji))
        : [...reacciones, { user_email: user.email, user_nombre: user.full_name, emoji, fecha: now }];
      await base44.asServiceRole.entities.ChatMessage.update(messageId, { reacciones: nuevas });
      return Response.json({ ok: true, reacciones: nuevas });
    }

    if (action === 'vote') {
      const campo = msg.encuesta ? 'encuesta' : (msg.poll ? 'poll' : null);
      if (!campo) return Response.json({ error: 'El mensaje no tiene encuesta' }, { status: 400 });
      const poll = msg[campo];
      if (poll.cerrada) return Response.json({ error: 'La encuesta está cerrada' }, { status: 400 });
      // Un voto por persona: sustituye el anterior si ya había votado
      const votos = (poll.votos || []).filter((v) => v.usuario_email !== user.email);
      votos.push({ usuario_email: user.email, usuario_nombre: user.full_name, opcion_index: Number(optionIndex), fecha: now });
      await base44.asServiceRole.entities.ChatMessage.update(messageId, { [campo]: { ...poll, votos } });
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Acción no soportada' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
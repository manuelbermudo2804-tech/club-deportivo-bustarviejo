import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Devuelve TODAS las conversaciones del coordinador (para que admin pueda
// supervisar / intervenir, p. ej. durante una baja). Solo accesible para admin.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const conversations = await base44.asServiceRole.entities.CoordinatorConversation.list('-ultimo_mensaje_fecha', 500);
    return Response.json({ conversations });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
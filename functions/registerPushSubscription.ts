import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscription, userAgent } = await req.json();

    // Verificar si ya existe esta suscripción
    const existing = await base44.entities.PushSubscription.filter({
      user_email: user.email,
      endpoint: subscription.endpoint
    });

    if (existing.length > 0) {
      // Actualizar
      await base44.entities.PushSubscription.update(existing[0].id, {
        keys: subscription.keys,
        user_agent: userAgent,
        activa: true
      });
      return Response.json({ success: true, message: 'Suscripción actualizada' });
    } else {
      // Crear nueva
      await base44.entities.PushSubscription.create({
        user_email: user.email,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        user_agent: userAgent,
        activa: true
      });
      return Response.json({ success: true, message: 'Suscripción registrada' });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
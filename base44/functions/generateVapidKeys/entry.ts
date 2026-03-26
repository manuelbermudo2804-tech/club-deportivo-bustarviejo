import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import webpush from 'npm:web-push@3.6.7';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Solo administradores' }, { status: 403 });
    }

    // Generar par de claves VAPID
    const vapidKeys = webpush.generateVAPIDKeys();

    return Response.json({
      message: '✅ Claves VAPID generadas correctamente',
      instructions: 'Copia estas claves y configúralas como secretos en Base44 Dashboard > Settings > Environment Variables',
      keys: {
        VAPID_PUBLIC_KEY: vapidKeys.publicKey,
        VAPID_PRIVATE_KEY: vapidKeys.privateKey
      },
      pasos: [
        '1. Ve a Dashboard > Settings > Environment Variables',
        '2. Crea VAPID_PUBLIC_KEY y pega la clave pública',
        '3. Crea VAPID_PRIVATE_KEY y pega la clave privada',
        '4. ¡Listo! Después podemos activar el sistema de push + badge'
      ]
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
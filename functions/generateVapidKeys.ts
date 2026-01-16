// FUNCIÓN TEMPORAL - Ejecutar UNA VEZ para generar claves VAPID
// Luego borrar este archivo
import webPush from 'npm:web-push@3.6.7';

Deno.serve(async (req) => {
  try {
    const vapidKeys = webPush.generateVAPIDKeys();
    
    return Response.json({
      success: true,
      keys: vapidKeys,
      instructions: "Copia estas claves a Settings → Environment variables:\n\n" +
                   "VAPID_PUBLIC_KEY = " + vapidKeys.publicKey + "\n\n" +
                   "VAPID_PRIVATE_KEY = " + vapidKeys.privateKey + "\n\n" +
                   "Luego BORRA este archivo (generateVapidKeys.js)"
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
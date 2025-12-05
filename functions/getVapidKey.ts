// Devuelve la VAPID public key para el frontend

Deno.serve(async (req) => {
  try {
    const vapidKey = Deno.env.get("VAPID_PUBLIC_KEY");
    
    if (!vapidKey) {
      return Response.json({ error: 'VAPID key not configured' }, { status: 500 });
    }

    return Response.json({ vapidKey });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
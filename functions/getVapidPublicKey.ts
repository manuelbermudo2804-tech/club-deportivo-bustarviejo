Deno.serve(async (req) => {
  try {
    const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    
    if (!publicKey) {
      return Response.json({ 
        error: 'VAPID_PUBLIC_KEY no configurada. Ve a Settings → Environment Variables y añádela.' 
      }, { status: 500 });
    }

    return Response.json({ publicKey });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
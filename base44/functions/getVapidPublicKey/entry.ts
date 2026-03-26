// Devuelve la clave pública VAPID al frontend (NO es un secreto, es pública por diseño)
Deno.serve(async (_req) => {
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  
  if (!publicKey) {
    return Response.json({ error: 'VAPID_PUBLIC_KEY no configurada' }, { status: 500 });
  }

  return Response.json({ publicKey });
});
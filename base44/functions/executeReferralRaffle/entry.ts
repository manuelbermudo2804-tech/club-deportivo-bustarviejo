import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
  return Response.json({ error: 'El sorteo electrónico está retirado. Utiliza registerPhysicalReferralRaffle para registrar el resultado de la urna.' }, { status: 410 });
});

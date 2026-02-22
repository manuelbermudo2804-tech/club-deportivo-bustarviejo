import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all pending access codes
    const pendingCodes = await base44.asServiceRole.entities.AccessCode.filter({ estado: 'pendiente' });
    
    const now = new Date();
    let expiredCount = 0;

    for (const code of pendingCodes) {
      if (code.fecha_expiracion && new Date(code.fecha_expiracion) < now) {
        await base44.asServiceRole.entities.AccessCode.update(code.id, { estado: 'expirado' });
        expiredCount++;
      }
    }

    console.log(`Expired ${expiredCount} access codes out of ${pendingCodes.length} pending`);
    return Response.json({ success: true, expired: expiredCount, checked: pendingCodes.length });
  } catch (error) {
    console.error('Error expiring codes:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const allInterests = await base44.asServiceRole.entities.SponsorInterest.filter({});
    
    const counts = {};
    for (const interest of allInterests) {
      counts[interest.posicion] = (counts[interest.posicion] || 0) + 1;
    }

    return Response.json({ counts });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
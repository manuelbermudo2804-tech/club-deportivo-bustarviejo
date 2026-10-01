import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Público: devuelve los nombres de las categorías activas (configuradas en Categorías)
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const all = await base44.asServiceRole.entities.CategoryConfig.filter({ activa: true });
  const names = [...new Set(all.map((c) => c.nombre).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  return Response.json({ categorias: names });
});
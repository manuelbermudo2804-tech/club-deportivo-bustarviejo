import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Datos públicos de la campaña de lotería: configuración + comercios activos.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const campanas = await base44.asServiceRole.entities.LoteriaCampana.list();
    const campana = campanas && campanas.length > 0 ? campanas[0] : null;

    if (!campana || campana.activa === false) {
      return Response.json({ campana: null, comercios: [] }, { status: 200 });
    }

    const comercios = await base44.asServiceRole.entities.LoteriaComercio.filter({ activo: true });
    comercios.sort((a, b) => (a.orden || 0) - (b.orden || 0));

    return Response.json({ campana, comercios }, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
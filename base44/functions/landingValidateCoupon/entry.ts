import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Valida un código de cupón para una landing. PÚBLICO.
// Devuelve: { valido, tipo, valor, mensaje, importe_final }
Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  try {
    const base44 = createClientFromRequest(req);
    const { landing_page_id, codigo, importe_base } = await req.json().catch(() => ({}));
    if (!landing_page_id || !codigo) return Response.json({ valido: false, mensaje: 'Faltan datos' });

    const page = await base44.asServiceRole.entities.LandingPage.get(landing_page_id);
    const cupones = page?.config?.cupones || [];
    const cup = cupones.find((c) => c.codigo && c.codigo.toLowerCase() === String(codigo).toLowerCase());

    if (!cup) return Response.json({ valido: false, mensaje: 'Código no válido' });
    if (cup.activo === false) return Response.json({ valido: false, mensaje: 'Código desactivado' });
    if (cup.fecha_expiracion && new Date(cup.fecha_expiracion) < new Date()) {
      return Response.json({ valido: false, mensaje: 'Código expirado' });
    }
    if (cup.max_usos && (cup.usos || 0) >= cup.max_usos) {
      return Response.json({ valido: false, mensaje: 'Cupón agotado' });
    }

    const base = Number(importe_base) || 0;
    let descuento = 0;
    if (cup.tipo === 'porcentaje') descuento = Math.min(base, base * (Number(cup.valor) / 100));
    else descuento = Math.min(base, Number(cup.valor) || 0);

    const final = Math.max(0, Number((base - descuento).toFixed(2)));
    return Response.json({
      valido: true,
      tipo: cup.tipo,
      valor: cup.valor,
      descuento_importe: Number(descuento.toFixed(2)),
      importe_final: final,
      mensaje: `Descuento aplicado: -${descuento.toFixed(2)}€`,
    });
  } catch (error) {
    return Response.json({ valido: false, mensaje: 'Error', error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Agrega TODOS los datos del club para una temporada (o año natural) concreta.
// Devuelve un objeto con secciones listas para renderizar la memoria.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    // modo: 'temporada' | 'natural'
    const modo = body.modo || 'temporada';
    const temporada = body.temporada || null; // ej "2025-2026"
    const anio = body.anio || null;            // ej 2025

    const sr = base44.asServiceRole;

    // Calcular rango de fechas [desde, hasta] según el modo
    let desde, hasta, etiquetaPeriodo;
    if (modo === 'natural' && anio) {
      desde = new Date(`${anio}-01-01T00:00:00.000Z`);
      hasta = new Date(`${anio}-12-31T23:59:59.999Z`);
      etiquetaPeriodo = `Año ${anio}`;
    } else if (temporada && /^\d{4}-\d{4}$/.test(temporada)) {
      const [y1, y2] = temporada.split('-');
      desde = new Date(`${y1}-09-01T00:00:00.000Z`);
      hasta = new Date(`${y2}-08-31T23:59:59.999Z`);
      etiquetaPeriodo = `Temporada ${temporada}`;
    } else {
      // Fallback: temporada activa por meses
      const now = new Date();
      const m = now.getMonth() + 1;
      const y = now.getFullYear();
      const inicio = m >= 9 ? y : y - 1;
      desde = new Date(`${inicio}-09-01T00:00:00.000Z`);
      hasta = new Date(`${inicio + 1}-08-31T23:59:59.999Z`);
      etiquetaPeriodo = `Temporada ${inicio}-${inicio + 1}`;
    }

    const enRango = (fecha) => {
      if (!fecha) return false;
      const d = new Date(fecha);
      return d >= desde && d <= hasta;
    };

    // ===== JUGADORES =====
    const jugadores = await sr.entities.Player.filter({ activo: true }, '-created_date', 2000);
    const totalJugadores = jugadores.length;
    const porCategoria = {};
    let jugadorasFemenino = 0;
    jugadores.forEach(p => {
      const cat = p.categoria_principal || p.deporte || 'Sin categoría';
      porCategoria[cat] = (porCategoria[cat] || 0) + 1;
      const cats = (p.categorias || []).join(' ') + ' ' + (cat || '');
      if (/femenino/i.test(cats)) jugadorasFemenino++;
    });
    const categoriasArray = Object.entries(porCategoria)
      .map(([nombre, count]) => ({ nombre, count }))
      .sort((a, b) => b.count - a.count);
    const totalEquipos = categoriasArray.length;

    // ===== SOCIOS =====
    let totalSocios = 0;
    let sociosPagados = 0;
    try {
      const socios = await sr.entities.ClubMember.list('-created_date', 3000);
      totalSocios = socios.length;
      sociosPagados = socios.filter(s => s.estado_pago === 'Pagado' || s.estado_pago === 'pagado').length;
    } catch { /* sin socios */ }

    // ===== INGRESOS =====
    let ingresosTotales = 0;
    let ingresosCuotas = 0;
    let numPagos = 0;
    try {
      const pagos = await sr.entities.Payment.filter({ estado: 'Pagado', is_deleted: { $ne: true } }, '-fecha_pago', 5000);
      pagos.forEach(p => {
        const fechaRef = p.fecha_pago || p.created_date;
        if (enRango(fechaRef)) {
          ingresosTotales += (p.cantidad || 0);
          ingresosCuotas += (p.cantidad || 0);
          numPagos++;
        }
      });
    } catch { /* sin pagos */ }

    // Patrocinios (importe anual de sponsors activos)
    let ingresosPatrocinio = 0;
    let patrocinadores = [];
    try {
      const sponsors = await sr.entities.Sponsor.filter({ activo: true }, '-created_date', 500);
      patrocinadores = sponsors.map(s => ({
        nombre: s.nombre,
        logo_url: s.logo_url || null,
        nivel: s.nivel_patrocinio || s.paquete || null,
        importe: s.precio_anual || 0,
      }));
      ingresosPatrocinio = sponsors.reduce((sum, s) => sum + (s.precio_anual || 0), 0);
    } catch { /* sin sponsors */ }
    ingresosTotales += ingresosPatrocinio;

    // ===== EVENTOS =====
    let eventos = [];
    try {
      const evs = await sr.entities.Event.filter({ publicado: true }, '-fecha', 1000);
      eventos = evs
        .filter(e => enRango(e.fecha))
        .map(e => ({ titulo: e.titulo, tipo: e.tipo, fecha: e.fecha, ubicacion: e.ubicacion || null, importante: !!e.importante }));
    } catch { /* sin eventos */ }
    const totalEventos = eventos.length;

    // ===== FOTOS =====
    let totalAlbumes = 0;
    let totalFotos = 0;
    let fotosDestacadas = [];
    try {
      const galerias = await sr.entities.PhotoGallery.list('-fecha_evento', 1000);
      const enPeriodo = galerias.filter(g => enRango(g.fecha_evento));
      totalAlbumes = enPeriodo.length;
      enPeriodo.forEach(g => {
        const fotos = g.fotos || [];
        totalFotos += fotos.length;
        if (g.destacado && fotos[0]?.url && fotosDestacadas.length < 6) {
          fotosDestacadas.push(fotos[0].url);
        }
      });
      // Si no hay suficientes destacadas, rellenar con primeras fotos
      if (fotosDestacadas.length < 6) {
        for (const g of enPeriodo) {
          for (const f of (g.fotos || [])) {
            if (f.url && !fotosDestacadas.includes(f.url)) {
              fotosDestacadas.push(f.url);
              if (fotosDestacadas.length >= 6) break;
            }
          }
          if (fotosDestacadas.length >= 6) break;
        }
      }
    } catch { /* sin galería */ }

    // ===== LOGROS (eventos importantes tipo torneo/fin temporada) =====
    const logros = eventos
      .filter(e => e.importante || ['Torneo', 'Fin Temporada', 'Fiesta Club'].includes(e.tipo))
      .map(e => ({ titulo: e.titulo, fecha: e.fecha, tipo: e.tipo }));

    return Response.json({
      periodo: {
        modo,
        etiqueta: etiquetaPeriodo,
        desde: desde.toISOString(),
        hasta: hasta.toISOString(),
      },
      jugadores: {
        total: totalJugadores,
        equipos: totalEquipos,
        femenino: jugadorasFemenino,
        categorias: categoriasArray,
      },
      socios: {
        total: totalSocios,
        pagados: sociosPagados,
      },
      ingresos: {
        total: Math.round(ingresosTotales),
        cuotas: Math.round(ingresosCuotas),
        patrocinio: Math.round(ingresosPatrocinio),
        num_pagos: numPagos,
      },
      eventos: {
        total: totalEventos,
        lista: eventos.slice(0, 40),
      },
      patrocinadores,
      fotos: {
        albumes: totalAlbumes,
        total: totalFotos,
        destacadas: fotosDestacadas,
      },
      logros,
      generado: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
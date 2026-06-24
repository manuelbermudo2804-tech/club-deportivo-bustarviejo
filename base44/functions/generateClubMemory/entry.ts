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
    // secciones: objeto { jugadores: true, socios: true, ... }. Si no se envía, se incluye todo.
    const sec = body.secciones || null;
    const incluir = (clave) => (sec ? !!sec[clave] : true);

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
    let totalJugadores = 0, totalEquipos = 0, jugadorasFemenino = 0, categoriasArray = [];
    if (incluir('jugadores')) {
      const jugadores = await sr.entities.Player.filter({ activo: true }, '-created_date', 2000);
      totalJugadores = jugadores.length;
      const porCategoria = {};
      jugadores.forEach(p => {
        const cat = p.categoria_principal || p.deporte || 'Sin categoría';
        porCategoria[cat] = (porCategoria[cat] || 0) + 1;
        const cats = (p.categorias || []).join(' ') + ' ' + (cat || '');
        if (/femenino/i.test(cats)) jugadorasFemenino++;
      });
      categoriasArray = Object.entries(porCategoria)
        .map(([nombre, count]) => ({ nombre, count }))
        .sort((a, b) => b.count - a.count);
      totalEquipos = categoriasArray.length;
    }

    // ===== GRUPOS / EQUIPOS (autorrelleno para memoria institucional) =====
    // Solo se calcula si se pide explícitamente (incluir('grupos')) para no recargar el resto.
    let grupos = [];
    if (incluir('grupos') || incluir('jugadores')) {
      try {
        const jugadoresAll = await sr.entities.Player.filter({ activo: true }, '-created_date', 2000);
        // Contar integrantes por categoría
        const countPorCat = {};
        jugadoresAll.forEach(p => {
          const cat = p.categoria_principal || p.deporte || 'Sin categoría';
          countPorCat[cat] = (countPorCat[cat] || 0) + 1;
        });

        // Entrenadores por categoría (CoachSettings)
        const entrenadoresPorCat = {};
        try {
          const coaches = await sr.entities.CoachSettings.list('-created_date', 500);
          coaches.forEach(c => {
            (c.categorias_entrena || []).forEach(cat => {
              if (!entrenadoresPorCat[cat]) entrenadoresPorCat[cat] = [];
              if (c.entrenador_nombre) entrenadoresPorCat[cat].push(c.entrenador_nombre);
            });
          });
        } catch { /* sin coaches */ }

        // Posición RFFM final por categoría (última jornada de la temporada)
        const posicionPorCat = {};
        try {
          const clas = await sr.entities.Clasificacion.filter({ temporada }, '-jornada', 3000);
          clas.forEach(c => {
            const esBustar = /bustarviejo/i.test(c.nombre_equipo || '');
            if (!esBustar) return;
            // Quedarse con la jornada más alta por categoría
            if (!posicionPorCat[c.categoria] || c.jornada > posicionPorCat[c.categoria].jornada) {
              posicionPorCat[c.categoria] = { posicion: c.posicion, jornada: c.jornada };
            }
          });
        } catch { /* sin clasificación */ }

        grupos = Object.keys(countPorCat)
          .sort()
          .map(cat => ({
            nombre: cat,
            responsables: (entrenadoresPorCat[cat] || []).join(', '),
            colaboradores: '',
            competicion: '',
            posicion: posicionPorCat[cat] ? `${posicionPorCat[cat].posicion}º` : '',
            integrantes: countPorCat[cat],
            texto: '',
          }));
      } catch { /* sin grupos */ }
    }

    // ===== SOCIOS =====
    let totalSocios = 0;
    let sociosPagados = 0;
    if (incluir('socios')) {
      try {
        const socios = await sr.entities.ClubMember.list('-created_date', 3000);
        totalSocios = socios.length;
        sociosPagados = socios.filter(s => s.estado_pago === 'Pagado' || s.estado_pago === 'pagado').length;
      } catch { /* sin socios */ }
    }

    // ===== INGRESOS =====
    let ingresosTotales = 0;
    let ingresosCuotas = 0;
    let numPagos = 0;
    if (incluir('ingresos')) {
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
    }

    // Patrocinios (importe anual de sponsors activos)
    let ingresosPatrocinio = 0;
    let patrocinadores = [];
    if (incluir('patrocinadores')) {
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
      if (incluir('ingresos')) ingresosTotales += ingresosPatrocinio;
    }

    // ===== EVENTOS =====
    let eventos = [];
    if (incluir('eventos')) {
      try {
        const evs = await sr.entities.Event.filter({ publicado: true }, '-fecha', 1000);
        eventos = evs
          .filter(e => enRango(e.fecha))
          .map(e => ({ titulo: e.titulo, tipo: e.tipo, fecha: e.fecha, ubicacion: e.ubicacion || null, importante: !!e.importante }));
      } catch { /* sin eventos */ }
    }
    const totalEventos = eventos.length;

    // ===== SAN ISIDRO =====
    let sanIsidro = null;
    if (incluir('sanisidro')) {
      try {
        const inscritos = await sr.entities.SanIsidroRegistration.list('-created_date', 3000);
        const enPeriodo = inscritos.filter(r => enRango(r.created_date));
        let voluntarios = 0;
        try {
          const vols = await sr.entities.SanIsidroVoluntario.list('-created_date', 1000);
          voluntarios = vols.filter(v => enRango(v.created_date)).length;
        } catch { /* sin voluntarios */ }
        sanIsidro = { inscritos: enPeriodo.length, voluntarios };
      } catch { /* sin san isidro */ }
    }

    // ===== PORRA / TORNEO =====
    let porra = null;
    if (incluir('porra')) {
      try {
        const participantes = await sr.entities.PorraParticipante.list('-created_date', 5000);
        const enPeriodo = participantes.filter(p => enRango(p.created_date));
        const pagados = enPeriodo.filter(p => p.estado_pago === 'pagado');
        const recaudado = pagados.reduce((s, p) => s + (p.cantidad_pagada || 0), 0);
        porra = { participantes: enPeriodo.length, pagados: pagados.length, recaudado: Math.round(recaudado) };
      } catch { /* sin porra */ }
    }

    // ===== MERCADILLO =====
    let mercadillo = null;
    if (incluir('mercadillo')) {
      try {
        const anuncios = await sr.entities.MarketListing.list('-created_date', 3000);
        const enPeriodo = anuncios.filter(a => enRango(a.created_date));
        mercadillo = { anuncios: enPeriodo.length };
      } catch { /* sin mercadillo */ }
    }

    // ===== VOLUNTARIADO =====
    let voluntariado = null;
    if (incluir('voluntariado')) {
      try {
        const signups = await sr.entities.VolunteerSignup.list('-created_date', 3000);
        const enPeriodo = signups.filter(v => enRango(v.created_date));
        const personas = new Set(enPeriodo.map(v => v.email || v.created_by_id)).size;
        voluntariado = { inscripciones: enPeriodo.length, personas };
      } catch { /* sin voluntariado */ }
    }

    // ===== FOTOS =====
    let totalAlbumes = 0;
    let totalFotos = 0;
    let fotosDestacadas = [];
    if (incluir('fotos')) {
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
    }

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
      grupos,
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
      sanIsidro,
      porra,
      mercadillo,
      voluntariado,
      fotos: {
        albumes: totalAlbumes,
        total: totalFotos,
        destacadas: fotosDestacadas,
      },
      logros,
      secciones: sec || null,
      generado: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
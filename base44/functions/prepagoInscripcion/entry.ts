import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

/**
 * PREPAGO DE INSCRIPCIÓN (pago por adelantado en categorías con CategoryConfig.pago_adelantado = true)
 *
 * Se usa DESPUÉS del paso "Categoría" del asistente de inscripción y ANTES de crear al jugador.
 * Todos los importes se calculan AQUÍ (servidor); el navegador nunca decide cuánto se cobra.
 *
 * Acciones:
 *  - "estado":    ¿esta categoría exige pago adelantado para este usuario? + planes de pago, fondo solidario,
 *                 plaza disponible y si ya existe un prepago pagado para ese jugador.
 *  - "checkout":  crea el cobro en Stripe (modalidad "Único" o "Tres meses" = cuota de junio).
 *                 Solo ADMIN + saltar_pago=true: se salta Stripe y deja un prepago de PRUEBA ya pagado.
 *  - "consultar": estado de un prepago propio (para confirmar el pago al volver de Stripe).
 *
 * El prepago pasa a "Pagado" por el webhook de Stripe (metadata.tipo = "prepago_inscripcion")
 * y a "Consumido" cuando playerRenewalAction crea al jugador con prepago_id.
 */

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const normTemp = (t) => String(t || '').replace(/\//g, '-').trim();
const normTexto = (s) => String(s || '').trim().toLocaleLowerCase('es').replace(/\s+/g, ' ');
const RETURN_PATHS = ['/ParentPlayers', '/PlayerDashboard'];
const MODALIDADES = ['Único', 'Tres meses'];
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

// Nombres antiguos de categoría → nombre en CategoryConfig (igual que src/lib/cuotasConfig.js)
const CATEGORY_NAME_MAPPING = {
  'Fútbol Aficionado': 'AFICIONADO',
  'Fútbol Juvenil': 'JUVENIL',
  'Fútbol Cadete': 'CADETE',
  'Fútbol Infantil (Mixto)': 'INFANTIL',
  'Fútbol Alevín (Mixto)': 'ALEVIN',
  'Fútbol Alevín Femenino': 'Alevin Femenino',
  'Fútbol Benjamín (Mixto)': 'BENJAMIN',
  'Fútbol Pre-Benjamín (Mixto)': 'PRE-BENJAMIN',
  'Fútbol Femenino': 'FEMENINO',
  'Baloncesto (Mixto)': 'BALONCESTO',
};

const getOrigin = (req, bodyOrigin) => {
  for (const c of [req.headers.get('origin'), bodyOrigin]) {
    try {
      if (!c) continue;
      const u = new URL(c);
      if (u.protocol === 'https:') return u.origin;
    } catch (_) { /* probar el siguiente */ }
  }
  return null;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await req.json()) || {};
    const { action } = body;
    const db = base44.asServiceRole.entities;
    const esAdmin = user.role === 'admin';

    const fail = (error, status = 400) => Response.json({ error }, { status });

    // ---------- Helpers ----------
    const getTemporada = async () => {
      const temporadas = await db.SeasonConfig.filter({ activa: true });
      return temporadas[0] || null;
    };

    const getCategoryConfig = async (categoria, temporada) => {
      const nombres = [categoria, CATEGORY_NAME_MAPPING[categoria]].filter(Boolean);
      let cfgs = [];
      for (const n of nombres) {
        cfgs = await db.CategoryConfig.filter({ nombre: n, activa: true });
        if (cfgs.length) break;
      }
      return cfgs.find((c) => normTemp(c.temporada) === normTemp(temporada)) || cfgs[0] || null;
    };

    // El pago adelantado aplica si está activo; en modo prueba solo lo ven los administradores
    const aplica = (cfg) =>
      !!cfg && cfg.pago_adelantado === true && (cfg.pago_adelantado_prueba !== true || esAdmin);

    // Misma regla que ParentPlayers.handleSubmit: 25 € si hay un hermano/a mayor (por fecha de nacimiento)
    const calcularDescuento = async (fechaNac, esAdulto) => {
      if (esAdulto || !fechaNac) return 0;
      const nuevo = new Date(fechaNac).getTime();
      if (Number.isNaN(nuevo)) return 0;
      const [a, b] = await Promise.all([
        db.Player.filter({ email_padre: user.email }, '-created_date', 200),
        db.Player.filter({ email_tutor_2: user.email }, '-created_date', 200),
      ]);
      const mapa = new Map();
      for (const p of [...a, ...b]) mapa.set(p.id, p);
      const hayMayor = [...mapa.values()].some(
        (p) => p.fecha_nacimiento && new Date(p.fecha_nacimiento).getTime() < nuevo
      );
      return hayMayor ? 25 : 0;
    };

    // Solo se aceptan los importes que el club ha configurado para el Fondo Solidario
    const validarAportacion = (season, aportacion) => {
      const a = round2(aportacion);
      if (!a || a <= 0 || !season || !season.fondo_solidario_activo) return 0;
      const permitidos = Array.isArray(season.fondo_solidario_importes)
        ? season.fondo_solidario_importes.map(Number)
        : [];
      return permitidos.includes(a) ? a : 0;
    };

    // Misma aritmética que InscriptionPaymentFlow (Único / Tres meses)
    const calcularPlan = (cfg, tipo, descuento, aportacion) => {
      const inscripcion = Number(cfg.cuota_inscripcion) || 0;
      const segunda = Number(cfg.cuota_segunda) || 0;
      const tercera = Number(cfg.cuota_tercera) || 0;
      const total = Number(cfg.cuota_total) || inscripcion + segunda + tercera;
      if (tipo === 'Único') {
        const cantidad = round2(Math.max(0, total - descuento) + aportacion);
        return {
          tipo_pago: 'Único',
          importe_primer_pago: cantidad,
          total_temporada: cantidad,
          pagos: [{ mes: 'Junio', cantidad, aportacion_solidaria: aportacion, estado_inicial: 'Pagado' }],
        };
      }
      const l = Math.floor(aportacion / 3);
      const h = aportacion - l * 2;
      const junio = round2(Math.max(0, inscripcion - descuento) + h);
      const septiembre = round2(segunda + l);
      const diciembre = round2(tercera + l);
      return {
        tipo_pago: 'Tres meses',
        importe_primer_pago: junio,
        total_temporada: round2(junio + septiembre + diciembre),
        pagos: [
          { mes: 'Junio', cantidad: junio, aportacion_solidaria: h, estado_inicial: 'Pagado' },
          { mes: 'Septiembre', cantidad: septiembre, aportacion_solidaria: l, estado_inicial: 'Pendiente' },
          { mes: 'Diciembre', cantidad: diciembre, aportacion_solidaria: l, estado_inicial: 'Pendiente' },
        ],
      };
    };

    // Prepago ya cobrado (y sin jugador creado) de este usuario para este jugador
    const buscarPrepagoPagado = async (categoria, temporada, fechaNac, nombre) => {
      const lista = await db.PrepagoInscripcion.filter(
        { user_email: user.email, categoria, temporada, estado: 'Pagado' },
        '-created_date',
        50
      );
      const mismos = lista.filter((p) => (p.fecha_nacimiento || '') === (fechaNac || ''));
      return mismos.find((p) => normTexto(p.jugador_nombre) === normTexto(nombre)) || mismos[0] || null;
    };

    // Cupo: jugadores activos + prepagos ya cobrados que aún no tienen jugador (admins no se bloquean)
    const comprobarCupo = async (cfg, categoria, temporada) => {
      if (esAdmin) return null;
      if (cfg.inscripciones_abiertas === false) {
        return `Las inscripciones de ${categoria} están cerradas. Escribe al coordinador.`;
      }
      const limite = Number(cfg.plazas_maximas) || 0;
      if (!limite) return null;
      const activos = await db.Player.filter({ activo: true }, '-created_date', 5000);
      let ocupadas = 0;
      for (const p of activos) {
        const cats = new Set([p.deporte, ...(Array.isArray(p.categorias) ? p.categorias : [])].filter(Boolean));
        if (cats.has(categoria)) ocupadas++;
      }
      const reservas = await db.PrepagoInscripcion.filter(
        { categoria, temporada, estado: 'Pagado', es_prueba: false },
        '-created_date',
        1000
      );
      ocupadas += reservas.length;
      if (ocupadas >= limite) {
        return `${categoria} está completa (${ocupadas}/${limite}). Escribe al coordinador para la lista de espera.`;
      }
      return null;
    };

    const resumenPrepago = (p) => ({
      id: p.id,
      estado: p.estado,
      categoria: p.categoria,
      tipo_pago: p.tipo_pago,
      jugador_nombre: p.jugador_nombre,
      fecha_nacimiento: p.fecha_nacimiento,
      importe_primer_pago: p.importe_primer_pago,
      descuento_hermano: p.descuento_hermano || 0,
      aportacion_solidaria_total: p.aportacion_solidaria_total || 0,
      pagos: p.pagos || [],
      es_prueba: p.es_prueba === true,
    });

    // Validación común de entrada para "estado" y "checkout"
    const leerEntrada = () => {
      const categoria = String(body.categoria || '').trim();
      const nombre = String(body.nombre || '').trim();
      const fechaNac = String(body.fecha_nacimiento || '').trim();
      if (!categoria) return { error: 'Falta la categoría.' };
      if (!FECHA_RE.test(fechaNac)) return { error: 'Falta la fecha de nacimiento del jugador.' };
      return { categoria, nombre, fechaNac, esAdulto: body.adulto === true };
    };

    // ---------- Acción: consultar ----------
    if (action === 'consultar') {
      if (!body.prepago_id) return fail('Falta prepago_id.');
      const p = await db.PrepagoInscripcion.get(body.prepago_id);
      if (!p || (p.user_email !== user.email && !esAdmin)) return fail('Prepago no encontrado.', 404);
      return Response.json({ prepago: resumenPrepago(p) });
    }

    // ---------- Acción: limpiar_prueba (solo admin, solo prepagos de prueba) ----------
    if (action === 'limpiar_prueba') {
      if (!esAdmin) return fail('Solo los administradores pueden borrar pruebas.', 403);
      if (!body.prepago_id) return fail('Falta prepago_id.');
      const p = await db.PrepagoInscripcion.get(body.prepago_id);
      if (!p) return fail('Prepago no encontrado.', 404);
      if (p.es_prueba !== true) return fail('Solo se pueden borrar prepagos marcados como prueba.', 403);

      let pagosBorrados = 0;
      let jugadorBorrado = false;
      if (p.jugador_id) {
        let jugador = null;
        try { jugador = await db.Player.get(p.jugador_id); } catch (_) { jugador = null; }
        // Solo se borra si el jugador es realmente el creado con esta prueba (mismo email de cuenta)
        if (jugador && jugador.email_padre === p.user_email) {
          const pagos = await db.Payment.filter({ jugador_id: jugador.id }, '-created_date', 100);
          for (const pg of pagos) {
            if (normTemp(pg.temporada) === normTemp(p.temporada)) {
              await db.Payment.delete(pg.id);
              pagosBorrados++;
            }
          }
          await db.Player.delete(jugador.id);
          jugadorBorrado = true;
        }
      }
      await db.PrepagoInscripcion.delete(p.id);
      console.log(`🧪 [prepago] prueba ${p.id} borrada por ${user.email}: pagos=${pagosBorrados} jugador=${jugadorBorrado}`);
      return Response.json({ ok: true, pagos_borrados: pagosBorrados, jugador_borrado: jugadorBorrado });
    }

    if (action !== 'estado' && action !== 'checkout') return fail('Acción no soportada.');

    const entrada = leerEntrada();
    if (entrada.error) return fail(entrada.error);
    const { categoria, nombre, fechaNac, esAdulto } = entrada;

    const season = await getTemporada();
    if (!season) return fail('No hay una temporada activa.');
    const temporada = season.temporada;

    const cfg = await getCategoryConfig(categoria, temporada);
    if (!aplica(cfg)) return Response.json({ requerido: false });

    const tarifaOk =
      (Number(cfg.cuota_total) || 0) > 0 || (Number(cfg.cuota_inscripcion) || 0) > 0;
    if (!tarifaOk) return fail('Esta categoría no tiene tarifa configurada. Escribe al club.');

    const existente = await buscarPrepagoPagado(categoria, temporada, fechaNac, nombre);
    const descuento = await calcularDescuento(fechaNac, esAdulto);
    const aportacion = validarAportacion(season, body.aportacion_solidaria);

    // ---------- Acción: estado ----------
    if (action === 'estado') {
      const bloqueo = existente ? null : await comprobarCupo(cfg, categoria, temporada);
      return Response.json({
        requerido: true,
        modo_prueba: cfg.pago_adelantado_prueba === true,
        es_admin: esAdmin,
        temporada,
        bloqueo,
        prepago_pagado: existente ? resumenPrepago(existente) : null,
        descuento_hermano: descuento,
        planes: {
          'Único': calcularPlan(cfg, 'Único', descuento, aportacion),
          'Tres meses': calcularPlan(cfg, 'Tres meses', descuento, aportacion),
        },
        fondo: {
          activo: season.fondo_solidario_activo === true,
          titulo: season.fondo_solidario_titulo || '',
          texto: season.fondo_solidario_texto || '',
          importes: Array.isArray(season.fondo_solidario_importes) ? season.fondo_solidario_importes : [],
        },
      });
    }

    // ---------- Acción: checkout ----------
    const modalidad = String(body.modalidad || '');
    if (!MODALIDADES.includes(modalidad)) return fail('Elige pago único o tres plazos.');

    // Ya pagó antes (p. ej. volvió a empezar el formulario): no se vuelve a cobrar
    if (existente) {
      return Response.json({ ya_pagado: true, prepago_id: existente.id });
    }

    const bloqueo = await comprobarCupo(cfg, categoria, temporada);
    if (bloqueo) return fail(bloqueo, 409);

    const plan = calcularPlan(cfg, modalidad, descuento, aportacion);

    const datos = {
      user_email: user.email,
      temporada,
      categoria,
      jugador_nombre: nombre,
      fecha_nacimiento: fechaNac,
      es_adulto: esAdulto,
      tipo_pago: modalidad,
      descuento_hermano: descuento,
      aportacion_solidaria_total: aportacion,
      importe_primer_pago: plan.importe_primer_pago,
      pagos: plan.pagos,
    };

    // Salto de Stripe: SOLO administradores (se comprueba aquí, en el servidor)
    if (body.saltar_pago === true) {
      if (!esAdmin) return fail('Solo los administradores pueden saltarse el pago.', 403);
      const prueba = await db.PrepagoInscripcion.create({
        ...datos,
        estado: 'Pagado',
        es_prueba: true,
        saltado_por: user.email,
        fecha_pago: new Date().toISOString(),
      });
      console.log(`🧪 [prepago] PAGO SALTADO (prueba) por admin ${user.email} · ${categoria} · prepago ${prueba.id}`);
      return Response.json({ saltado: true, prepago_id: prueba.id });
    }

    if (plan.importe_primer_pago < 0.5) return fail('El importe a pagar es demasiado bajo para cobrarlo con tarjeta.');

    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecret) return fail('Stripe no está configurado.', 500);
    const origin = getOrigin(req, body.origin);
    if (!origin) return fail('No se pudo determinar la dirección de retorno.');
    const returnPath = RETURN_PATHS.includes(body.return_path) ? body.return_path : '/ParentPlayers';

    // Anular intentos anteriores sin pagar del mismo jugador, para no acumular registros
    const pendientes = await db.PrepagoInscripcion.filter(
      { user_email: user.email, categoria, temporada, estado: 'Pendiente' },
      '-created_date',
      50
    );
    for (const p of pendientes) {
      if ((p.fecha_nacimiento || '') === fechaNac) {
        await db.PrepagoInscripcion.update(p.id, { estado: 'Cancelado' });
      }
    }

    const prepago = await db.PrepagoInscripcion.create({ ...datos, estado: 'Pendiente', es_prueba: false });

    try {
      const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' });
      const concepto =
        modalidad === 'Único'
          ? 'Pago único'
          : 'Cuota de junio (1.º de 3 plazos)';
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: user.email,
        success_url: `${origin}${returnPath}?prepago=${prepago.id}`,
        cancel_url: `${origin}${returnPath}?prepago_cancelado=1`,
        allow_promotion_codes: false,
        automatic_tax: { enabled: false },
        metadata: {
          base44_app_id: Deno.env.get('BASE44_APP_ID') || 'unknown',
          tipo: 'prepago_inscripcion',
          prepago_id: prepago.id,
          user_email: user.email,
          categoria,
          temporada,
        },
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: `Inscripción ${categoria} · ${nombre || 'jugador'} · ${temporada} — ${concepto}`,
              },
              unit_amount: Math.round(plan.importe_primer_pago * 100),
            },
            quantity: 1,
          },
        ],
      });
      await db.PrepagoInscripcion.update(prepago.id, { stripe_session_id: session.id });
      return Response.json({ url: session.url, prepago_id: prepago.id });
    } catch (e) {
      await db.PrepagoInscripcion.update(prepago.id, { estado: 'Cancelado' });
      console.error('[prepago] error creando sesión de Stripe:', e);
      return fail('No se pudo iniciar el pago con tarjeta. Inténtalo de nuevo.', 500);
    }
  } catch (error) {
    console.error('[prepagoInscripcion] error:', error);
    return Response.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
});

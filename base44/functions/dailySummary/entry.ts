import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Resumen del Día para Admin: recopila en una sola llamada todo lo nuevo desde
// una fecha de corte (la última visita del admin) + lo que requiere atención.
// Solo lectura — NO modifica nada.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const sr = base44.asServiceRole;

    // Fecha de corte: la última visita del admin (enviada por el cliente).
    // Si no llega, usamos las últimas 24h como red de seguridad.
    let since;
    try {
      const body = await req.json();
      since = body?.since;
    } catch { /* sin body */ }
    if (!since) since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const sinceMs = new Date(since).getTime();

    // Cuenta cuántos registros recientes son posteriores a `since`.
    // El filtro por rango de fechas en servidor ($gte sobre created_date) no es
    // fiable en esta plataforma, así que traemos los más recientes y filtramos
    // la fecha aquí, en código.
    const countNewerThanSince = (rows) => {
      if (!Array.isArray(rows)) return 0;
      return rows.filter((r) => {
        const t = new Date(r.created_date).getTime();
        return !isNaN(t) && t >= sinceMs;
      }).length;
    };

    // Ejecuta una lista de funciones-promesa en lotes pequeños para no superar
    // el límite de peticiones simultáneas (rate limit 429) de la base de datos.
    const runInBatches = async (tasks, batchSize = 5) => {
      const results = [];
      for (let i = 0; i < tasks.length; i += batchSize) {
        const batch = tasks.slice(i, i + batchSize);
        const part = await Promise.all(batch.map((fn) => fn()));
        results.push(...part);
        // pequeña pausa entre lotes para repartir la carga
        if (i + batchSize < tasks.length) await new Promise((r) => setTimeout(r, 120));
      }
      return results;
    };

    // Trae registros (reintenta una vez ante un 429) y aplica un mapeo opcional.
    const safeFetch = async (entityName, query, map) => {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const rows = await sr.entities[entityName].filter(query, '-created_date', 200);
          return map ? map(rows) : rows.length;
        } catch (err) {
          const msg = (err?.message || '').toLowerCase();
          if (attempt === 0 && (msg.includes('rate limit') || msg.includes('429'))) {
            await new Promise((r) => setTimeout(r, 400));
            continue;
          }
          return map ? 0 : 0;
        }
      }
      return 0;
    };
    // Novedades: trae lo más reciente y cuenta lo posterior a `since` en código.
    const countNew = (entityName, extra = {}) => () => safeFetch(entityName, extra, countNewerThanSince);
    // Pendientes acumulados por estado: el filtro por estado sí es fiable.
    const countAll = (entityName, query = {}) => () => safeFetch(entityName, query);

    // === NOVEDADES (desde la última visita) ===
    const [
      nuevasInscripciones,
      nuevosPagos,
      nuevasSolicitudesAcceso,
      nuevosSocios,
      nuevosPedidosRopa,
      nuevosPedidosLoteria,
      nuevosBuzonJuvenil,
      nuevasRespuestasEncuestas,
      nuevosContactosWeb,
      nuevasInscripcionesPublicas,
      nuevasInscripcionesSanIsidro,
      nuevosDorsales,
      nuevosColaboradores,
      nuevoInteresPatrocinio,
      nuevasPropuestasPatrocinio,
      nuevasInscripcionesPorra,
      nuevoInteresFemenino,
      nuevasIncidenciasLopivi,
      nuevosAnunciosMercadillo,
      nuevosVoluntarios,
      nuevasBajasCuenta,
      nuevasReservasMercadillo,
    ] = await runInBatches([
      countNew('Player'),
      countNew('Payment', { is_deleted: { $ne: true } }),
      countNew('AccessRequest'),
      countNew('ClubMember'),
      countNew('ClothingOrder'),
      countNew('LotteryOrder'),
      countNew('JuniorMailbox'),
      countNew('SurveyResponse'),
      countNew('ContactForm'),
      countNew('LandingSubmission'),
      countNew('SanIsidroRegistration'),
      countNew('DorsalAssignment'),
      countNew('CollaborationPayment'),
      countNew('SponsorInterest'),
      countNew('PropuestaPatrocinio'),
      countNew('PorraParticipante'),
      countNew('FemeninoInterest'),
      countNew('LopiviIncidencia'),
      countNew('MarketListing'),
      countNew('VolunteerSignup'),
      countNew('AccountDeletionRequest'),
      countNew('MarketReservation'),
    ]);

    const novedades = [
      { id: 'inscripciones', label: 'Nuevas inscripciones de jugadores', count: nuevasInscripciones, page: 'Players', icon: 'UserPlus' },
      { id: 'pagos', label: 'Nuevos pagos / justificantes', count: nuevosPagos, page: 'Payments', icon: 'CreditCard' },
      { id: 'acceso', label: 'Nuevas solicitudes de acceso', count: nuevasSolicitudesAcceso, page: 'AdminAccessCodes', icon: 'KeyRound' },
      { id: 'socios', label: 'Nuevos socios', count: nuevosSocios, page: 'ClubMembersManagement', icon: 'Users' },
      { id: 'ropa', label: 'Nuevos pedidos de ropa', count: nuevosPedidosRopa, page: 'Shop', icon: 'Shirt' },
      { id: 'loteria', label: 'Nuevos pedidos de lotería', count: nuevosPedidosLoteria, page: 'LotteryManagement', icon: 'Clover' },
      { id: 'buzon', label: 'Buzón juvenil', count: nuevosBuzonJuvenil, page: 'JuniorMailboxAdmin', icon: 'Mail' },
      { id: 'encuestas', label: 'Nuevas respuestas de encuestas', count: nuevasRespuestasEncuestas, page: 'Surveys', icon: 'ClipboardList' },
      { id: 'contactos', label: 'Nuevos contactos web', count: nuevosContactosWeb, page: 'WebContacts', icon: 'MessageSquare' },
      { id: 'landing', label: 'Inscripciones en páginas públicas', count: nuevasInscripcionesPublicas, page: 'PageBuilderInscritos', icon: 'Globe' },
      { id: 'sanisidro', label: 'Inscripciones San Isidro', count: nuevasInscripcionesSanIsidro, page: 'SanIsidroAdmin', icon: 'PartyPopper' },
      { id: 'dorsales', label: 'Nuevos dorsales asignados', count: nuevosDorsales, page: 'DorsalManagement', icon: 'Hash' },
      { id: 'colabora', label: 'Nuevas colaboraciones (comercios)', count: nuevosColaboradores, page: 'Sponsorships', icon: 'Handshake' },
      { id: 'interes_patrocinio', label: 'Interés de patrocinadores', count: nuevoInteresPatrocinio, page: 'Sponsorships', icon: 'Briefcase' },
      { id: 'propuestas_patrocinio', label: 'Propuestas de patrocinio', count: nuevasPropuestasPatrocinio, page: 'Sponsorships', icon: 'FileText' },
      { id: 'porra', label: 'Nuevas porras', count: nuevasInscripcionesPorra, page: 'PorraAdmin', icon: 'Trophy' },
      { id: 'femenino', label: 'Interés fútbol femenino', count: nuevoInteresFemenino, page: 'FemeninoInterests', icon: 'Heart' },
      { id: 'lopivi', label: 'Incidencias LOPIVI', count: nuevasIncidenciasLopivi, page: 'LopiviAdmin', icon: 'ShieldAlert' },
      { id: 'mercadillo', label: 'Nuevos anuncios en el mercadillo', count: nuevosAnunciosMercadillo, page: 'Mercadillo', icon: 'ShoppingBag' },
      { id: 'mercadillo_reservas', label: 'Nuevas reservas en el mercadillo', count: nuevasReservasMercadillo, page: 'Mercadillo', icon: 'ShoppingBag' },
      { id: 'voluntarios', label: 'Nuevas inscripciones de voluntarios', count: nuevosVoluntarios, page: 'Voluntariado', icon: 'HandHeart' },
      { id: 'bajas_cuenta', label: 'Nuevas solicitudes de baja de cuenta', count: nuevasBajasCuenta, page: 'UserManagement', icon: 'UserMinus' },
    ].filter(n => n.count > 0);

    // === REQUIERE ATENCIÓN (pendientes acumulados, independientemente de la fecha) ===
    const [
      pagosEnRevision,
      ropaPendiente,
      sociosPendientes,
      loteriaPendiente,
      contactosSinResponder,
      accesoPendiente,
      incidenciasLopiviAbiertas,
      bajasCuentaPendientes,
      categoriasARevisar,
    ] = await runInBatches([
      countAll('Payment', { estado: 'En revisión', is_deleted: { $ne: true } }),
      countAll('ClothingOrder', { estado: 'Pendiente' }),
      countAll('ClubMember', { estado_pago: 'Pendiente' }),
      countAll('LotteryOrder', { pagado: false }),
      countAll('ContactForm', { estado: 'pendiente' }),
      countAll('AccessRequest', { estado: 'pendiente' }),
      countAll('LopiviIncidencia', { estado: 'abierta' }),
      countAll('AccountDeletionRequest', { status: 'solicitada' }),
      countAll('Player', { activo: true, categoria_requiere_revision: true }),
    ]);

    // Firmas federativas pendientes y renovaciones (requiere recorrer jugadores activos)
    let firmasPendientes = 0;
    let renovacionesPendientes = 0;
    // Aviso descuento hermanos: familias con 2+ hijos activos donde algún hijo se
    // renovó/inscribió desde la última visita → conviene pulsar "Recalcular ahora".
    let familiasHermanosRecalcular = 0;
    try {
      const calcEdad = (f) => {
        if (!f) return null;
        const h = new Date(), n = new Date(f);
        let e = h.getFullYear() - n.getFullYear();
        const m = h.getMonth() - n.getMonth();
        if (m < 0 || (m === 0 && h.getDate() < n.getDate())) e--;
        return e;
      };
      const activos = await sr.entities.Player.filter({ activo: true }, '-updated_date', 1000);
      const porFamilia = {};
      activos.forEach(p => {
        if (p.enlace_firma_jugador && !p.firma_jugador_completada) firmasPendientes++;
        if (p.enlace_firma_tutor && !p.firma_tutor_completada && calcEdad(p.fecha_nacimiento) < 18) firmasPendientes++;
        if (p.estado_renovacion === 'pendiente') renovacionesPendientes++;
        const email = (p.email_padre || '').toLowerCase().trim();
        if (!email) return;
        if (!porFamilia[email]) porFamilia[email] = [];
        porFamilia[email].push(p);
      });
      // Cuenta familias con 2+ hijos activos que tuvieron alta/renovación reciente.
      Object.values(porFamilia).forEach(hijos => {
        if (hijos.length < 2) return;
        const reciente = hijos.some(p => {
          const t = new Date(p.created_date).getTime();
          const r = p.fecha_renovacion ? new Date(p.fecha_renovacion).getTime() : 0;
          return (!isNaN(t) && t >= sinceMs) || (r && r >= sinceMs);
        });
        if (reciente) familiasHermanosRecalcular++;
      });
    } catch { /* sin datos */ }

    const atencion = [
      { id: 'pagos_revision', label: 'Pagos en revisión', count: pagosEnRevision, page: 'Payments', icon: 'CreditCard' },
      { id: 'ropa_pendiente', label: 'Pedidos de ropa pendientes', count: ropaPendiente, page: 'Shop', icon: 'Shirt' },
      { id: 'socios_pendientes', label: 'Socios pendientes de aprobar', count: sociosPendientes, page: 'ClubMembersManagement', icon: 'Users' },
      { id: 'loteria_pendiente', label: 'Lotería pendiente de pago', count: loteriaPendiente, page: 'LotteryManagement', icon: 'Clover' },
      { id: 'contactos_pendientes', label: 'Contactos web sin responder', count: contactosSinResponder, page: 'WebContacts', icon: 'MessageSquare' },
      { id: 'acceso_pendiente', label: 'Solicitudes de acceso sin gestionar', count: accesoPendiente, page: 'AdminAccessCodes', icon: 'KeyRound' },
      { id: 'lopivi_abiertas', label: 'Incidencias LOPIVI abiertas', count: incidenciasLopiviAbiertas, page: 'LopiviAdmin', icon: 'ShieldAlert' },
      { id: 'firmas_pendientes', label: 'Firmas federativas pendientes', count: firmasPendientes, page: 'FederationSignaturesAdmin', icon: 'FileSignature' },
      { id: 'renovaciones_pendientes', label: 'Renovaciones pendientes', count: renovacionesPendientes, page: 'RenewalDashboard', icon: 'RefreshCw' },
      { id: 'recalcular_hermanos', label: 'Familias con hermanos: pulsa "Recalcular descuentos" en Renovaciones', count: familiasHermanosRecalcular, page: 'RenewalDashboard', icon: 'Users' },
      { id: 'categorias_revisar', label: 'Jugadores con categoría a revisar', count: categoriasARevisar, page: 'Players', icon: 'AlertTriangle' },
      { id: 'bajas_cuenta_pendientes', label: 'Solicitudes de baja sin procesar', count: bajasCuentaPendientes, page: 'UserManagement', icon: 'UserMinus' },
    ].filter(a => a.count > 0);

    // === ERRORES / EVENTOS CRÍTICOS (diagnóstico, desde la última visita) ===
    let erroresDiagnostico = 0;
    try {
      const errs = await sr.entities.UploadDiagnostic.filter(
        { severity: 'critical' }, '-created_date', 200
      );
      erroresDiagnostico = countNewerThanSince(errs);
    } catch { erroresDiagnostico = 0; }
    if (erroresDiagnostico > 0) {
      atencion.push({ id: 'errores_criticos', label: 'Errores críticos registrados', count: erroresDiagnostico, page: 'UploadDiagnostics', icon: 'AlertTriangle' });
    }

    const totalNovedades = novedades.reduce((s, n) => s + n.count, 0);
    const totalAtencion = atencion.reduce((s, a) => s + a.count, 0);

    return Response.json({
      since,
      novedades,
      atencion,
      totales: { novedades: totalNovedades, atencion: totalAtencion },
      generado: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
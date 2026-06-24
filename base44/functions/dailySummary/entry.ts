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

    const sinceFilter = { created_date: { $gte: since } };

    // Helper: cuenta segura (nunca rompe el resumen completo si una entidad falla)
    const countNew = async (entityName, extra = {}) => {
      try {
        const rows = await sr.entities[entityName].filter({ ...sinceFilter, ...extra }, '-created_date', 200);
        return rows.length;
      } catch {
        return 0;
      }
    };
    const countAll = async (entityName, query = {}) => {
      try {
        const rows = await sr.entities[entityName].filter(query, '-created_date', 200);
        return rows.length;
      } catch {
        return 0;
      }
    };

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
    ] = await Promise.all([
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
    ] = await Promise.all([
      countAll('Payment', { estado: 'En revisión', is_deleted: { $ne: true } }),
      countAll('ClothingOrder', { estado: 'Pendiente' }),
      countAll('ClubMember', { estado_pago: 'Pendiente' }),
      countAll('LotteryOrder', { pagado: false }),
      countAll('ContactForm', { estado: 'pendiente' }),
      countAll('AccessRequest', { estado: 'pendiente' }),
      countAll('LopiviIncidencia', { estado: 'abierta' }),
    ]);

    const atencion = [
      { id: 'pagos_revision', label: 'Pagos en revisión', count: pagosEnRevision, page: 'Payments', icon: 'CreditCard' },
      { id: 'ropa_pendiente', label: 'Pedidos de ropa pendientes', count: ropaPendiente, page: 'Shop', icon: 'Shirt' },
      { id: 'socios_pendientes', label: 'Socios pendientes de aprobar', count: sociosPendientes, page: 'ClubMembersManagement', icon: 'Users' },
      { id: 'loteria_pendiente', label: 'Lotería pendiente de pago', count: loteriaPendiente, page: 'LotteryManagement', icon: 'Clover' },
      { id: 'contactos_pendientes', label: 'Contactos web sin responder', count: contactosSinResponder, page: 'WebContacts', icon: 'MessageSquare' },
      { id: 'acceso_pendiente', label: 'Solicitudes de acceso sin gestionar', count: accesoPendiente, page: 'AdminAccessCodes', icon: 'KeyRound' },
      { id: 'lopivi_abiertas', label: 'Incidencias LOPIVI abiertas', count: incidenciasLopiviAbiertas, page: 'LopiviAdmin', icon: 'ShieldAlert' },
    ].filter(a => a.count > 0);

    // === ERRORES / EVENTOS CRÍTICOS (diagnóstico, desde la última visita) ===
    let erroresDiagnostico = 0;
    try {
      const errs = await sr.entities.UploadDiagnostic.filter(
        { ...sinceFilter, severity: 'critical' }, '-created_date', 100
      );
      erroresDiagnostico = errs.length;
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
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Centraliza TODAS las queries iniciales de useUnifiedNotifications
 * en una única llamada HTTP, eliminando ~10 queries individuales del frontend.
 * 
 * Devuelve datos crudos (listas cortas) que el frontend procesa igual que antes.
 * Solo cambia DÓNDE se hacen las queries (servidor en vez de cliente).
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = user.role === 'admin';
    const isTreasurer = user.es_tesorero === true;
    const isCoach = user.es_entrenador === true;
    const isPlayer = user.es_jugador === true;

    // Todas las queries en paralelo — el servidor no tiene rate limit interno
    const promises = {};

    // 1. AppNotifications (todos los usuarios)
    promises.appNotifications = base44.entities.AppNotification
      .filter({ usuario_email: user.email, vista: false })
      .catch(() => []);

    // 2. Convocatorias (todos)
    promises.convocatorias = base44.entities.Convocatoria
      .list('-created_date', 30)
      .catch(() => []);

    // 3. Pagos (solo admin/tesorero)
    if (isAdmin || isTreasurer) {
      promises.payments = base44.entities.Payment
        .list('-created_date', 30)
        .catch(() => []);
    }

    // 4. Jugadores — depende del rol
    if (isAdmin) {
      promises.players = base44.entities.Player
        .filter({ categoria_requiere_revision: true }, '-updated_date', 120)
        .catch(() => []);
    } else {
      // Familia: buscar por email_padre, email_tutor_2, email_jugador
      const pPadre = base44.entities.Player
        .filter({ email_padre: user.email }, '-updated_date', 100)
        .catch(() => []);
      const pTutor2 = base44.entities.Player
        .filter({ email_tutor_2: user.email }, '-updated_date', 100)
        .catch(() => []);
      const pJugador = isPlayer
        ? base44.entities.Player
            .filter({ email_jugador: user.email }, '-updated_date', 10)
            .catch(() => [])
        : Promise.resolve([]);
      
      promises.players = Promise.all([pPadre, pTutor2, pJugador]).then(([a, b, c]) => {
        const map = new Map();
        [...a, ...b, ...c].forEach(p => map.set(p.id, p));
        return Array.from(map.values());
      });
    }

    // 5. Anuncios (todos)
    promises.announcements = base44.entities.Announcement
      .filter({ publicado: true }, '-fecha_publicacion', 20)
      .catch(() => []);

    // 6. Admin-only: invitaciones, ropa, lotería, socios, cuentas
    if (isAdmin || isTreasurer) {
      const fullAdmin = isAdmin;
      
      promises.invitations = fullAdmin
        ? base44.entities.InvitationRequest.filter({ estado: "Pendiente" }).catch(() => [])
        : Promise.resolve([]);
      
      promises.secondParentInvitations = fullAdmin
        ? base44.entities.SecondParentInvitation.filter({ estado: "pendiente" }).catch(() => [])
        : Promise.resolve([]);
      
      promises.clothingOrders = base44.entities.ClothingOrder
        .list('-updated_date', 80)
        .catch(() => []);
      
      promises.lotteryOrders = fullAdmin
        ? base44.entities.LotteryOrder.filter({ estado: "Solicitado", pagado: false }).catch(() => [])
        : Promise.resolve([]);
      
      promises.clubMembers = base44.entities.ClubMember
        .filter({ estado_pago: "Pendiente" })
        .catch(() => []);
      
      if (fullAdmin) {
        promises.deletionSolicitada = base44.entities.AccountDeletionRequest
          .filter({ status: "solicitada" }).catch(() => []);
        promises.deletionRevision = base44.entities.AccountDeletionRequest
          .filter({ status: "en_revision" }).catch(() => []);
      }
    }

    // Ejecutar TODAS en paralelo
    const keys = Object.keys(promises);
    const values = await Promise.all(keys.map(k => promises[k]));
    
    const result = {};
    keys.forEach((k, i) => { result[k] = values[i]; });

    // Combinar deletion requests
    if (result.deletionSolicitada || result.deletionRevision) {
      result.accountDeletionRequests = [
        ...(result.deletionSolicitada || []),
        ...(result.deletionRevision || [])
      ];
      delete result.deletionSolicitada;
      delete result.deletionRevision;
    }

    return Response.json(result);

  } catch (error) {
    console.error('getNotificationCounts error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
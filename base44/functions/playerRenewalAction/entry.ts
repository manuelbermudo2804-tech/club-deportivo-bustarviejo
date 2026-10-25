import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Función backend para que padres realicen acciones de renovación protegidas por RLS.
 * Acciones soportadas:
 *  - "renew": marca jugador como renovado (estado_renovacion=renovado, activo=true) y crea pagos
 *  - "not_renewing": marca como no_renueva
 *  - "create_with_payments": crea jugador nuevo + pagos asociados
 *      (opcional: prepago_id = pago por adelantado ya cobrado; entonces los pagos se generan desde el prepago,
 *       la plaza ya estaba reservada y se ignora el array "payments" del cliente)
 *
 * Verifica siempre que el usuario autenticado sea padre/tutor del jugador
 * (o esté creando uno nuevo asociado a su email).
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, playerId, playerData, payments, temporada } = body;

    if (!action) {
      return Response.json({ error: 'Falta el campo action' }, { status: 400 });
    }

    // Helper: verificar que el usuario es padre/tutor del jugador
    const verifyOwnership = async (id) => {
      const player = await base44.asServiceRole.entities.Player.get(id);
      if (!player) throw new Error('Jugador no encontrado');
      const isOwner =
        player.email_padre === user.email ||
        player.email_tutor_2 === user.email ||
        player.email_jugador === user.email;
      if (!isOwner && user.role !== 'admin') {
        throw new Error('No tienes permiso sobre este jugador');
      }
      return player;
    };

    // Cuenta jugadores activos por categoría (con permisos de servidor: ve a todo el club)
    const contarPlazas = async () => {
      const activos = await base44.asServiceRole.entities.Player.filter({ activo: true }, '-created_date', 5000);
      const counts = {};
      for (const p of activos) {
        const cats = new Set([p.deporte, ...(Array.isArray(p.categorias) ? p.categorias : [])].filter(Boolean));
        for (const c of cats) counts[c] = (counts[c] || 0) + 1;
      }
      return counts;
    };

    // Devuelve un mensaje de error si la categoría está cerrada o completa (admins no se bloquean)
    const comprobarCupo = async (categoria) => {
      if (!categoria || user.role === 'admin') return null;
      const cfgs = await base44.asServiceRole.entities.CategoryConfig.filter({ nombre: categoria, activa: true });
      const cfg = cfgs[0];
      if (!cfg) return null;
      if (cfg.inscripciones_abiertas === false) {
        return `Las inscripciones de ${categoria} están cerradas. Escribe al coordinador.`;
      }
      const limite = Number(cfg.plazas_maximas) || 0;
      if (!limite) return null;
      const ocupadas = (await contarPlazas())[categoria] || 0;
      if (ocupadas >= limite) {
        return `${categoria} está completa (${ocupadas}/${limite}). Escribe al coordinador para la lista de espera.`;
      }
      return null;
    };

    // 💳 ¿La categoría exige pago por adelantado ACTIVO (no en modo prueba)? Los admins nunca se bloquean.
    const CATEGORY_NAME_MAPPING = {
      'Fútbol Aficionado': 'AFICIONADO', 'Fútbol Juvenil': 'JUVENIL', 'Fútbol Cadete': 'CADETE',
      'Fútbol Infantil (Mixto)': 'INFANTIL', 'Fútbol Alevín (Mixto)': 'ALEVIN', 'Fútbol Alevín Femenino': 'Alevin Femenino',
      'Fútbol Benjamín (Mixto)': 'BENJAMIN', 'Fútbol Pre-Benjamín (Mixto)': 'PRE-BENJAMIN',
      'Fútbol Femenino': 'FEMENINO', 'Baloncesto (Mixto)': 'BALONCESTO',
    };
    const exigePagoAdelantado = async (categoria) => {
      if (!categoria || user.role === 'admin') return false;
      for (const n of [categoria, CATEGORY_NAME_MAPPING[categoria]].filter(Boolean)) {
        const cfgs = await base44.asServiceRole.entities.CategoryConfig.filter({ nombre: n, activa: true });
        if (cfgs.length) return cfgs.some((c) => c.pago_adelantado === true && c.pago_adelantado_prueba !== true);
      }
      return false;
    };

    // ============ PLAZAS (solo recuentos, sin datos personales) ============
    if (action === 'plazas_estado') {
      return Response.json({ success: true, counts: await contarPlazas() });
    }

    // ============ RENEW ============
    if (action === 'renew') {
      if (!playerId) return Response.json({ error: 'Falta playerId' }, { status: 400 });

      // Validación autoritativa: la interfaz no puede abrir renovaciones por sí sola.
      const configs = await base44.asServiceRole.entities.SeasonConfig.list();
      const activeConfigs = configs.filter((c) => c.activa === true);
      const activeConfig = activeConfigs.length === 1 ? activeConfigs[0] : null;
      if (activeConfigs.length !== 1) {
        return Response.json({ success: false, error: 'Debe existir exactamente una temporada activa configurada. Contacta con el administrador.' }, { status: 409 });
      }
      if (!activeConfig || activeConfig.permitir_renovaciones !== true) {
        return Response.json({ success: false, error: 'El plazo de renovaciones no está abierto actualmente.' }, { status: 409 });
      }
      if (!activeConfig.fecha_limite_renovaciones) {
        return Response.json({ success: false, error: 'El administrador debe configurar la fecha límite antes de abrir las renovaciones.' }, { status: 409 });
      }
      const requestedSeason = String(temporada || '').trim();
      if (!requestedSeason || requestedSeason !== String(activeConfig.temporada || '').trim()) {
        return Response.json({ success: false, error: 'La temporada de renovación no coincide con la temporada activa configurada.' }, { status: 409 });
      }
      if (activeConfig.fecha_limite_renovaciones) {
        const deadline = new Date(`${String(activeConfig.fecha_limite_renovaciones).slice(0, 10)}T23:59:59`);
        if (!Number.isNaN(deadline.getTime()) && new Date() > deadline) {
          return Response.json({ success: false, error: 'El plazo de renovaciones ha finalizado.' }, { status: 409 });
        }
      }

      const actual = await verifyOwnership(playerId);

      // Validar en servidor las deudas que se adjuntan a la primera cuota. No confiar en IDs/notas del navegador.
      if (user.role !== 'admin' && Array.isArray(payments) && payments.length > 0) {
        const marker = String(payments[0]?.notas || '').match(/\\[DEUDA_SALDA_IDS:([^\\]]+)\\]/);
        if (marker) {
          const debtIds = [...new Set(marker[1].split(',').map((id) => id.trim()).filter(Boolean))];
          if (debtIds.length === 0) {
            return Response.json({ success: false, error: 'La deuda vinculada a la renovación no es válida.' }, { status: 400 });
          }
          let verifiedDebtTotal = 0;
          for (const debtId of debtIds) {
            const debt = await base44.asServiceRole.entities.Deuda.get(debtId);
            if (!debt || debt.estado !== 'pendiente' || String(debt.email_familia || '').toLowerCase().trim() !== String(user.email || '').toLowerCase().trim()) {
              return Response.json({ success: false, error: 'Una de las deudas seleccionadas no está pendiente o no pertenece a tu familia.' }, { status: 409 });
            }
            verifiedDebtTotal += Number(debt.importe) || 0;
          }
          if (verifiedDebtTotal <= 0) {
            return Response.json({ success: false, error: 'El importe de la deuda vinculada no es válido.' }, { status: 409 });
          }
        }
      }

      // Bloqueo por deuda de temporadas anteriores (salvo excepción marcada por el club)
      if (user.role !== 'admin' && !actual.exento_bloqueo_impago) {
        const key = (t) => String(t || '').trim().replace(/\//g, '-');
        const pagos = await base44.asServiceRole.entities.Payment.filter({ jugador_id: playerId, estado: 'Pendiente' });
        const deuda = pagos.filter((p) => !p.is_deleted && p.temporada && key(p.temporada) !== key(temporada));
        if (deuda.length > 0) {
          const total = deuda.reduce((s, p) => s + (Number(p.cantidad) || 0), 0);
          const detalle = deuda.map((p) => `${p.mes} ${p.temporada}: ${p.cantidad}€`).join(', ');
          return Response.json({
            success: false,
            error: `No se puede renovar a ${actual.nombre}: tiene ${total}€ pendientes de temporadas anteriores (${detalle}). Ponte al día en "Pagos" o escribe al club.`,
          });
        }
      }

      const nuevaCat = playerData?.deporte;
      const yaEnCategoria = actual.activo && (actual.deporte === nuevaCat || (actual.categorias || []).includes(nuevaCat));
      if (nuevaCat && !yaEnCategoria) {
        const bloqueo = await comprobarCupo(nuevaCat);
        if (bloqueo) return Response.json({ success: false, error: bloqueo }, { status: 409 });
      }

      const updateData = {
        estado_renovacion: 'renovado',
        activo: true,
        tipo_inscripcion: 'Renovación',
        temporada_renovacion: temporada,
        fecha_renovacion: new Date().toISOString(),
      };
      if (playerData?.deporte) updateData.deporte = playerData.deporte;
      if (playerData?.categoria_principal) updateData.categoria_principal = playerData.categoria_principal;

      const updated = await base44.asServiceRole.entities.Player.update(playerId, updateData);

      // Crear pagos
      const createdPayments = [];
      if (Array.isArray(payments) && payments.length > 0) {
        for (const p of payments) {
          const created = await base44.asServiceRole.entities.Payment.create({
            ...p,
            categoria_actividad: p.categoria_actividad || playerData?.deporte || updated.categoria_principal || updated.deporte,
            jugador_id: updated.id,
            jugador_nombre: updated.nombre,
          });
          createdPayments.push(created);
        }
      }

      return Response.json({ success: true, player: updated, payments: createdPayments });
    }

    // ============ NOT RENEWING ============
    if (action === 'not_renewing') {
      if (!playerId) return Response.json({ error: 'Falta playerId' }, { status: 400 });
      const configs = await base44.asServiceRole.entities.SeasonConfig.list();
      const activeConfigs = configs.filter((c) => c.activa === true);
      const activeConfig = activeConfigs.length === 1 ? activeConfigs[0] : null;
      if (activeConfigs.length !== 1) {
        return Response.json({ success: false, error: 'Debe existir exactamente una temporada activa configurada. Contacta con el administrador.' }, { status: 409 });
      }
      if (!activeConfig || activeConfig.permitir_renovaciones !== true) {
        return Response.json({ success: false, error: 'El plazo de renovaciones no está abierto actualmente.' }, { status: 409 });
      }
      if (!activeConfig.fecha_limite_renovaciones) {
        return Response.json({ success: false, error: 'El administrador debe configurar la fecha límite antes de abrir las renovaciones.' }, { status: 409 });
      }
      if (String(temporada || '').trim() !== String(activeConfig.temporada || '').trim()) {
        return Response.json({ success: false, error: 'La temporada de renovación no coincide con la temporada activa configurada.' }, { status: 409 });
      }
      if (activeConfig.fecha_limite_renovaciones) {
        const deadline = new Date(`${String(activeConfig.fecha_limite_renovaciones).slice(0, 10)}T23:59:59`);
        if (!Number.isNaN(deadline.getTime()) && new Date() > deadline) {
          return Response.json({ success: false, error: 'El plazo de renovaciones ha finalizado.' }, { status: 409 });
        }
      }
      await verifyOwnership(playerId);

      const updated = await base44.asServiceRole.entities.Player.update(playerId, {
        estado_renovacion: 'no_renueva',
        fecha_renovacion: new Date().toISOString(),
        temporada_renovacion: temporada,
      });

      return Response.json({ success: true, player: updated });
    }

    // ============ ADD EXTRA CATEGORY ============
    // Un jugador YA inscrito se apunta a una categoría adicional (ej: Fútbol Sala).
    // Reutiliza su ficha: solo añade la categoría a categorias[] y crea las cuotas.
    if (action === 'add_extra_category') {
      if (!playerId) return Response.json({ error: 'Falta playerId' }, { status: 400 });
      const { categoria } = body;
      if (!categoria) return Response.json({ error: 'Falta categoria' }, { status: 400 });

      const player = await verifyOwnership(playerId);

      // Verificar que la categoría está marcada como disponible como extra
      const configs = await base44.asServiceRole.entities.CategoryConfig.filter({
        nombre: categoria,
        disponible_como_extra: true,
      });
      if (!configs || configs.length === 0) {
        return Response.json({ error: 'Esta categoría no está disponible como actividad extra' }, { status: 400 });
      }

      const norm = (s) => (s == null ? '' : String(s).trim().toLowerCase());
      const existing = Array.isArray(player.categorias) ? player.categorias : [];
      const yaTiene =
        existing.some((c) => norm(c) === norm(categoria)) ||
        norm(player.categoria_principal) === norm(categoria) ||
        norm(player.deporte) === norm(categoria);

      let updated = player;
      if (!yaTiene) {
        updated = await base44.asServiceRole.entities.Player.update(playerId, {
          categorias: [...existing, categoria],
        });
      }

      const createdPayments = [];
      if (Array.isArray(payments) && payments.length > 0) {
        for (const p of payments) {
          const created = await base44.asServiceRole.entities.Payment.create({
            ...p,
            categoria_actividad: categoria,
            jugador_id: updated.id,
            jugador_nombre: updated.nombre,
          });
          createdPayments.push(created);
        }
      }

      // Avisar a los administradores
      if (!yaTiene) {
        const total = createdPayments.reduce((s, p) => s + (Number(p.cantidad) || 0), 0);
        const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
        for (const a of admins) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: a.email,
            subject: `Nueva actividad extra: ${updated.nombre} → ${categoria}`,
            body: `<p><strong>${updated.nombre}</strong> se ha apuntado a <strong>${categoria}</strong> desde su perfil.</p>
<p>Pagos creados: ${createdPayments.length} (total ${total}€, con descuento de socio).</p>
<p>Pendiente por parte del club: revisar pagos, tramitar la licencia federativa si hace falta y asignar dorsal.</p>`,
          }).catch((e) => console.error('[add_extra_category] email admin', a.email, e?.message));
        }
      }

      return Response.json({ success: true, player: updated, payments: createdPayments });
    }

    // ============ UPDATE FIELDS ============
    // Un padre/tutor (incluido el segundo progenitor) edita los datos de la ficha.
    // Se hace con service role porque la RLS de Player no permite editar al tutor 2.
    // NO se permite tocar campos sensibles de estado/renovación desde aquí.
    if (action === 'update_fields') {
      if (!playerId) return Response.json({ error: 'Falta playerId' }, { status: 400 });
      if (!playerData) return Response.json({ error: 'Falta playerData' }, { status: 400 });
      const player = await verifyOwnership(playerId);

      // Campos protegidos que un padre NO puede modificar por esta vía
      const PROTECTED = [
        'estado_renovacion', 'activo', 'temporada_renovacion', 'fecha_renovacion',
        'tiene_descuento_hermano', 'descuento_aplicado', 'exento_bloqueo_impago',
        'motivo_exencion_bloqueo', 'ajuste_cuota', 'email_padre',
      ];
      const safeData = { ...playerData };
      for (const key of PROTECTED) delete safeData[key];

      const updated = await base44.asServiceRole.entities.Player.update(playerId, safeData);
      return Response.json({ success: true, player: updated });
    }

    // ============ CREATE WITH PAYMENTS ============
    if (action === 'create_with_payments') {
      if (!playerData) return Response.json({ error: 'Falta playerData' }, { status: 400 });

      // ---- Pago por adelantado (opcional): si llega prepago_id, la plaza ya está reservada y pagada ----
      let prepago = null;
      if (body.prepago_id) {
        const key = (t) => String(t || '').trim().replace(/\//g, '-');
        prepago = await base44.asServiceRole.entities.PrepagoInscripcion.get(body.prepago_id);
        if (!prepago || prepago.user_email !== user.email) {
          return Response.json({ success: false, error: 'No se encontró el pago por adelantado de esta inscripción.' }, { status: 409 });
        }
        if (prepago.estado !== 'Pagado') {
          return Response.json({ success: false, error: prepago.estado === 'Consumido' ? 'Este pago por adelantado ya se usó en otra inscripción.' : 'El pago por adelantado todavía no está confirmado.' }, { status: 409 });
        }
        if (
          prepago.categoria !== playerData.deporte ||
          String(prepago.fecha_nacimiento || '').slice(0, 10) !== String(playerData.fecha_nacimiento || '').slice(0, 10) ||
          (temporada && key(prepago.temporada) !== key(temporada))
        ) {
          return Response.json({ success: false, error: 'El pago por adelantado no corresponde a la categoría o a la fecha de nacimiento de este jugador.' }, { status: 409 });
        }
        // Reservar el prepago antes de crear al jugador (evita usarlo dos veces)
        await base44.asServiceRole.entities.PrepagoInscripcion.update(prepago.id, { estado: 'Consumido', fecha_consumo: new Date().toISOString() });
      } else {
        // 💳 Categoría con pago por adelantado ACTIVO: sin prepago no se puede crear la inscripción (refuerzo de seguridad)
        if (await exigePagoAdelantado(playerData.deporte)) {
          return Response.json({ success: false, error: 'Esta categoría requiere pago por adelantado. Inicia de nuevo la inscripción y completa el pago primero.' }, { status: 409 });
        }
        const bloqueo = await comprobarCupo(playerData.deporte);
        if (bloqueo) return Response.json({ success: false, error: bloqueo }, { status: 409 });
      }

      // Forzar email_padre = email del usuario autenticado (no se acepta arbitrario)
      const safePlayerData = {
        ...playerData,
        email_padre: user.email,
      };

      let newPlayer;
      try {
        newPlayer = await base44.asServiceRole.entities.Player.create(safePlayerData);
      } catch (e) {
        if (prepago) {
          try { await base44.asServiceRole.entities.PrepagoInscripcion.update(prepago.id, { estado: 'Pagado' }); } catch (_) { /* sin acción */ }
        }
        throw e;
      }

      const createdPayments = [];
      if (prepago) {
        // Pagos generados desde el prepago (mismos campos que InscriptionPaymentFlow). El primer pago se crea
        // Pendiente y se pasa a Pagado, igual que hace el webhook de Stripe con una cuota normal.
        await base44.asServiceRole.entities.PrepagoInscripcion.update(prepago.id, { jugador_id: newPlayer.id });
        const hoy = new Date().toISOString().slice(0, 10);
        const notaPago = prepago.es_prueba === true ? '🧪 PRUEBA (sin cobro real)' : 'Pagado con tarjeta (Stripe) · pago por adelantado';
        for (const pg of prepago.pagos || []) {
          const pagadoYa = pg.estado_inicial === 'Pagado';
          const aport = Number(pg.aportacion_solidaria) || 0;
          const notas = [
            pagadoYa ? notaPago : null,
            pagadoYa && Number(prepago.descuento_hermano) > 0 ? `Descuento hermano: -${prepago.descuento_hermano}€` : null,
            aport > 0 ? `Incluye ${aport}€ Fondo Solidario` : null,
          ].filter(Boolean).join(' | ');
          const created = await base44.asServiceRole.entities.Payment.create({
            tipo_pago: prepago.tipo_pago,
            mes: pg.mes,
            temporada: prepago.temporada,
            cantidad: pg.cantidad,
            estado: 'Pendiente',
            metodo_pago: 'Transferencia',
            notas,
            aportacion_solidaria: aport,
            aportacion_solidaria_total: Number(prepago.aportacion_solidaria_total) || 0,
            categoria_actividad: playerData?.categoria_principal || playerData?.deporte,
            jugador_id: newPlayer.id,
            jugador_nombre: newPlayer.nombre,
          });
          if (pagadoYa) {
            const pagado = await base44.asServiceRole.entities.Payment.update(created.id, { estado: 'Pagado', fecha_pago: hoy });
            createdPayments.push(pagado || { ...created, estado: 'Pagado', fecha_pago: hoy });
          } else {
            createdPayments.push(created);
          }
        }
      } else if (Array.isArray(payments) && payments.length > 0) {
        for (const p of payments) {
          const created = await base44.asServiceRole.entities.Payment.create({
            ...p,
            categoria_actividad: p.categoria_actividad || playerData?.categoria_principal || playerData?.deporte,
            jugador_id: newPlayer.id,
            jugador_nombre: newPlayer.nombre,
          });
          createdPayments.push(created);
        }
      }

      return Response.json({ success: true, player: newPlayer, payments: createdPayments });
    }

    return Response.json({ error: `Acción no soportada: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[playerRenewalAction] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
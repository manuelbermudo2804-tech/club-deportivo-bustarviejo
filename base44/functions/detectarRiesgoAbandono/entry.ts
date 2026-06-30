import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Detector de riesgo de abandono — SIN IA, solo cálculo matemático (0 créditos).
// Señales: caída de asistencias, impagos/cuotas vencidas, lesión o sanción larga.
// Puntuación 0-100. Visible para admin y coordinadores.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const esAutorizado = user.role === 'admin' || user.es_coordinador === true;
    if (!esAutorizado) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const svc = base44.asServiceRole;

    const [players, attendances, payments] = await Promise.all([
      svc.entities.Player.filter({ activo: true }, '-created_date', 2000),
      svc.entities.Attendance.list('-fecha', 3000),
      svc.entities.Payment.list('-created_date', 5000),
    ]);

    const ahora = Date.now();
    const dia = 24 * 60 * 60 * 1000;

    // ---- ASISTENCIAS: separar sesiones recientes (últimos 30 días) del histórico previo ----
    // Por cada jugador: media histórica vs media reciente.
    const recientePorJugador = {}; // id -> {presente, total}
    const historicoPorJugador = {}; // id -> {presente, total}

    for (const sesion of attendances) {
      const fechaMs = new Date(sesion.fecha).getTime();
      if (isNaN(fechaMs)) continue;
      const esReciente = ahora - fechaMs <= 30 * dia;
      const lista = sesion.asistencias || [];
      for (const a of lista) {
        if (!a.jugador_id) continue;
        const presente = a.estado === 'presente' || a.estado === 'tardanza' ? 1 : 0;
        const bucket = esReciente ? recientePorJugador : historicoPorJugador;
        if (!bucket[a.jugador_id]) bucket[a.jugador_id] = { presente: 0, total: 0 };
        bucket[a.jugador_id].presente += presente;
        bucket[a.jugador_id].total += 1;
      }
    }

    // ---- IMPAGOS: pagos pendientes vencidos por jugador ----
    const impagosPorJugador = {}; // id -> {vencidos, importe}
    for (const pay of payments) {
      if (pay.is_deleted) continue;
      if (pay.estado !== 'Pendiente') continue;
      const creado = new Date(pay.created_date).getTime();
      const vencido = !isNaN(creado) && ahora - creado > 30 * dia;
      const id = pay.jugador_id;
      if (!id) continue;
      if (!impagosPorJugador[id]) impagosPorJugador[id] = { vencidos: 0, importe: 0 };
      if (vencido) {
        impagosPorJugador[id].vencidos += 1;
        impagosPorJugador[id].importe += (pay.cantidad || 0);
      }
    }

    const resultados = [];

    for (const p of players) {
      let riesgo = 0;
      const motivos = [];

      // --- Señal 1: caída de asistencias (peso máximo) ---
      const rec = recientePorJugador[p.id];
      const hist = historicoPorJugador[p.id];
      let asistenciaReciente = null;
      if (rec && rec.total >= 2) {
        asistenciaReciente = Math.round((rec.presente / rec.total) * 100);
        const mediaHist = hist && hist.total >= 3 ? (hist.presente / hist.total) * 100 : null;

        if (asistenciaReciente < 40) {
          riesgo += 45;
          motivos.push(`Asistencia muy baja últimas semanas (${asistenciaReciente}%)`);
        } else if (asistenciaReciente < 60) {
          riesgo += 25;
          motivos.push(`Asistencia floja últimas semanas (${asistenciaReciente}%)`);
        }
        // Caída relativa respecto a su histórico
        if (mediaHist !== null && mediaHist - asistenciaReciente >= 30) {
          riesgo += 20;
          motivos.push(`Caída fuerte: del ${Math.round(mediaHist)}% al ${asistenciaReciente}%`);
        }
      } else if (hist && hist.total >= 3 && (!rec || rec.total === 0)) {
        // Antes entrenaba y ahora no aparece en absoluto
        riesgo += 35;
        motivos.push('Ha dejado de aparecer a los entrenamientos');
      }

      // --- Señal 2: impagos / cuotas vencidas ---
      const imp = impagosPorJugador[p.id];
      if (imp && imp.vencidos > 0) {
        riesgo += imp.vencidos >= 2 ? 30 : 18;
        motivos.push(`${imp.vencidos} cuota(s) vencida(s) (${Math.round(imp.importe)}€)`);
      }

      // --- Señal 3: lesión o sanción larga ---
      if (p.lesionado || p.sancionado) {
        let larga = false;
        if (p.fecha_disponibilidad) {
          const disp = new Date(p.fecha_disponibilidad).getTime();
          larga = !isNaN(disp) && disp - ahora > 30 * dia;
        }
        riesgo += larga ? 20 : 10;
        const tipo = p.lesionado ? 'Lesionado' : 'Sancionado';
        motivos.push(larga ? `${tipo} (baja larga)` : tipo);
      }

      if (riesgo <= 0) continue;
      const total = Math.min(100, riesgo);
      const nivel = total >= 60 ? 'alto' : total >= 30 ? 'medio' : 'bajo';

      resultados.push({
        jugador_id: p.id,
        nombre: p.nombre,
        foto_url: p.foto_url || null,
        categoria: p.categoria_principal || p.deporte || '',
        email_padre: p.email_padre || '',
        telefono: p.telefono || '',
        asistencia_reciente: asistenciaReciente,
        riesgo: total,
        nivel,
        motivos,
      });
    }

    resultados.sort((a, b) => b.riesgo - a.riesgo);

    return Response.json({
      jugadores: resultados,
      meta: {
        analizados: players.length,
        en_riesgo: resultados.length,
        alto: resultados.filter((r) => r.nivel === 'alto').length,
        medio: resultados.filter((r) => r.nivel === 'medio').length,
        generado: new Date().toISOString(),
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
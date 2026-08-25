import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Apoyo técnico menor de edad ("entrenador en prácticas").
// El menor NO puede leer jugadores ni asistencias con su propio token (RLS),
// así que esta función valida sus permisos y hace el trabajo con service role,
// devolviendo SOLO datos deportivos (nombre, foto) — nunca datos personales,
// médicos ni económicos.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'roster';

    const players = await base44.asServiceRole.entities.Player.filter({
      acceso_menor_email: user.email,
      activo: true,
    });
    const me = players[0];
    const permisos = me?.entrenador_practicas || {};
    const categoria = permisos.categoria;

    if (!me || permisos.activo !== true || !categoria) {
      return Response.json({ error: 'Sin permisos de apoyo técnico' }, { status: 403 });
    }

    if (action === 'roster' && permisos.asistencia !== true && permisos.crear_convocatorias !== true) {
      return Response.json({ error: 'Sin permiso' }, { status: 403 });
    }
    const needsAttendance = ['getAttendance', 'saveAttendance'].includes(action);
    if (needsAttendance && permisos.asistencia !== true) {
      return Response.json({ error: 'Sin permiso de asistencia' }, { status: 403 });
    }
    if (action === 'createCallup' && permisos.crear_convocatorias !== true) {
      return Response.json({ error: 'Sin permiso para crear convocatorias' }, { status: 403 });
    }

    const all = await base44.asServiceRole.entities.Player.filter({ activo: true });
    const roster = all
      .filter((p) => {
        const cats = p.categorias || [];
        return cats.includes(categoria) || p.categoria_principal === categoria || p.deporte === categoria;
      })
      .map((p) => ({ id: p.id, nombre: p.nombre, foto_url: p.foto_url || null }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));

    if (action === 'roster') {
      return Response.json({ categoria, roster });
    }

    if (action === 'createCallup') {
      const c = body.convocatoria || {};
      if (!c.titulo || !c.fecha_partido || !c.hora_partido || !c.ubicacion) {
        return Response.json({ error: 'Faltan datos de la convocatoria' }, { status: 400 });
      }
      const ids = new Set(c.jugadores_ids || []);
      const convocados = roster
        .filter((p) => ids.has(p.id))
        .map((p) => ({ jugador_id: p.id, jugador_nombre: p.nombre, confirmacion: 'pendiente' }));
      const saved = await base44.asServiceRole.entities.Convocatoria.create({
        titulo: c.titulo,
        categoria,
        tipo: c.tipo || 'Partido',
        rival: c.rival || '',
        fecha_partido: c.fecha_partido,
        hora_partido: c.hora_partido,
        hora_concentracion: c.hora_concentracion || '',
        ubicacion: c.ubicacion,
        descripcion: c.descripcion || '',
        jugadores_convocados: convocados,
        entrenador_email: user.email,
        entrenador_nombre: user.full_name,
        publicada: false,
      });
      return Response.json({ ok: true, convocatoria: saved });
    }

    const fecha = body.fecha;
    if (!fecha) return Response.json({ error: 'Falta la fecha' }, { status: 400 });

    const sesiones = await base44.asServiceRole.entities.Attendance.filter({ categoria, fecha });
    const existing = sesiones[0] || null;

    if (action === 'getAttendance') {
      return Response.json({
        categoria,
        roster,
        sesion: existing,
        puedeValorar: permisos.evaluaciones === true,
      });
    }

    if (action === 'saveAttendance') {
      const estados = body.estados || {};
      const valoraciones = permisos.evaluaciones === true ? (body.valoraciones || {}) : {};
      const asistencias = roster.map((p) => {
        const v = valoraciones[p.id] || {};
        const prev = (existing?.asistencias || []).find((a) => a.jugador_id === p.id) || {};
        return {
          jugador_id: p.id,
          jugador_nombre: p.nombre,
          estado: estados[p.id] || 'ausente',
          actitud: v.actitud ?? prev.actitud,
          observaciones: v.observaciones ?? prev.observaciones,
        };
      });
      const data = {
        fecha,
        categoria,
        entrenador_email: user.email,
        entrenador_nombre: user.full_name,
        asistencias,
      };
      const saved = existing
        ? await base44.asServiceRole.entities.Attendance.update(existing.id, data)
        : await base44.asServiceRole.entities.Attendance.create(data);
      return Response.json({ ok: true, sesion: saved });
    }

    return Response.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
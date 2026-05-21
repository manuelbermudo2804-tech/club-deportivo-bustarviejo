import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Verifica si una familia/jugador tiene deudas pendientes de temporadas anteriores.
// Detecta por CUALQUIERA de estos campos:
//   1. Email del usuario (email_familia)
//   2. DNI del jugador (dni_jugador)
//   3. DNI del tutor (dni_tutor)
//   4. Nombre del jugador (jugador_nombre) — coincidencia exacta normalizada
//
// Payload (todos opcionales, pero se debe pasar al menos uno):
//   { email, dni_jugador, dni_tutor, jugador_nombre }
//
// Respuesta:
//   { deudas: [...], total: number, has_debt: boolean }

// Normaliza un string para comparación: quita tildes, espacios extra, pasa a minúsculas
function normalize(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quitar tildes
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const email = (body.email || user.email || '').toLowerCase().trim();
    const dniJugador = (body.dni_jugador || '').toUpperCase().trim();
    const dniTutor = (body.dni_tutor || '').toUpperCase().trim();
    const jugadorNombre = normalize(body.jugador_nombre || '');

    if (!email && !dniJugador && !dniTutor && !jugadorNombre) {
      return Response.json({ deudas: [], total: 0, has_debt: false });
    }

    // Buscar todas las deudas pendientes (servicio - ignorar RLS para detectar también por DNI/nombre)
    const allDebts = await base44.asServiceRole.entities.Deuda.filter({ estado: 'pendiente' });

    const deudas = (allDebts || []).filter(d => {
      const dEmail = (d.email_familia || '').toLowerCase().trim();
      const dDniJug = (d.dni_jugador || '').toUpperCase().trim();
      const dDniTut = (d.dni_tutor || '').toUpperCase().trim();
      const dNombre = normalize(d.jugador_nombre || '');

      return (email && dEmail === email) ||
             (dniJugador && dDniJug && dDniJug === dniJugador) ||
             (dniTutor && dDniTut && dDniTut === dniTutor) ||
             (jugadorNombre && dNombre && dNombre === jugadorNombre);
    });

    const total = deudas.reduce((sum, d) => sum + (Number(d.importe) || 0), 0);

    return Response.json({
      deudas,
      total: Math.round(total * 100) / 100,
      has_debt: deudas.length > 0,
    });
  } catch (error) {
    console.error('checkPendingDebts error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
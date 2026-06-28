import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Endpoint público: confirma y cierra la re-edición del bracket de un participante.
// Una vez llamado, el bracket queda bloqueado definitivamente (bracket_reeditado=true).
// Body: { token: string }
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { token } = body;

    if (!token || typeof token !== 'string' || !/^[A-Za-z0-9]{32}$/.test(token)) {
      return Response.json({ error: 'Token no válido' }, { status: 400 });
    }

    const parts = await base44.asServiceRole.entities.PorraParticipante.filter({ token_acceso: token });
    const participante = parts[0];
    if (!participante) {
      return Response.json({ error: 'Porra no encontrada' }, { status: 404 });
    }

    if (participante.bracket_reeditado) {
      return Response.json({ error: 'El bracket ya está confirmado y cerrado' }, { status: 403 });
    }

    // 🔒 Tope de cierre del bracket: 28 jun 2026 17:00 UTC (= 19:00 Europe/Madrid CEST).
    // Pasada esa hora nadie puede confirmar ni cerrar el bracket: queda congelado tal cual.
    const BRACKET_DEADLINE_MS = Date.UTC(2026, 5, 28, 17, 0, 0);
    if (Date.now() > BRACKET_DEADLINE_MS) {
      if (!participante.bloqueada) {
        try {
          await base44.asServiceRole.entities.PorraParticipante.update(participante.id, {
            bloqueada: true,
            fecha_bloqueo: new Date().toISOString(),
          });
        } catch {}
      }
      return Response.json({ error: 'Fecha límite del bracket superada (19:00) — porra bloqueada' }, { status: 403 });
    }

    await base44.asServiceRole.entities.PorraParticipante.update(participante.id, {
      bracket_reeditado: true,
      fecha_bracket_reeditado: new Date().toISOString(),
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
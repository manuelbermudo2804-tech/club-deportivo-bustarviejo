import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Endpoint público: devuelve las mini-ligas asociadas a un participante por token.
// Reemplaza el acceso directo a base44.entities.PorraLiga (que falla sin auth).
Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const token = body.token;
    if (!token || !/^[A-Za-z0-9]{32}$/.test(token)) {
      return Response.json({ error: 'Token no válido' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const parts = await base44.asServiceRole.entities.PorraParticipante.filter({ token_acceso: token });
    const p = parts[0];
    if (!p) return Response.json({ error: 'Participante no encontrado' }, { status: 404 });

    const codigos = p.mini_liga_codigos || [];
    if (codigos.length === 0) return Response.json({ ligas: [] });

    const resultados = await Promise.all(
      codigos.map(c => base44.asServiceRole.entities.PorraLiga.filter({ codigo: c }).catch(() => []))
    );
    const planas = resultados.flat().filter(Boolean);
    const vistos = new Set();
    const unicas = [];
    planas.forEach(l => {
      if (l?.id && !vistos.has(l.id)) {
        vistos.add(l.id);
        unicas.push({
          id: l.id,
          nombre: l.nombre,
          codigo: l.codigo,
          descripcion: l.descripcion,
          participantes_emails: l.participantes_emails || [],
        });
      }
    });
    return Response.json({ ligas: unicas });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
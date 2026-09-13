import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const mode = body?.mode || 'two-creates';

    if (mode === 'two-creates') {
      const a = await base44.asServiceRole.entities.ContenidoClub.create({ tipo: 'foto', archivo_url: 'https://example.com/a.png', equipo: 'Fútbol Cadete', autor_nombre: 'tmp1', estado: 'pendiente' });
      console.log('create 1 ok', a?.id);
      const b = await base44.asServiceRole.entities.ContenidoClub.create({ tipo: 'foto', archivo_url: 'https://example.com/b.png', equipo: 'Fútbol Cadete', autor_nombre: 'tmp2', estado: 'pendiente' });
      console.log('create 2 ok', b?.id);
      await base44.asServiceRole.entities.ContenidoClub.delete(a.id);
      await base44.asServiceRole.entities.ContenidoClub.delete(b.id);
      return Response.json({ ok: true, mode });
    }

    if (mode === 'create-then-upload') {
      const a = await base44.asServiceRole.entities.ContenidoClub.create({ tipo: 'foto', archivo_url: 'pending', equipo: 'Fútbol Cadete', autor_nombre: 'tmp3', estado: 'pendiente' });
      console.log('create ok', a?.id);
      const file = new File([new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' })], 'a.png', { type: 'image/png' });
      const up = await base44.asServiceRole.integrations.Core.UploadFile({ file });
      console.log('upload ok', !!up?.file_url);
      await base44.asServiceRole.entities.ContenidoClub.update(a.id, { archivo_url: up.file_url });
      console.log('update ok');
      await base44.asServiceRole.entities.ContenidoClub.delete(a.id);
      return Response.json({ ok: true, mode });
    }

    return Response.json({ error: 'unknown mode' }, { status: 400 });
  } catch (e) {
    console.error('tmp error', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
});
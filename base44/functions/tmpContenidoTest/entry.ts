import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const doUpload = new URL(req.url).searchParams.get('upload') === '1';
    let url = 'https://example.com/a.png';
    if (doUpload) {
      const file = new File([new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' })], 'a.png', { type: 'image/png' });
      const up = await base44.asServiceRole.integrations.Core.UploadFile({ file });
      url = up?.file_url || url;
      console.log('upload ok');
    }
    const rec = await base44.asServiceRole.entities.ContenidoClub.create({
      tipo: 'foto', archivo_url: url, equipo: 'Fútbol Cadete', autor_nombre: 'tmp test', estado: 'pendiente',
    });
    console.log('created', rec?.id);
    await base44.asServiceRole.entities.ContenidoClub.delete(rec.id);
    return Response.json({ ok: true, id: rec?.id, doUpload });
  } catch (e) {
    console.error('tmp error', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { Image } from 'https://deno.land/x/imagescript@1.3.0/mod.ts';

/**
 * Sube una HISTORIA diaria a Instagram con los décimos que quedan en TuLotero
 * y los días que faltan para el cierre de la venta. No toca el feed.
 * Body opcional: { preview: true } → solo genera la imagen y devuelve su URL.
 */
const W = 1080;
const H = 1920;
const FONT_URL = 'https://raw.githubusercontent.com/google/fonts/main/ofl/anton/Anton-Regular.ttf';
const LOGO_URL = 'https://media.base44.com/images/public/6992c6be619d2da592897991/5d59cb383_fc5d50e49_ChatGPTImage18dic202513_39_39.png';

const centrado = (img, font, scale, text, color, y) => {
  const t = Image.renderText(font, scale, text, color);
  img.composite(t, Math.round((W - t.width) / 2), y);
  return y + t.height;
};

async function generarImagen({ restantes, dias, numero, precio }) {
  const font = new Uint8Array(await (await fetch(FONT_URL, { signal: AbortSignal.timeout(15000) })).arrayBuffer());
  console.log('fuente descargada', font.length);
  const img = new Image(W, H);
  // Degradado vertical rojo navidad → granate oscuro
  const from = [200, 30, 30], to = [60, 6, 12];
  for (let y = 0; y < H; y += 8) {
    const k = y / H;
    const c = from.map((v, i) => Math.round(v + (to[i] - v) * k));
    img.drawBox(1, y + 1, W, 8, Image.rgbaToColor(c[0], c[1], c[2], 255));
  }
  // Marco dorado
  const oro = 0xfbbf24ff;
  img.drawBox(40, 40, W - 80, 10, oro);
  img.drawBox(40, H - 50, W - 80, 10, oro);
  img.drawBox(40, 40, 10, H - 80, oro);
  img.drawBox(W - 50, 40, 10, H - 80, oro);

  let y = 150;
  try {
    const logo = await Image.decode(new Uint8Array(await (await fetch(LOGO_URL, { signal: AbortSignal.timeout(15000) })).arrayBuffer()));
    logo.resize(220, Image.RESIZE_AUTO);
    img.composite(logo, Math.round((W - logo.width) / 2), y);
    y += logo.height + 20;
  } catch (_) { y += 40; }

  const blanco = 0xffffffff;
  y = centrado(img, font, 80, 'LOTERÍA DE NAVIDAD', oro, y) - 15;
  y = centrado(img, font, 52, 'CD BUSTARVIEJO', blanco, y) - 5;
  if (numero) y = centrado(img, font, 64, `Nº ${numero}`, blanco, y) + 10;

  if (restantes != null) {
    y = centrado(img, font, 64, 'QUEDAN', blanco, y) - 40;
    y = centrado(img, font, 260, String(restantes), oro, y) - 90;
    y = centrado(img, font, 72, restantes === 1 ? 'DÉCIMO' : 'DÉCIMOS', blanco, y) + 10;
  } else {
    y = centrado(img, font, 100, '¡CONSIGUE', blanco, y) - 20;
    y = centrado(img, font, 100, 'TU DÉCIMO!', oro, y) + 20;
  }

  const textoDias = dias <= 1 ? '¡ÚLTIMO DÍA DE VENTA!' : `FALTAN ${dias} DÍAS`;
  y = centrado(img, font, 84, textoDias, oro, y) - 10;
  if (precio) centrado(img, font, 52, `${precio} € el décimo`, blanco, y);

  centrado(img, font, 44, 'Compra en el enlace de la bio', blanco, H - 290);
  centrado(img, font, 48, 'app.cdbustarviejo.com/loteria', oro, H - 220);

  console.log('imagen compuesta');
  return await img.encodeJPEG(88);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const { preview } = await req.json().catch(() => ({}));

    const campanas = await base44.asServiceRole.entities.LoteriaCampana.list();
    const campana = campanas?.[0];
    if (!campana || campana.activa === false) return Response.json({ skipped: 'Sin campaña activa' });
    const cierre = campana.fecha_cierre ? new Date(campana.fecha_cierre).getTime() : null;
    if (cierre && cierre <= Date.now()) return Response.json({ skipped: 'Venta cerrada' });

    // Décimos que quedan en TuLotero
    let restantes = null;
    try {
      const codigo = (campana.tulotero_url || 'cdb26').split('/').filter(Boolean).pop();
      const r = await fetch(`https://web-backend.es.tulotero.net/tuloteroweb/rest/loteriaEmpresas/${codigo}`, {
        headers: { Accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(10000),
      });
      if (r.ok) restantes = (await r.json())?.penyas?.[0]?.participacionesRestantes ?? null;
    } catch (_) { /* sin dato: la imagen se genera sin número */ }
    if (restantes === 0) return Response.json({ skipped: 'Agotado' });

    const dias = cierre ? Math.max(1, Math.ceil((cierre - Date.now()) / 86400000)) : null;
    const jpg = await generarImagen({ restantes, dias: dias ?? 99, numero: campana.numero, precio: campana.precio_decimo });
    const { file_url } = await base44.asServiceRole.integrations.Core.UploadPublicFile({
      file: new File([jpg], `historia-loteria-${Date.now()}.jpg`, { type: 'image/jpeg' }),
    });
    if (preview) return Response.json({ preview: true, image_url: file_url, restantes, dias });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('instagram');
    const me = await (await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`, { signal: AbortSignal.timeout(10000) })).json();
    if (!me?.id) return Response.json({ success: false, error: me?.error?.message || 'No se pudo leer la cuenta' }, { status: 400 });

    const created = await (await fetch(`https://graph.instagram.com/v21.0/${me.id}/media`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: file_url, media_type: 'STORIES', access_token: accessToken }),
      signal: AbortSignal.timeout(20000),
    })).json();
    if (!created?.id) return Response.json({ success: false, error: created?.error?.message || 'Instagram rechazó la imagen' }, { status: 400 });

    let status = '';
    for (let i = 0; i < 12 && status !== 'FINISHED'; i++) {
      await new Promise((r) => setTimeout(r, 2500));
      const st = await (await fetch(`https://graph.instagram.com/v21.0/${created.id}?fields=status_code&access_token=${accessToken}`, { signal: AbortSignal.timeout(10000) })).json();
      status = st?.status_code || '';
      if (status === 'ERROR' || status === 'EXPIRED') return Response.json({ success: false, error: 'Instagram no pudo procesar la imagen' }, { status: 400 });
    }
    if (status !== 'FINISHED') return Response.json({ success: false, error: 'Instagram tardó demasiado' }, { status: 400 });

    const published = await (await fetch(`https://graph.instagram.com/v21.0/${me.id}/media_publish`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: created.id, access_token: accessToken }),
      signal: AbortSignal.timeout(20000),
    })).json();
    if (!published?.id) return Response.json({ success: false, error: published?.error?.message || 'No se pudo publicar' }, { status: 400 });

    return Response.json({ success: true, story_id: published.id, restantes, dias, image_url: file_url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
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
const CARTEL_URL = 'https://base44.app/api/apps/6992c6be619d2da592897991/files/mp/public/6992c6be619d2da592897991/3a5225da2_cartel-loteria-2026.png';

const centrado = (img, font, scale, text, color, y) => {
  const t = Image.renderText(font, scale, text, color);
  img.composite(t, Math.round((W - t.width) / 2), y);
  return y + t.height;
};

async function generarImagen({ restantes, dias }) {
  const [fontBuf, cartelBuf] = await Promise.all([
    fetch(FONT_URL, { signal: AbortSignal.timeout(15000) }).then((r) => r.arrayBuffer()),
    fetch(CARTEL_URL, { signal: AbortSignal.timeout(15000) }).then((r) => r.arrayBuffer()),
  ]);
  const font = new Uint8Array(fontBuf);
  const img = new Image(W, H);
  // Fondo azul noche uniforme. Evita cientos de operaciones de dibujo
  // que ralentizaban la generación de la historia en el arranque del servicio.
  img.drawBox(1, 1, W, H, Image.rgbaToColor(8, 20, 52, 255));

  // Cartel del club a todo el ancho (3:4 → 1080×1440)
  const cartel = await Image.decode(new Uint8Array(cartelBuf));
  cartel.resize(W, Image.RESIZE_AUTO);
  const top = 90;
  img.composite(cartel, 0, top);
  const oro = 0xfbbf24ff;
  img.drawBox(1, top + cartel.height + 1, W, 8, oro);

  // Bloque con el dato del día
  const blanco = 0xffffffff;
  let y = top + cartel.height + 30;
  const principal = restantes != null
    ? `QUEDAN ${restantes} ${restantes === 1 ? 'DÉCIMO' : 'DÉCIMOS'}`
    : '¡CONSIGUE TU DÉCIMO!';
  y = centrado(img, font, 96, principal, oro, y) - 10;
  const textoDias = dias <= 1 ? '¡ÚLTIMO DÍA DE VENTA!' : `FALTAN ${dias} DÍAS · ENLACE EN LA BIO`;
  centrado(img, font, 54, textoDias, blanco, y);

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
    const jpg = await generarImagen({ restantes, dias: dias ?? 99 });
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
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function sha256Hex(buffer) {
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  const bytes = Array.from(new Uint8Array(hash));
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const payload = await req.json().catch(() => ({}));
    const onlyActive = payload?.onlyActive !== false;
    const filters = [];
    if (payload?.categoria) filters.push({ categoria: payload.categoria });
    if (payload?.tipo) filters.push({ tipo: payload.tipo });
    if (onlyActive) filters.push({ activo: true });

    let assets = [];
    if (payload?.ids && Array.isArray(payload.ids) && payload.ids.length) {
      // fetch individually
      const all = await base44.entities.CompetitionAsset.list('-updated_date', 1000);
      const setIds = new Set(payload.ids);
      assets = all.filter(a => setIds.has(a.id));
    } else if (filters.length) {
      const query = filters.length === 1 ? filters[0] : { $and: filters };
      assets = await base44.entities.CompetitionAsset.filter(query, '-updated_date', 1000);
    } else {
      assets = await base44.entities.CompetitionAsset.list('-updated_date', 1000);
    }

    const results = [];
    const nowIso = new Date().toISOString();

    await Promise.allSettled(assets.map(async (asset) => {
      let etag = null, lastModified = null, statusCode = 0, bytes = null, hashHex = null;
      try {
        // Try HEAD first
        const headRes = await fetch(asset.url, { method: 'HEAD' });
        statusCode = headRes.status;
        etag = headRes.headers.get('etag');
        lastModified = headRes.headers.get('last-modified');
        const cl = headRes.headers.get('content-length');
        bytes = cl ? Number(cl) : null;

        if ((!etag && !lastModified) || !headRes.ok) {
          // Fallback to GET to compute hash and size
          const getRes = await fetch(asset.url, { method: 'GET' });
          statusCode = getRes.status;
          const buf = await getRes.arrayBuffer();
          bytes = buf.byteLength;
          hashHex = await sha256Hex(buf);
          etag = getRes.headers.get('etag') || etag;
          lastModified = getRes.headers.get('last-modified') || lastModified;
        }

        let changed = false;
        if (asset.last_etag && etag && asset.last_etag !== etag) changed = true;
        else if (asset.last_modified && lastModified && asset.last_modified !== lastModified) changed = true;
        else if (asset.last_hash && hashHex && asset.last_hash !== hashHex) changed = true;
        else if (!asset.last_etag && !asset.last_modified && !asset.last_hash) changed = false; // primer check

        const newStatus = statusCode >= 200 && statusCode < 400 ? (changed ? 'cambiado' : (asset.status || 'igual')) : 'error';

        await base44.entities.CompetitionAsset.update(asset.id, {
          last_etag: etag || asset.last_etag || null,
          last_modified: lastModified || asset.last_modified || null,
          last_hash: hashHex || asset.last_hash || null,
          http_status: statusCode,
          bytes: bytes ?? asset.bytes ?? null,
          last_checked_at: nowIso,
          status: asset.status === 'nuevo' ? (newStatus === 'cambiado' ? 'cambiado' : 'igual') : newStatus,
        });

        results.push({ id: asset.id, url: asset.url, status: newStatus, http_status: statusCode });
      } catch (e) {
        try {
          await base44.entities.CompetitionAsset.update(asset.id, {
            last_checked_at: nowIso,
            status: 'error',
          });
        } catch (_) {}
        results.push({ id: asset.id, url: asset.url, status: 'error', error: String(e?.message || e) });
      }
    }));

    const summary = results.reduce((acc, r) => {
      if (r.status === 'cambiado') acc.changed++;
      else if (r.status === 'error') acc.errors++;
      else acc.same++;
      return acc;
    }, { changed: 0, same: 0, errors: 0, total: results.length });

    return Response.json({ summary, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
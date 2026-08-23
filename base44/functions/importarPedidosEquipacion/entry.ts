import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const SENDER = 'tiendas@aimarsport.com';

const norm = (s) => (s || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toUpperCase()
  .replace(/[^A-Z0-9 ]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const decodeB64 = (data) => {
  const bin = atob((data || '').replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder('utf-8').decode(bytes);
};

const htmlToText = (html) => html
  .replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')
  .trim();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const max = Math.min(body.max || 100, 400);

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
    const headers = { Authorization: `Bearer ${accessToken}` };

    // 1. Listar correos de pedidos (paginado)
    const ids = [];
    let pageToken = null;
    while (ids.length < max) {
      const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(`from:${SENDER} "Nuevo Pedido"`)}&maxResults=100${pageToken ? `&pageToken=${pageToken}` : ''}`;
      const page = await (await fetch(url, { headers })).json();
      (page.messages || []).forEach((m) => ids.push(m.id));
      pageToken = page.nextPageToken;
      if (!pageToken) break;
    }

    // 2. Descartar los ya importados
    const existing = await base44.asServiceRole.entities.PedidoEquipacion.list('-created_date', 1000);
    const known = new Set(existing.map((p) => p.gmail_message_id));
    const pending = ids.slice(0, max).filter((id) => !known.has(id));

    // 3. Jugadores activos para el emparejamiento
    const players = await base44.asServiceRole.entities.Player.filter({ activo: true });
    const index = players.map((p) => {
      const emails = [p.email_padre, p.email_tutor_2, p.email_jugador]
        .filter(Boolean).map((e) => e.toLowerCase().trim());
      const nameTokens = new Set([
        ...norm(p.nombre).split(' '),
        ...norm(p.nombre_tutor_legal).split(' '),
        ...norm(p.nombre_tutor_2).split(' '),
      ].filter((t) => t.length > 2));
      const words = norm(p.nombre).split(' ').filter(Boolean);
      const compact = words.slice(0, 2).join('');
      return { p, emails, nameTokens, compact };
    });

    const created = [];
    for (const id of pending) {
      const msg = await (await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`, { headers })).json();
      const hdrs = {};
      (msg.payload?.headers || []).forEach((h) => { hdrs[h.name] = h.value; });

      let html = '';
      const walk = (part) => {
        if (part.mimeType === 'text/html' && part.body?.data) html += decodeB64(part.body.data);
        (part.parts || []).forEach(walk);
      };
      walk(msg.payload || {});
      const text = htmlToText(html) || (msg.snippet || '');

      const clienteMatch = text.match(/cliente\s*:?\s*([^()]{3,80}?)\s*\(([^)\s]+@[^)\s]+)\)/i);
      const clienteNombre = clienteMatch ? clienteMatch[1].trim() : '';
      const clienteEmail = clienteMatch
        ? clienteMatch[2].toLowerCase().trim()
        : (text.match(/[\w.+-]+@[\w.-]+\.\w+/) || [''])[0].toLowerCase();

      const asunto = hdrs.Subject || '';
      const numero = (asunto.match(/#\s*(\d+)/) || [])[1] || '';
      const subjectCompact = norm(asunto).replace(/ /g, '');
      const clientTokens = norm(clienteNombre).split(' ').filter((t) => t.length > 2);

      // Cascada de identificación
      let metodo = 'sin_identificar';
      let matches = index.filter((e) => clienteEmail && e.emails.includes(clienteEmail));
      if (matches.length) metodo = 'email';

      if (!matches.length && subjectCompact) {
        matches = index.filter((e) => e.compact.length > 7 && subjectCompact.includes(e.compact));
        if (matches.length) metodo = 'asunto';
      }

      if (!matches.length && clientTokens.length) {
        matches = index.filter((e) => clientTokens.filter((t) => e.nameTokens.has(t)).length >= 2);
        if (matches.length) metodo = 'nombre';
      }

      const unico = matches.length === 1 ? matches[0].p : null;

      created.push({
        gmail_message_id: id,
        numero_pedido: numero,
        fecha_pedido: hdrs.Date ? new Date(hdrs.Date).toISOString() : null,
        asunto,
        cliente_nombre: clienteNombre,
        cliente_email: clienteEmail,
        jugador_id: unico ? unico.id : '',
        jugador_nombre: unico ? unico.nombre : '',
        metodo_match: unico ? metodo : 'sin_identificar',
        candidatos: matches.length > 1
          ? matches.map((m) => ({ jugador_id: m.p.id, jugador_nombre: m.p.nombre }))
          : [],
      });
    }

    for (let i = 0; i < created.length; i += 50) {
      await base44.asServiceRole.entities.PedidoEquipacion.bulkCreate(created.slice(i, i + 50));
    }

    return Response.json({
      total_correos: ids.length,
      nuevos: created.length,
      identificados: created.filter((c) => c.jugador_id).length,
      sin_identificar: created.filter((c) => !c.jugador_id).length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
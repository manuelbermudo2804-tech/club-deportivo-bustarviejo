import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { load } from 'npm:cheerio@1.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { url } = await req.json().catch(() => ({}));
    if (!url) return Response.json({ error: 'Missing url' }, { status: 400 });

    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const html = await resp.text();
    const $ = load(html);

    // Buscar tabla principal (cabeceras con "Jugador" y "Goles")
    let rows = [];
    $('table').each((_, table) => {
      const headers = $(table).find('th').map((_, th) => $(th).text().toLowerCase().trim()).get();
      const looksLike = headers.some(h => /gole(s|adores)/i.test(h)) || (headers.includes('jugador') && headers.some(h => h.includes('gol')));
      if (looksLike) {
        $(table).find('tbody tr').each((__, tr) => {
          const tds = $(tr).find('td');
          const texts = tds.map((___, td) => $(td).text().trim()).get();
          const nums = texts.map(t => Number((t.match(/\d+/)?.[0]) || NaN));
          const goalsIdx = texts.findIndex(t => /^\d+$/.test(t));
          const goles = goalsIdx >= 0 ? Number(texts[goalsIdx]) : (nums.find(n => !Number.isNaN(n)) ?? null);
          if (goles !== null) {
            // Heurística: primer texto es jugador, alguno contiene equipo
            const jugador = texts[0] || '';
            const equipo = texts.find((t, i) => i > 0 && !/^\d+$/.test(t)) || '';
            rows.push({ jugador_nombre: jugador, equipo, goles });
          }
        });
      }
    });

    // Fallback si no se encontró tabla (parseo por líneas)
    if (rows.length === 0) {
      const lines = $('body').text().split(/\n|\r/).map(l => l.trim()).filter(Boolean);
      for (const line of lines) {
        const m = line.match(/^([A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ\s\.'-]{3,})\s+-\s+([A-ZÁÉÍÓÚÜÑ0-9\s\.'-]{2,})\s+(\d{1,3})$/i);
        if (m) rows.push({ jugador_nombre: m[1].trim(), equipo: m[2].trim(), goles: Number(m[3]) });
      }
    }

    // Limpiar duplicados por jugador+equipo
    const seen = new Set();
    const players = rows.filter(r => {
      const key = `${r.jugador_nombre}__${r.equipo}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return r.jugador_nombre && r.equipo && Number.isFinite(r.goles);
    });

    return Response.json({ players });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
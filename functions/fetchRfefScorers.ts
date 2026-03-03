import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9'
      }
    });
    const html = await resp.text();
    const $ = load(html);

    let rows = [];

    // ── APPROACH 1: Standard HTML table with "Goles"/"Jugador" headers ──
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
            const jugador = texts[0] || '';
            const equipo = texts.find((t, i) => i > 0 && !/^\d+$/.test(t)) || '';
            rows.push({ jugador_nombre: jugador, equipo, goles });
          }
        });
      }
    });

    // ── APPROACH 2: RFFM multi-line format (same logic as PasteScorersForm) ──
    // The RFFM page often renders scorers as text blocks, not proper tables.
    // Pattern per scorer:
    //   APELLIDO, NOMBRE        (name - has comma)
    //   C.D. EQUIPO             (team - no comma, not a number)
    //   CADETE - INFANTIL...    (group/competition - skip)
    //   16                      (goals - bare number)
    //   (0P)                    (penalties - optional, skip)
    if (rows.length < 3) {
      const bodyText = $('body').text();
      const lines = bodyText.split(/\n|\r/).map(l => l.trim()).filter(Boolean);

      const isGoalsLine = (l) => /^\d{1,3}$/.test(l);
      const isPenaltyLine = (l) => /^\(\d+P\)$/i.test(l);
      const isNameLine = (l) => l.includes(',') && !isGoalsLine(l) && !isPenaltyLine(l) && l.length > 3 && l.length < 80;
      // Skip lines that look like position numbers (1, 2, 3...) at the start of blocks
      const isPositionLine = (l) => /^\d{1,3}º?\.?$/.test(l);

      // Find all name line indices
      const nameIndices = [];
      for (let i = 0; i < lines.length; i++) {
        if (isNameLine(lines[i])) nameIndices.push(i);
      }

      const parsedFromText = [];
      for (let k = 0; k < nameIndices.length; k++) {
        const ni = nameIndices[k];
        const nextNi = k + 1 < nameIndices.length ? nameIndices[k + 1] : Math.min(ni + 8, lines.length);
        const nombre = lines[ni];

        let equipo = "";
        let goles = 0;
        const blockLines = lines.slice(ni + 1, nextNi);

        let teamFound = false;
        for (const bl of blockLines) {
          if (isPositionLine(bl) || isPenaltyLine(bl)) continue;
          if (!teamFound && !isGoalsLine(bl)) {
            equipo = bl;
            teamFound = true;
            continue;
          }
          if (isGoalsLine(bl)) {
            goles = parseInt(bl, 10);
            break;
          }
        }

        if (nombre && equipo && goles > 0) {
          parsedFromText.push({ jugador_nombre: nombre.trim(), equipo: equipo.trim(), goles });
        }
      }

      // Use text-parsed results if we got more than from tables
      if (parsedFromText.length > rows.length) {
        rows = parsedFromText;
      }
    }

    // ── APPROACH 3: Fallback regex for "NOMBRE - EQUIPO  GOLES" format ──
    if (rows.length === 0) {
      const lines = $('body').text().split(/\n|\r/).map(l => l.trim()).filter(Boolean);
      for (const line of lines) {
        const m = line.match(/^([A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ\s\.'-]{3,})\s+-\s+([A-ZÁÉÍÓÚÜÑ0-9\s\.'-]{2,})\s+(\d{1,3})$/i);
        if (m) rows.push({ jugador_nombre: m[1].trim(), equipo: m[2].trim(), goles: Number(m[3]) });
      }
    }

    // Deduplicate by jugador+equipo
    const seen = new Set();
    const players = rows.filter(r => {
      const key = `${r.jugador_nombre}__${r.equipo}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return r.jugador_nombre && r.equipo && Number.isFinite(r.goles);
    });

    return Response.json({ players, debug: { totalRows: rows.length, uniquePlayers: players.length } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
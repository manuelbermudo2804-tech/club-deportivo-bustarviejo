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

    // Intentar encontrar filas de enfrentamientos (muchas webs usan tarjetas o filas con un guion "-")
    const pageText = $('body').text().replace(/\s+/g, ' ').trim();

    // Extraer posibles jornadas presentes
    const jornadasDetectadas = [];
    const jRe = /JORNADA\s*(\d+)/gi;
    let jm;
    while ((jm = jRe.exec(pageText)) !== null) {
      const num = Number(jm[1]);
      if (!Number.isNaN(num) && !jornadasDetectadas.includes(num)) jornadasDetectadas.push(num);
    }

    // Extraer enlaces a "VER ACTA"
    const actas = $('a').filter((_, el) => /ver\s*acta/i.test($(el).text())).map((_, el) => $(el).attr('href') || '').get();

    // Heurística: pares de equipos separados por " - " en texto
    const pairRe = /([A-Z0-9ÁÉÍÓÚÜÑ\.\-'\s]{3,}?)\s*-\s*([A-Z0-9ÁÉÍÓÚÜÑ\.\-'\s]{3,}?)(?=\s|\W)/g;
    const matches = [];
    const seen = new Set();
    let m;
    while ((m = pairRe.exec(pageText)) !== null) {
      const local = m[1].trim().replace(/\s{2,}/g, ' ');
      const visitante = m[2].trim().replace(/\s{2,}/g, ' ');
      const key = `${local}__${visitante}`;
      if (local && visitante && !seen.has(key)) {
        seen.add(key);
        matches.push({ local, visitante, goles_local: null, goles_visitante: null });
      }
    }

    // Asociar actas si coinciden en longitud (mejor que nada)
    if (actas.length === matches.length) {
      for (let i = 0; i < matches.length; i++) {
        matches[i].acta_url = actas[i];
      }
    }

    return Response.json({ matches, jornadas_detectadas: jornadasDetectadas });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
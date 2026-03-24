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

    // Texto general de migas/cabecera
    const pageText = $('body').text();

    // Temporada, Grupo y Jornada (Actual)
    const temporadaMatch = pageText.match(/(20\d{2}[\/-]20\d{2})/);
    const jornadaMatch = pageText.match(/(\d+)\s*\(\s*Actual\s*\)/i);
    const grupoMatch = pageText.match(/Grupo\s*([A-Za-z0-9ºª#\-]+)\b/i) || pageText.match(/GRUPO\s*([A-Za-z0-9ºª#\-]+)\b/);

    // Competición (intentar capturar línea con PRIMERA/SEGUNDA y categoría)
    let competition = null;
    const compMatch = pageText.match(/(PRIMERA|SEGUNDA|TERCERA|PREFERENTE)[^\n]{0,80}(BENJAM[IÍ]N|ALEV[IÍ]N|INFANTIL|CADETE|JUVENIL|F-?7)/i);
    if (compMatch) competition = compMatch[0].trim();

    const out = {
      temporada: temporadaMatch ? temporadaMatch[1].replace('-', '/').trim() : null,
      jornada_actual: jornadaMatch ? Number(jornadaMatch[1]) : null,
      grupo: grupoMatch ? String(grupoMatch[1]).trim() : null,
      competition
    };

    return Response.json(out);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
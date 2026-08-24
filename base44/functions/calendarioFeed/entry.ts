import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Feed de calendario suscribible (.ics) para las familias.
// URL pública: /functions/calendarioFeed?cat=Fútbol%20Cadete
// Sin ?cat= devuelve todo el club. Se actualiza solo: el móvil vuelve a leer esta URL.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const cat = (url.searchParams.get('cat') || '').trim();

    const norm = (s) => (s || '').trim().toLowerCase().replace(/\(mixto\)/g, '').replace(/\s+/g, ' ').trim();
    const matchCat = (c) => !cat || norm(c) === norm(cat);

    const [partidos, convocatorias, horarios] = await Promise.all([
      base44.asServiceRole.entities.ProximoPartido.list('-fecha_iso', 300),
      base44.asServiceRole.entities.Convocatoria.filter({ publicada: true }, '-fecha_partido', 300),
      base44.asServiceRole.entities.TrainingSchedule.filter({ activo: true }, '-created_date', 200),
    ]);

    const esc = (t) => String(t || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
    const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const local = (fecha, hora) => `${String(fecha).replace(/-/g, '')}T${String(hora || '00:00').replace(':', '')}00`;
    const addHours = (fecha, hora, h) => {
      const [hh, mm] = String(hora || '00:00').split(':').map((n) => parseInt(n, 10));
      const d = new Date(`${fecha}T00:00:00`);
      d.setHours(hh + h, mm || 0, 0, 0);
      const p = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`;
    };

    const vevents = [];

    for (const m of partidos) {
      if (!m.fecha_iso || !matchCat(m.categoria)) continue;
      const isLocal = (m.local || '').toLowerCase().includes('bustarviejo');
      const rival = isLocal ? m.visitante : m.local;
      vevents.push([
        'BEGIN:VEVENT',
        `UID:partido-${m.id}@cdbustarviejo.com`,
        `DTSTAMP:${stamp}`,
        `DTSTART;TZID=Europe/Madrid:${local(m.fecha_iso, m.hora)}`,
        `DTEND;TZID=Europe/Madrid:${addHours(m.fecha_iso, m.hora, 2)}`,
        `SUMMARY:⚽ ${esc(m.categoria)} vs ${esc(rival)}`,
        `DESCRIPTION:${esc(`Jornada ${m.jornada || '-'} · ${isLocal ? 'Local' : 'Visitante'}`)}`,
        `LOCATION:${esc(m.campo)}`,
        'BEGIN:VALARM',
        'TRIGGER:-PT12H',
        'ACTION:DISPLAY',
        `DESCRIPTION:Partido ${esc(m.categoria)}`,
        'END:VALARM',
        'END:VEVENT',
      ].join('\r\n'));
    }

    for (const c of convocatorias) {
      if (!c.fecha_partido || !matchCat(c.categoria)) continue;
      const inicio = c.hora_concentracion || c.hora_partido;
      vevents.push([
        'BEGIN:VEVENT',
        `UID:convocatoria-${c.id}@cdbustarviejo.com`,
        `DTSTAMP:${stamp}`,
        `DTSTART;TZID=Europe/Madrid:${local(c.fecha_partido, inicio)}`,
        `DTEND;TZID=Europe/Madrid:${addHours(c.fecha_partido, c.hora_partido, 2)}`,
        `SUMMARY:⚽ ${esc(c.titulo)}`,
        `DESCRIPTION:${esc(`Concentración ${c.hora_concentracion || '-'} · Partido ${c.hora_partido || '-'}${c.rival ? ` · Rival: ${c.rival}` : ''}`)}`,
        `LOCATION:${esc(c.ubicacion)}`,
        'BEGIN:VALARM',
        'TRIGGER:-PT12H',
        'ACTION:DISPLAY',
        `DESCRIPTION:${esc(c.titulo)}`,
        'END:VALARM',
        'END:VEVENT',
      ].join('\r\n'));
    }

    const dayMap = { 'Lunes': 'MO', 'Martes': 'TU', 'Miércoles': 'WE', 'Jueves': 'TH', 'Viernes': 'FR' };
    const dayIdx = { 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5 };
    for (const h of horarios) {
      if (!matchCat(h.categoria) || !dayMap[h.dia_semana]) continue;
      const base = h.fecha_inicio ? new Date(`${h.fecha_inicio}T00:00:00`) : new Date();
      // primer día que cae en ese día de la semana a partir de la fecha base
      const first = new Date(base);
      while (first.getDay() !== dayIdx[h.dia_semana]) first.setDate(first.getDate() + 1);
      const p = (n) => String(n).padStart(2, '0');
      const fechaFirst = `${first.getFullYear()}-${p(first.getMonth() + 1)}-${p(first.getDate())}`;
      const until = new Date(first);
      until.setMonth(until.getMonth() + 10);
      const untilStr = `${until.getFullYear()}${p(until.getMonth() + 1)}${p(until.getDate())}T235900`;
      vevents.push([
        'BEGIN:VEVENT',
        `UID:entreno-${h.id}@cdbustarviejo.com`,
        `DTSTAMP:${stamp}`,
        `DTSTART;TZID=Europe/Madrid:${local(fechaFirst, h.hora_inicio)}`,
        `DTEND;TZID=Europe/Madrid:${local(fechaFirst, h.hora_fin)}`,
        `RRULE:FREQ=WEEKLY;BYDAY=${dayMap[h.dia_semana]};UNTIL=${untilStr}`,
        `SUMMARY:🏃 Entrenamiento ${esc(h.categoria)}`,
        `DESCRIPTION:${esc(h.notas)}`,
        `LOCATION:${esc(h.ubicacion || 'Campo Municipal de Bustarviejo')}`,
        'END:VEVENT',
      ].join('\r\n'));
    }

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//CD Bustarviejo//Calendario//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:CD Bustarviejo${cat ? ` · ${cat}` : ''}`,
      'X-WR-TIMEZONE:Europe/Madrid',
      'REFRESH-INTERVAL;VALUE=DURATION:PT4H',
      'X-PUBLISHED-TTL:PT4H',
      ...vevents,
      'END:VCALENDAR',
    ].join('\r\n');

    return new Response(ics, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Cache-Control': 'public, max-age=1800',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
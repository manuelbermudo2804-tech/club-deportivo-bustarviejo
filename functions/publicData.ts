import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// API PÚBLICA - No requiere autenticación
// Devuelve datos deportivos para mostrar en la web del club

Deno.serve(async (req) => {
  // CORS headers para permitir llamadas desde cualquier web
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300' // Cache 5 minutos
  };

  // Manejar preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const base44 = createClientFromRequest(req);

    // Leer todos los datos en paralelo usando service role (público)
    const [proximosPartidos, resultados, clasificaciones, goleadores] = await Promise.all([
      base44.asServiceRole.entities.ProximoPartido.list('-fecha_iso', 50),
      base44.asServiceRole.entities.Resultado.filter({ estado: 'finalizado' }, '-jornada', 30),
      base44.asServiceRole.entities.Clasificacion.list('-puntos', 200),
      base44.asServiceRole.entities.Goleador.filter({ equipo: 'C.D. BUSTARVIEJO' }, '-goles', 200),
    ]);

    // Agrupar clasificaciones por categoría
    const clasificacionesPorCategoria = {};
    for (const c of clasificaciones) {
      if (!clasificacionesPorCategoria[c.categoria]) {
        clasificacionesPorCategoria[c.categoria] = [];
      }
      clasificacionesPorCategoria[c.categoria].push({
        posicion: c.posicion,
        equipo: c.nombre_equipo,
        puntos: c.puntos,
        pj: c.partidos_jugados || 0,
        pg: c.ganados || 0,
        pe: c.empatados || 0,
        pp: c.perdidos || 0,
        gf: c.goles_favor || 0,
        gc: c.goles_contra || 0,
      });
    }
    // Ordenar cada grupo por posición
    for (const cat of Object.keys(clasificacionesPorCategoria)) {
      clasificacionesPorCategoria[cat].sort((a, b) => a.posicion - b.posicion);
    }

    // Agrupar goleadores por categoría
    const goleadoresPorCategoria = {};
    for (const g of goleadores) {
      if (!goleadoresPorCategoria[g.categoria]) {
        goleadoresPorCategoria[g.categoria] = [];
      }
      goleadoresPorCategoria[g.categoria].push({
        posicion: g.posicion,
        jugador: g.jugador_nombre,
        equipo: g.equipo,
        goles: g.goles,
      });
    }

    // Agrupar resultados por categoría
    const resultadosPorCategoria = {};
    for (const r of resultados) {
      if (!resultadosPorCategoria[r.categoria]) {
        resultadosPorCategoria[r.categoria] = [];
      }
      resultadosPorCategoria[r.categoria].push({
        jornada: r.jornada,
        local: r.local,
        visitante: r.visitante,
        goles_local: r.goles_local,
        goles_visitante: r.goles_visitante,
      });
    }

    // Próximos partidos limpios
    const proximos = proximosPartidos.map(p => ({
      categoria: p.categoria,
      jornada: p.jornada,
      local: p.local,
      visitante: p.visitante,
      fecha: p.fecha,
      hora: p.hora,
      campo: p.campo,
      fecha_iso: p.fecha_iso,
    }));

    const data = {
      club: 'CD Bustarviejo',
      actualizado: new Date().toISOString(),
      proximos_partidos: proximos,
      resultados: resultadosPorCategoria,
      clasificaciones: clasificacionesPorCategoria,
      goleadores: goleadoresPorCategoria,
    };

    // Detectar si piden JSON explícitamente, si no → HTML por defecto
    let wantsJSON = false;
    try {
      const url = new URL(req.url);
      wantsJSON = url.searchParams.get('format') === 'json';
    } catch {}

    if (wantsJSON) {
      return Response.json(data, { headers: corsHeaders });
    }

    // Por defecto devolver página HTML completa
    const htmlPage = generarHTML(data);
    return new Response(htmlPage, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
      },
    });

  } catch (error) {
    console.error('Error en publicData:', error);
    return Response.json(
      { error: 'Error al obtener datos' },
      { status: 500, headers: corsHeaders }
    );
  }
});

function generarHTML(data) {
  const ESCUDO = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg';

  // Generar tablas de clasificación
  let clasifHTML = '';
  for (const cat in data.clasificaciones) {
    let filas = '';
    for (const eq of data.clasificaciones[cat]) {
      const esNuestro = eq.equipo.toLowerCase().includes('bustarviejo');
      const dg = eq.gf - eq.gc;
      filas += `<tr class="${esNuestro ? 'club-propio' : ''}">
        <td>${eq.posicion}</td><td class="td-equipo">${eq.equipo}</td>
        <td>${eq.pj}</td><td>${eq.pg}</td><td>${eq.pe}</td><td>${eq.pp}</td>
        <td>${eq.gf}</td><td>${eq.gc}</td><td>${dg >= 0 ? '+' : ''}${dg}</td>
        <td><strong>${eq.puntos}</strong></td>
      </tr>`;
    }
    clasifHTML += `<h3>${cat}</h3>
      <div class="tabla-scroll"><table>
        <tr><th>#</th><th>Equipo</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>GF</th><th>GC</th><th>DG</th><th>Pts</th></tr>
        ${filas}
      </table></div>`;
  }

  // Generar tablas de goleadores
  let golesHTML = '';
  let hayGoleadores = false;
  for (const cat in data.goleadores) {
    const jugadores = [...data.goleadores[cat]].sort((a, b) => b.goles - a.goles);
    if (jugadores.length === 0) continue;
    hayGoleadores = true;
    let filas = '';
    jugadores.forEach((j, i) => {
      const emoji = i === 0 ? ' 🥇' : i === 1 ? ' 🥈' : i === 2 ? ' 🥉' : '';
      filas += `<tr><td>${i + 1}</td><td class="td-equipo">${j.jugador}${emoji}</td><td><strong>${j.goles}</strong></td></tr>`;
    });
    golesHTML += `<h3>${cat}</h3>
      <div class="tabla-scroll"><table>
        <tr><th>#</th><th>Jugador</th><th>Goles ⚽</th></tr>
        ${filas}
      </table></div>`;
  }
  if (!hayGoleadores) golesHTML = '<p class="sin-datos">No hay goleadores registrados.</p>';

  // Generar próximos partidos
  let proximosHTML = '';
  if (data.proximos_partidos && data.proximos_partidos.length > 0) {
    // Ordenar por fecha
    const partidos = [...data.proximos_partidos].sort((a, b) => (a.fecha_iso || '').localeCompare(b.fecha_iso || ''));
    for (const p of partidos) {
      const esLocal = p.local.toLowerCase().includes('bustarviejo');
      proximosHTML += `<div class="partido-card">
        <div class="partido-cat">${p.categoria} — Jornada ${p.jornada}</div>
        <div class="partido-equipos">
          <span class="${esLocal ? 'equipo-nuestro' : ''}">${p.local}</span>
          <span class="partido-vs">vs</span>
          <span class="${!esLocal ? 'equipo-nuestro' : ''}">${p.visitante}</span>
        </div>
        <div class="partido-info">📅 ${p.fecha} — 🕐 ${p.hora} — 📍 ${p.campo || 'Por confirmar'}</div>
      </div>`;
    }
  } else {
    proximosHTML = '<p class="sin-datos">No hay próximos partidos programados.</p>';
  }

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Competición — C.D. Bustarviejo</title>
<link rel="icon" href="${ESCUDO}">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Inter', system-ui, sans-serif; background: #f0f2f5; color: #1a1a2e; line-height: 1.6; }

.header {
  background: linear-gradient(135deg, #0b3d91 0%, #1a237e 100%);
  color: white; padding: 20px; text-align: center;
  box-shadow: 0 4px 20px rgba(0,0,0,0.2);
}
.header img { width: 70px; height: 70px; border-radius: 50%; object-fit: cover; border: 3px solid rgba(255,255,255,0.3); }
.header h1 { font-size: 26px; margin: 8px 0 2px; font-weight: 800; }
.header p { font-size: 13px; opacity: 0.8; }

.tabs {
  display: flex; justify-content: center; gap: 8px;
  background: white; padding: 12px 16px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.06);
  position: sticky; top: 0; z-index: 10;
  flex-wrap: wrap;
}
.tab {
  padding: 10px 20px; border-radius: 25px; border: none;
  font-size: 14px; font-weight: 600; cursor: pointer;
  transition: all 0.2s; background: #f0f2f5; color: #555;
}
.tab:hover { background: #e0e4ea; }
.tab.activo { background: #0b3d91; color: white; box-shadow: 0 4px 12px rgba(11,61,145,0.3); }

.contenido { max-width: 1100px; margin: 0 auto; padding: 20px 16px 40px; }
.seccion { display: none; }
.seccion.visible { display: block; }

.bloque {
  background: white; border-radius: 16px; padding: 24px;
  margin-bottom: 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.05);
}
.bloque h2 {
  font-size: 22px; color: #0b3d91; margin-bottom: 20px;
  padding-bottom: 10px; border-bottom: 3px solid #0b3d91;
}
h3 {
  font-size: 16px; color: #333; margin: 20px 0 10px;
  padding: 8px 14px; background: #f0f4ff; border-radius: 8px;
  border-left: 4px solid #0b3d91;
}

.tabla-scroll { overflow-x: auto; margin-bottom: 20px; }
table { width: 100%; border-collapse: collapse; min-width: 600px; font-size: 13px; }
th { background: #0b3d91; color: white; padding: 10px 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; }
td { padding: 9px 8px; border-bottom: 1px solid #eef1f5; text-align: center; }
.td-equipo { text-align: left !important; white-space: nowrap; }
tr:hover { background: #f5f8ff; }
.club-propio { background: #dbeafe !important; font-weight: 700; }
.club-propio td { color: #0b3d91; }

.partido-card {
  background: #f8faff; border: 1px solid #e0e8f5;
  border-radius: 12px; padding: 16px; margin-bottom: 12px;
  transition: transform 0.2s;
}
.partido-card:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(0,0,0,0.08); }
.partido-cat { font-size: 12px; color: #0b3d91; font-weight: 700; text-transform: uppercase; margin-bottom: 8px; }
.partido-equipos { font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.partido-vs { color: #999; font-size: 13px; font-weight: 400; }
.equipo-nuestro { color: #0b3d91; font-weight: 800; }
.partido-info { font-size: 13px; color: #666; margin-top: 8px; }

.sin-datos { text-align: center; color: #999; padding: 30px; font-size: 15px; }

.footer {
  text-align: center; padding: 20px; font-size: 12px; color: #999;
  border-top: 1px solid #e5e5e5; margin-top: 30px;
}

@media (max-width: 640px) {
  .header h1 { font-size: 20px; }
  .header img { width: 55px; height: 55px; }
  .tab { padding: 8px 14px; font-size: 12px; }
  .bloque { padding: 16px; }
  .bloque h2 { font-size: 18px; }
  h3 { font-size: 14px; }
  table { font-size: 12px; }
  .partido-equipos { font-size: 14px; }
}
</style>
</head>
<body>

<div class="header">
  <img src="${ESCUDO}" alt="Escudo CD Bustarviejo">
  <h1>C.D. Bustarviejo</h1>
  <p>Centro de Competición — Temporada 2024/2025</p>
</div>

<div class="tabs">
  <button class="tab activo" data-sec="proximos">📅 Próximos</button>
  <button class="tab" data-sec="clasificacion">🏆 Clasificación</button>
  <button class="tab" data-sec="goleadores">⚽ Goleadores</button>
</div>

<div class="contenido">
  <div id="sec-proximos" class="seccion visible">
    <div class="bloque">
      <h2>📅 Próximos Partidos</h2>
      ${proximosHTML}
    </div>
  </div>

  <div id="sec-clasificacion" class="seccion">
    <div class="bloque">
      <h2>🏆 Clasificación</h2>
      ${clasifHTML}
    </div>
  </div>

  <div id="sec-goleadores" class="seccion">
    <div class="bloque">
      <h2>⚽ Goleadores C.D. Bustarviejo</h2>
      ${golesHTML}
    </div>
  </div>
</div>

<div class="footer">
  Actualizado: ${new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })} · C.D. Bustarviejo
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
  var tabs = document.querySelectorAll('.tab');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].addEventListener('click', function() {
      var seccion = this.getAttribute('data-sec');
      var secciones = document.querySelectorAll('.seccion');
      for (var j = 0; j < secciones.length; j++) { secciones[j].classList.remove('visible'); }
      var allTabs = document.querySelectorAll('.tab');
      for (var k = 0; k < allTabs.length; k++) { allTabs[k].classList.remove('activo'); }
      document.getElementById('sec-' + seccion).classList.add('visible');
      this.classList.add('activo');
    });
  }
});
</script>

</body>
</html>`;
}
import { base44 } from "@/api/base44Client";
import moment from "moment";

// URL pública oficial del club — usada en mensajes de Telegram/WhatsApp
const ORIGIN = "https://app.cdbustarviejo.com";

export async function fetchDataForType(type) {
  // ─── Existentes (heredado de SocialHub original) ───
  if (type === "partidos_finde") {
    const today = new Date();
    const dow = today.getDay();
    const sat = new Date(today); sat.setDate(today.getDate() + ((6 - dow + 7) % 7 || 7));
    const sun = new Date(sat); sun.setDate(sat.getDate() + 1);
    const satStr = sat.toISOString().split("T")[0];
    const sunStr = sun.toISOString().split("T")[0];
    const [partidos, convos] = await Promise.all([
      base44.entities.ProximoPartido.filter({ jugado: false }, "fecha_iso", 50).catch(() => []),
      base44.entities.Convocatoria.filter({ publicada: true, cerrada: false }, "-fecha_partido", 30).catch(() => []),
    ]);
    const pf = partidos.filter(p => p.fecha_iso >= satStr && p.fecha_iso <= sunStr);
    const cf = convos.filter(c => c.fecha_partido >= satStr && c.fecha_partido <= sunStr);
    let d = "";
    pf.forEach(p => { d += `${p.categoria}: ${p.local} vs ${p.visitante} | ${p.fecha} ${p.hora||""} | Campo: ${p.campo||"?"}\n`; });
    cf.forEach(c => { d += `${c.categoria}: ${c.titulo} | ${c.fecha_partido} ${c.hora_partido} | ${c.ubicacion} | ${c.local_visitante||""}\n`; });
    return d || "No hay partidos este finde. Escribe los datos aquí.";
  }

  if (type === "resultados") {
    const [res, jug] = await Promise.all([
      base44.entities.Resultado.filter({ estado: "finalizado" }, "-fecha_actualizacion", 30).catch(() => []),
      base44.entities.ProximoPartido.filter({ jugado: true }, "-fecha_iso", 20).catch(() => []),
    ]);
    let d = "";
    res.forEach(r => { d += `${r.categoria} J${r.jornada||"?"}: ${r.local} ${r.goles_local??""} - ${r.goles_visitante??""} ${r.visitante}\n`; });
    jug.slice(0,15).forEach(p => { d += `${p.categoria}: ${p.local} ${p.goles_local??""} - ${p.goles_visitante??""} ${p.visitante} (${p.fecha||""})\n`; });
    return d || "No hay resultados recientes. Escribe los datos aquí.";
  }

  // ─── NUEVOS ───
  if (type === "clasificaciones") {
    const cls = await base44.entities.Clasificacion.list("-fecha_actualizacion", 200).catch(() => []);
    if (!cls.length) return "No hay datos de clasificaciones cargados aún.";
    // Agrupar por categoría y quedarnos con la posición de Bustarviejo en cada una
    const byCat = {};
    cls.forEach(c => {
      if (!byCat[c.categoria]) byCat[c.categoria] = [];
      byCat[c.categoria].push(c);
    });
    let d = "Posición actual de equipos del CD Bustarviejo:\n\n";
    Object.entries(byCat).forEach(([cat, equipos]) => {
      const bv = equipos.find(e => /bustarviejo/i.test(e.nombre_equipo));
      if (bv) {
        const lider = equipos.find(e => e.posicion === 1);
        d += `${cat}: ${bv.posicion}º con ${bv.puntos} pts (${bv.ganados||0}G ${bv.empatados||0}E ${bv.perdidos||0}P)`;
        if (lider && lider.posicion !== bv.posicion) d += ` · Líder: ${lider.nombre_equipo} (${lider.puntos} pts)`;
        d += `\n`;
      }
    });
    return d || "No se encontraron equipos del Bustarviejo en las clasificaciones.";
  }

  if (type === "goleadores") {
    const gols = await base44.entities.Goleador.list("-goles", 50).catch(() => []);
    if (!gols.length) return "No hay datos de goleadores aún.";
    const byCat = {};
    gols.forEach(g => {
      if (!byCat[g.categoria]) byCat[g.categoria] = [];
      byCat[g.categoria].push(g);
    });
    let d = "🥇 Goleadores del CD Bustarviejo por categoría:\n\n";
    Object.entries(byCat).forEach(([cat, list]) => {
      const top = list.filter(g => /bustarviejo/i.test(g.equipo || "")).sort((a,b) => b.goles - a.goles).slice(0, 3);
      if (top.length) {
        d += `${cat}:\n`;
        top.forEach((g, i) => { d += `  ${i+1}. ${g.jugador_nombre} — ${g.goles} goles\n`; });
        d += `\n`;
      }
    });
    return d || "No hay goleadores del Bustarviejo registrados aún.";
  }

  if (type === "convocatorias") {
    const today = new Date();
    const dow = today.getDay();
    const sat = new Date(today); sat.setDate(today.getDate() + ((6 - dow + 7) % 7 || 7));
    const sun = new Date(sat); sun.setDate(sat.getDate() + 1);
    const satStr = sat.toISOString().split("T")[0];
    const sunStr = sun.toISOString().split("T")[0];
    const convos = await base44.entities.Convocatoria.filter({ publicada: true }, "-fecha_partido", 30).catch(() => []);
    const finde = convos.filter(c => c.fecha_partido >= satStr && c.fecha_partido <= sunStr);
    if (!finde.length) return "No hay convocatorias publicadas para este finde.";
    let d = "Convocatorias del finde:\n\n";
    finde.forEach(c => {
      const num = c.jugadores_convocados?.length || 0;
      d += `${c.categoria} vs ${c.rival || "—"} (${c.local_visitante || "?"}) | ${c.fecha_partido} ${c.hora_partido||""} | ${num} convocados\n`;
    });
    return d;
  }

  if (type === "anima_partido") {
    const today = new Date().toISOString().split("T")[0];
    const partidos = await base44.entities.ProximoPartido.filter({ jugado: false }, "fecha_iso", 30).catch(() => []);
    const locales = partidos.filter(p => p.fecha_iso >= today && /local/i.test(p.local_visitante || "") || /bustarviejo/i.test(p.local || "")).slice(0, 5);
    if (!locales.length) return "No hay partidos en casa próximos. Escribe el partido manualmente.";
    let d = "📣 Anima a los nuestros este fin de semana — partidos en casa:\n\n";
    locales.forEach(p => {
      d += `${p.categoria}: ${p.local} vs ${p.visitante} | ${p.fecha} ${p.hora||""} | ${p.campo||"Campo Municipal"}\n`;
    });
    return d;
  }

  if (type === "eventos_semana") {
    const evs = await base44.entities.Event.filter({ publicado: true }, "-fecha", 30).catch(() => []);
    const today = new Date();
    const next7 = new Date(); next7.setDate(today.getDate() + 7);
    const futuros = evs.filter(e => {
      const fe = new Date(e.fecha);
      return fe >= today && fe <= next7;
    });
    if (!futuros.length) return "No hay eventos esta semana.";
    return `Eventos del CD Bustarviejo esta semana:\n\n` + futuros.slice(0,8).map(e =>
      `• ${e.titulo} | ${moment(e.fecha).format("dddd DD/MM")} ${e.hora||""} | ${e.ubicacion||""}`
    ).join('\n');
  }

  if (type === "mercadillo") {
    const items = await base44.entities.MarketListing.filter({ estado: "activo" }, "-created_date", 10).catch(() => []);
    if (!items.length) return "El mercadillo está vacío. Anima a la gente a publicar.";
    let d = "🛒 Novedades en el Mercadillo del CD Bustarviejo:\n\n";
    items.slice(0, 6).forEach(it => {
      const precio = it.tipo === "donacion" ? "GRATIS" : `${it.precio || 0}€`;
      d += `• ${it.titulo} — ${precio} (${it.categoria})\n`;
    });
    d += `\nVer todo: ${ORIGIN}/Mercadillo`;
    return d;
  }

  if (type === "buenos_dias") {
    const today = new Date();
    const dia = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"][today.getDay()];
    return `Buenos días desde el CD Bustarviejo. Hoy es ${dia} ${today.getDate()}/${today.getMonth()+1}.\nTema sugerido: una frase corta para arrancar el día con energía, mencionando al pueblo y al club. Si hay partido cercano, recordarlo brevemente.`;
  }

  if (type === "fichaje") {
    return `Anuncio de NUEVO FICHAJE/INCORPORACIÓN al CD Bustarviejo.\nEscribe aquí: nombre del jugador/a, categoría, posición, una frase de bienvenida y de qué club viene (si aplica).`;
  }

  if (type === "hito") {
    return `HITO o NOTICIA ESPECIAL del CD Bustarviejo.\nEscribe aquí: qué se celebra (ej. número 100 de socios, aniversario, ascenso, fin de temporada, premio recibido, etc).`;
  }

  if (type === "motivacional") {
    return `Mensaje MOTIVACIONAL para la familia del CD Bustarviejo.\nIdea: una frase sobre esfuerzo, equipo, fútbol base, valores. Cita inspiradora si quieres añadirla. Cerrar con el lema del club.`;
  }

  // ─── Existentes restantes ───
  if (type === "anuncio") {
    const anuncios = await base44.entities.Announcement.filter({ publicado: true }, "-created_date", 5).catch(() => []);
    if (!anuncios.length) return "No hay anuncios recientes. Escribe tu anuncio aquí.";
    return anuncios.map((a,i) => `${i+1}. ${a.titulo}\n${a.contenido?.substring(0,300)||""}`).join("\n\n");
  }
  if (type === "hazte_socio") {
    const s = await base44.entities.SeasonConfig.filter({ activa: true }).catch(() => []);
    return `Programa de Socios CD Bustarviejo\nPrecio: ${s[0]?.precio_socio||25}€/temporada\nCarnet digital con QR, descuentos en comercios locales\nEnlace: ${ORIGIN}/ClubMembership`;
  }
  if (type === "femenino") {
    return `Captación Fútbol Femenino CD Bustarviejo\nTodas las edades, no hace falta experiencia\nEntrenadores titulados, ambiente familiar\nEnlace: ${ORIGIN}/JoinFemenino`;
  }
  if (type === "evento") {
    const evs = await base44.entities.Event.filter({ publicado: true }, "-fecha", 10).catch(() => []);
    const fut = evs.filter(e => e.fecha >= new Date().toISOString().split("T")[0]);
    if (!fut.length) return "No hay eventos próximos. Escribe los datos del evento.";
    return fut.slice(0,5).map(e => `${e.titulo} | ${moment(e.fecha).format("DD/MM/YYYY")} ${e.hora||""} | ${e.ubicacion||""}\n${e.descripcion?.substring(0,150)||""}`).join("\n\n");
  }
  if (type === "sanisidro") {
    const regs = await base44.entities.SanIsidroRegistration.list("-created_date", 500).catch(() => []);
    const vols = await base44.entities.SanIsidroVoluntario.list("-created_date", 200).catch(() => []);
    const PLAZAS = { 'Fútbol Chapa - Niños/Jóvenes': 32, 'Fútbol Chapa - Adultos': 16, '3 para 3 (7-10 años)': 16, '3 para 3 (11-15 años)': 12 };
    const ocup = {};
    regs.forEach(r => { ocup[r.modalidad] = (ocup[r.modalidad] || 0) + 1; });
    let d = `Torneo San Isidro CD Bustarviejo\n\nPlazas:\n`;
    Object.entries(PLAZAS).forEach(([m, max]) => { const o = ocup[m] || 0; d += `• ${m}: ${o}/${max} (quedan ${max-o})\n`; });
    d += `\nVoluntarios apuntados: ${vols.length}\n\nInscripciones: ${ORIGIN}/SanIsidro`;
    return d;
  }
  if (type === "loteria") {
    const sc = await base44.entities.SeasonConfig.filter({ activa: true }).catch(() => []);
    const config = sc[0] || {};
    const orders = await base44.entities.LotteryOrder.list("-created_date", 500).catch(() => []);
    const vendidos = orders.reduce((s, o) => s + (o.cantidad_decimos || 0), 0);
    const max = config.loteria_max_decimos || 770;
    return `Lotería de Navidad CD Bustarviejo\nPrecio: ${config.precio_decimo_loteria || 22}€/décimo\nVendidos: ${vendidos}/${max} · Quedan: ${max-vendidos}\n${config.loteria_navidad_abierta ? '✅ Pedidos abiertos' : '⛔ Pedidos cerrados'}`;
  }
  if (type === "patrocinadores") {
    const sc = await base44.entities.SeasonConfig.filter({ activa: true }).catch(() => []);
    const config = sc[0] || {};
    const limite = config.fecha_limite_patrocinios;
    let dias = "";
    if (limite) {
      const dl = Math.ceil((new Date(limite) - new Date()) / (1000*60*60*24));
      dias = ` (${dl} días)`;
    }
    return `Captación de Patrocinadores CD Bustarviejo\n${limite ? `Fecha límite: ${limite}${dias}` : 'Plazo abierto'}\nPaquetes: Bronce, Plata, Oro y Principal\nMás info: ${ORIGIN}/Patrocinadores`;
  }
  if (type === "tienda") {
    const sc = await base44.entities.SeasonConfig.filter({ activa: true }).catch(() => []);
    const config = sc[0] || {};
    const url = config.tienda_ropa_url || `${ORIGIN}/Tienda`;
    const merch = config.tienda_merch_url;
    return `Tienda de Ropa CD Bustarviejo abierta\n${config.tienda_ropa_abierta ? '✅ Abierta' : ''}\nEnlace: ${url}${merch ? `\nMerch: ${merch}` : ''}`;
  }
  if (type === "renovaciones") {
    const sc = await base44.entities.SeasonConfig.filter({ activa: true }).catch(() => []);
    const config = sc[0] || {};
    return `Renovaciones temporada ${config.temporada || ''} CD Bustarviejo\n${config.fecha_limite_renovaciones ? `Fecha límite: ${config.fecha_limite_renovaciones}` : 'Plazo abierto'}\nCuota única: ${config.cuota_unica || '?'}€ | Fraccionada: 3x ${config.cuota_tres_meses || '?'}€`;
  }
  if (type === "galeria") {
    const fotos = await base44.entities.PhotoGallery.list("-created_date", 5).catch(() => []);
    if (!fotos.length) return "No hay fotos recientes.";
    return `Galería actualizada CD Bustarviejo\n${fotos.length} nuevas fotos disponibles\n${fotos.slice(0,3).map(f => `• ${f.titulo || 'Foto'}`).join('\n')}`;
  }
  if (type === "cumple") {
    const today = new Date();
    const mm = String(today.getMonth()+1).padStart(2,'0');
    const dd = String(today.getDate()).padStart(2,'0');
    const players = await base44.entities.Player.filter({ activo: true }).catch(() => []);
    const cumples = players.filter(p => p.fecha_nacimiento?.endsWith(`-${mm}-${dd}`));
    if (!cumples.length) return `Hoy no hay cumpleaños registrados.`;
    return `🎂 Hoy felicitamos a:\n${cumples.map(c => `• ${c.nombre} (${c.categoria_principal || c.deporte || ''})`).join('\n')}`;
  }
  if (type === "voluntarios") {
    const vols = await base44.entities.SanIsidroVoluntario.list("-created_date", 100).catch(() => []);
    return `Buscamos VOLUNTARIOS CD Bustarviejo\nApúntate para echar una mano en eventos\nApuntados actualmente: ${vols.length}\nApúntate en: ${ORIGIN}/SanIsidro`;
  }

  if (type === "porra") {
    const [cfgs, participantes] = await Promise.all([
      base44.entities.PorraConfig.list().catch(() => []),
      base44.entities.PorraParticipante.filter({ estado_pago: "pagado" }, "-created_date", 1000).catch(() => []),
    ]);
    const cfg = cfgs[0] || {};
    const precio = cfg.precio_entrada || 15;
    const aporte = cfg.aporte_inicial_club || 0;
    const comision = cfg.comision_club_porcentaje || 10;
    const recaudado = participantes.length * precio;
    const bote = aporte + recaudado * (1 - comision / 100);
    const limite = cfg.fecha_limite_predicciones;
    let dias = "";
    if (limite) {
      const dl = Math.ceil((new Date(limite) - new Date()) / (1000 * 60 * 60 * 24));
      if (dl >= 0) dias = ` (faltan ${dl} días)`;
    }
    const estadoTxt = cfg.estado === "inscripciones_abiertas" ? "✅ Inscripciones abiertas" : (cfg.estado || "");
    return `🏆 ${cfg.nombre_torneo || "Porra Mundial 2026"}\n${estadoTxt}\n\nParticipantes: ${participantes.length}\nPrecio entrada: ${precio}€\nBote estimado: ${bote.toFixed(0)}€\n${limite ? `Fecha límite: ${moment(limite).format("DD/MM/YYYY HH:mm")}${dias}` : ""}\n\nApunta tu porra: ${ORIGIN}/Porra`;
  }

  if (type === "inscripciones") {
    const sc = await base44.entities.SeasonConfig.filter({ activa: true }).catch(() => []);
    const cfg = sc[0] || {};
    const players = await base44.entities.Player.filter({ activo: true }).catch(() => []);
    const limite = cfg.fecha_limite_renovaciones;
    let dias = "";
    if (limite) {
      const dl = Math.ceil((new Date(limite) - new Date()) / (1000 * 60 * 60 * 24));
      if (dl >= 0) dias = ` (faltan ${dl} días)`;
    }
    let d = `📝 Inscripciones temporada ${cfg.temporada || ""} CD Bustarviejo\n\n`;
    d += `Jugadores activos actualmente: ${players.length}\n`;
    d += `Cuota única: ${cfg.cuota_unica || "?"}€\n`;
    d += `Pago fraccionado: 3x ${cfg.cuota_tres_meses || "?"}€\n`;
    if (cfg.permitir_plan_mensual) d += `Plan mensual disponible (domiciliación por tarjeta)\n`;
    if (limite) d += `\nFecha límite: ${moment(limite).format("DD/MM/YYYY")}${dias}\n`;
    d += `\nInscí́bete o renueva en: ${ORIGIN}/SolicitarAcceso`;
    return d;
  }

  return "";
}
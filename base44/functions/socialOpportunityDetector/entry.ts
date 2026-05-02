import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Detecta oportunidades de difusión social basándose en el estado actual del club
// Devuelve sugerencias priorizadas con datos pre-cargados para el SocialHub

const PLAZAS_SAN_ISIDRO = {
  'Fútbol Chapa - Niños/Jóvenes': 32,
  'Fútbol Chapa - Adultos': 16,
  '3 para 3 (7-10 años)': 16,
  '3 para 3 (11-15 años)': 12,
};

function daysBetween(d1, d2) {
  return Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const opportunities = [];
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // === 1. SAN ISIDRO ===
    try {
      const sanIsidroRegs = await base44.asServiceRole.entities.SanIsidroRegistration.list('-created_date', 500);
      const sanIsidroVols = await base44.asServiceRole.entities.SanIsidroVoluntario.list('-created_date', 200);

      const plazasOcupadas = {};
      sanIsidroRegs.forEach(r => {
        plazasOcupadas[r.modalidad] = (plazasOcupadas[r.modalidad] || 0) + 1;
      });

      // Plazas casi llenas
      Object.entries(PLAZAS_SAN_ISIDRO).forEach(([modalidad, max]) => {
        const ocupadas = plazasOcupadas[modalidad] || 0;
        const restantes = max - ocupadas;
        const ratio = ocupadas / max;
        if (ratio >= 0.7 && restantes > 0) {
          opportunities.push({
            id: `sanisidro_plazas_${modalidad}`,
            type: 'sanisidro_plazas',
            priority: ratio >= 0.85 ? 'urgent' : 'high',
            icon: '🔥',
            title: `¡Solo ${restantes} plazas en ${modalidad}!`,
            reason: `${ocupadas}/${max} plazas ocupadas (${Math.round(ratio*100)}%)`,
            datos: `Torneo San Isidro CD Bustarviejo\nModalidad: ${modalidad}\nPlazas ocupadas: ${ocupadas}/${max}\nQUEDAN SOLO ${restantes} PLAZAS\nInscripciones: ${typeof globalThis !== 'undefined' && globalThis.location ? globalThis.location.origin : 'app.cdbustarviejo.com'}/SanIsidro`,
            socialType: 'evento',
          });
        }
      });

      // Pocas inscripciones generales (impulso)
      if (sanIsidroRegs.length < 20) {
        opportunities.push({
          id: 'sanisidro_impulso',
          type: 'sanisidro_impulso',
          priority: 'medium',
          icon: '🎯',
          title: 'San Isidro necesita un empujón',
          reason: `Solo ${sanIsidroRegs.length} inscripciones registradas`,
          datos: `Torneo San Isidro CD Bustarviejo\nFútbol Chapa (todas las edades) y 3vs3 (niños y jóvenes)\nInscripciones abiertas\nEnlace: app.cdbustarviejo.com/SanIsidro`,
          socialType: 'evento',
        });
      }

      // Faltan voluntarios
      if (sanIsidroVols.length < 8) {
        opportunities.push({
          id: 'sanisidro_voluntarios',
          type: 'sanisidro_voluntarios',
          priority: 'medium',
          icon: '🙋',
          title: 'Necesitamos más voluntarios para San Isidro',
          reason: `Solo ${sanIsidroVols.length} voluntarios apuntados`,
          datos: `Voluntarios para San Isidro CD Bustarviejo\nTurnos: mañana, mediodía, tarde y cierre\nApunta tu disponibilidad\nEnlace: app.cdbustarviejo.com/SanIsidro`,
          socialType: 'anuncio',
        });
      }
    } catch (e) { console.log('SanIsidro check failed:', e.message); }

    // === 2. LOTERÍA ===
    try {
      const seasonConfigs = await base44.asServiceRole.entities.SeasonConfig.filter({ activa: true });
      const config = seasonConfigs[0];

      if (config?.loteria_navidad_abierta) {
        const orders = await base44.asServiceRole.entities.LotteryOrder.list('-created_date', 500).catch(() => []);
        const decimosVendidos = orders.reduce((s, o) => s + (o.cantidad_decimos || 0), 0);
        const max = config.loteria_max_decimos || 770;
        const restantes = max - decimosVendidos;
        const ratio = decimosVendidos / max;

        if (ratio >= 0.8) {
          opportunities.push({
            id: 'loteria_ultimos',
            type: 'loteria_ultimos',
            priority: 'urgent',
            icon: '🎟️',
            title: `¡Últimos ${restantes} décimos de lotería!`,
            reason: `${decimosVendidos}/${max} décimos vendidos (${Math.round(ratio*100)}%)`,
            datos: `Lotería de Navidad CD Bustarviejo\nQUEDAN SOLO ${restantes} décimos\nPrecio: ${config.precio_decimo_loteria || 22}€/décimo\nReserva tu décimo en la app`,
            socialType: 'loteria',
          });
        } else {
          opportunities.push({
            id: 'loteria_abierta',
            type: 'loteria_abierta',
            priority: ratio < 0.3 ? 'high' : 'medium',
            icon: '🎟️',
            title: 'Promociona la Lotería de Navidad',
            reason: `${decimosVendidos}/${max} décimos vendidos`,
            datos: `Lotería de Navidad CD Bustarviejo\nPrecio: ${config.precio_decimo_loteria || 22}€/décimo\nDisponibles: ${restantes} décimos\nReserva tu décimo en la app`,
            socialType: 'loteria',
          });
        }
      }
    } catch (e) { console.log('Loteria check failed:', e.message); }

    // === 3. PATROCINADORES ===
    try {
      const seasonConfigs = await base44.asServiceRole.entities.SeasonConfig.filter({ activa: true });
      const config = seasonConfigs[0];

      if (config?.fecha_limite_patrocinios) {
        const limite = new Date(config.fecha_limite_patrocinios);
        const dias = daysBetween(now, limite);

        if (dias > 0 && dias <= 30) {
          opportunities.push({
            id: 'patrocinadores_deadline',
            type: 'patrocinadores_deadline',
            priority: dias <= 7 ? 'urgent' : (dias <= 15 ? 'high' : 'medium'),
            icon: '🤝',
            title: `Patrocinios cierran en ${dias} días`,
            reason: `Fecha límite: ${config.fecha_limite_patrocinios}`,
            datos: `Captación de Patrocinadores CD Bustarviejo\nFecha límite: ${config.fecha_limite_patrocinios} (${dias} días)\nPaquetes: Bronce, Plata, Oro y Principal\nMás info: app.cdbustarviejo.com/Patrocinadores`,
            socialType: 'anuncio',
          });
        }
      }
    } catch (e) { console.log('Sponsors check failed:', e.message); }

    // === 4. RESULTADOS RECIENTES (últimos 3 días) ===
    try {
      const resultados = await base44.asServiceRole.entities.Resultado.filter({ estado: 'finalizado' }, '-fecha_actualizacion', 30).catch(() => []);
      const recientes = resultados.filter(r => {
        if (!r.fecha_actualizacion) return false;
        const d = new Date(r.fecha_actualizacion);
        return daysBetween(d, now) <= 3;
      });
      if (recientes.length >= 2) {
        const datos = recientes.slice(0, 10).map(r =>
          `${r.categoria} J${r.jornada || '?'}: ${r.local} ${r.goles_local ?? '?'} - ${r.goles_visitante ?? '?'} ${r.visitante}`
        ).join('\n');
        opportunities.push({
          id: 'resultados_recientes',
          type: 'resultados_recientes',
          priority: 'high',
          icon: '📊',
          title: `${recientes.length} resultados recientes sin publicar`,
          reason: `Resultados de los últimos 3 días`,
          datos: `Resultados CD Bustarviejo:\n${datos}`,
          socialType: 'resultados',
        });
      }
    } catch (e) { console.log('Resultados check failed:', e.message); }

    // === 5. PARTIDOS DEL FINDE (jueves/viernes) ===
    try {
      const dow = now.getDay();
      if (dow >= 3 && dow <= 5) { // miércoles, jueves, viernes
        const sat = new Date(now); sat.setDate(now.getDate() + ((6 - dow + 7) % 7 || 7));
        const sun = new Date(sat); sun.setDate(sat.getDate() + 1);
        const satStr = sat.toISOString().split('T')[0];
        const sunStr = sun.toISOString().split('T')[0];
        const partidos = await base44.asServiceRole.entities.ProximoPartido.filter({ jugado: false }, 'fecha_iso', 50).catch(() => []);
        const pf = partidos.filter(p => p.fecha_iso >= satStr && p.fecha_iso <= sunStr);
        if (pf.length >= 2) {
          const datos = pf.slice(0, 15).map(p => `${p.categoria}: ${p.local} vs ${p.visitante} | ${p.fecha} ${p.hora || ''} | ${p.campo || '?'}`).join('\n');
          opportunities.push({
            id: 'partidos_finde',
            type: 'partidos_finde',
            priority: 'high',
            icon: '⚽',
            title: `${pf.length} partidos este fin de semana`,
            reason: 'Publica los partidos del finde',
            datos: `Partidos del finde CD Bustarviejo:\n${datos}`,
            socialType: 'partidos_finde',
          });
        }
      }
    } catch (e) { console.log('Partidos check failed:', e.message); }

    // === 6. EVENTOS PRÓXIMOS (siguientes 7 días) ===
    try {
      const evs = await base44.asServiceRole.entities.Event.filter({ publicado: true }, '-fecha', 30).catch(() => []);
      const proximos = evs.filter(e => {
        if (!e.fecha || e.fecha < todayStr) return false;
        const d = new Date(e.fecha);
        return daysBetween(now, d) <= 7;
      });
      if (proximos.length > 0) {
        const ev = proximos[0];
        opportunities.push({
          id: `evento_${ev.id}`,
          type: 'evento_proximo',
          priority: 'medium',
          icon: '🎉',
          title: `Evento próximo: ${ev.titulo}`,
          reason: `${ev.fecha} ${ev.hora || ''}`,
          datos: `${ev.titulo}\n${ev.fecha} ${ev.hora || ''}\n${ev.ubicacion || ''}\n${ev.descripcion || ''}`,
          socialType: 'evento',
        });
      }
    } catch (e) { console.log('Eventos check failed:', e.message); }

    // === 7. TIENDA DE ROPA ABIERTA ===
    try {
      const seasonConfigs = await base44.asServiceRole.entities.SeasonConfig.filter({ activa: true });
      const config = seasonConfigs[0];
      if (config?.tienda_ropa_abierta || config?.tienda_ropa_url) {
        opportunities.push({
          id: 'tienda_abierta',
          type: 'tienda_abierta',
          priority: 'medium',
          icon: '👕',
          title: 'Tienda de ropa abierta',
          reason: 'Recuérdaselo a las familias',
          datos: `Tienda de Ropa CD Bustarviejo abierta\nEquipación oficial, chándales, sudaderas y más\nEnlace: ${config.tienda_ropa_url || 'app.cdbustarviejo.com/Tienda'}`,
          socialType: 'anuncio',
        });
      }
    } catch (e) { console.log('Tienda check failed:', e.message); }

    // === 8. RENOVACIONES ABIERTAS ===
    try {
      const seasonConfigs = await base44.asServiceRole.entities.SeasonConfig.filter({ activa: true });
      const config = seasonConfigs[0];
      if (config?.permitir_renovaciones) {
        const limite = config.fecha_limite_renovaciones;
        let prio = 'medium';
        let tail = '';
        if (limite) {
          const dias = daysBetween(now, new Date(limite));
          if (dias > 0 && dias <= 14) { prio = 'high'; tail = ` (cierra en ${dias} días)`; }
        }
        opportunities.push({
          id: 'renovaciones_abiertas',
          type: 'renovaciones_abiertas',
          priority: prio,
          icon: '🔄',
          title: `Renovaciones abiertas${tail}`,
          reason: 'Recuerda a las familias renovar',
          datos: `Renovaciones temporada ${config.temporada} CD Bustarviejo\n${limite ? `Fecha límite: ${limite}` : 'Plazo abierto'}\nRenueva desde la app`,
          socialType: 'anuncio',
        });
      }
    } catch (e) { console.log('Renovaciones check failed:', e.message); }

    // === 9. CAPTACIÓN FEMENINO ===
    try {
      const interest = await base44.asServiceRole.entities.FemeninoInterest.list('-created_date', 100).catch(() => []);
      // Si hay interés registrado pero no se ha publicado en mucho tiempo
      const lastSocialFem = await base44.asServiceRole.entities.SocialPost.filter({ tipo: 'femenino' }, '-created_date', 1).catch(() => []);
      const dias = lastSocialFem[0]
        ? daysBetween(new Date(lastSocialFem[0].created_date), now)
        : 999;
      if (dias >= 14) {
        opportunities.push({
          id: 'femenino_captacion',
          type: 'femenino_captacion',
          priority: 'medium',
          icon: '⚽👧',
          title: 'Hora de promocionar Fútbol Femenino',
          reason: `Última publicación hace ${dias === 999 ? 'mucho' : dias + ' días'}`,
          datos: `Captación Fútbol Femenino CD Bustarviejo\nTodas las edades, no hace falta experiencia\nEntrenadores titulados, ambiente familiar\n${interest.length > 0 ? `Ya hay ${interest.length} interesadas` : ''}\nEnlace: app.cdbustarviejo.com/JoinFemenino`,
          socialType: 'femenino',
        });
      }
    } catch (e) { console.log('Femenino check failed:', e.message); }

    // === 10. HAZTE SOCIO ===
    try {
      const seasonConfigs = await base44.asServiceRole.entities.SeasonConfig.filter({ activa: true });
      const config = seasonConfigs[0];
      if (config?.programa_socios_activo) {
        const lastSocial = await base44.asServiceRole.entities.SocialPost.filter({ tipo: 'hazte_socio' }, '-created_date', 1).catch(() => []);
        const dias = lastSocial[0]
          ? daysBetween(new Date(lastSocial[0].created_date), now)
          : 999;
        if (dias >= 21) {
          opportunities.push({
            id: 'hazte_socio',
            type: 'hazte_socio',
            priority: 'low',
            icon: '❤️',
            title: 'Recuerda el Programa de Socios',
            reason: `Última publicación hace ${dias === 999 ? 'mucho' : dias + ' días'}`,
            datos: `Hazte Socio CD Bustarviejo\nPrecio: ${config.precio_socio || 25}€/temporada\nCarnet digital con QR + descuentos en comercios\nEnlace: app.cdbustarviejo.com/ClubMembership`,
            socialType: 'hazte_socio',
          });
        }
      }
    } catch (e) { console.log('Socios check failed:', e.message); }

    // Ordenar por prioridad: urgent > high > medium > low
    const order = { urgent: 0, high: 1, medium: 2, low: 3 };
    opportunities.sort((a, b) => (order[a.priority] ?? 9) - (order[b.priority] ?? 9));

    return Response.json({
      success: true,
      count: opportunities.length,
      opportunities: opportunities.slice(0, 12),
    });
  } catch (error) {
    console.error('socialOpportunityDetector error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
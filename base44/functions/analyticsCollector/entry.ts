import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const event = {
      evento_tipo: body.tipo,
      usuario_email: body.email,
      usuario_rol: body.rol,
      pagina: body.pagina,
      accion: body.accion,
      duracion_ms: body.duracion,
      timestamp: new Date().toISOString(),
      navegador: body.navegador,
      dispositivo: body.dispositivo,
      sistema_operativo: body.so,
      detalles: body.detalles,
      severidad: body.severidad || 'info'
    };

    await base44.asServiceRole.entities.AnalyticsEvent.create(event);

    // Analizar si hay patrones problemáticos
    await analizarPatrones(base44, body);

    return Response.json({ success: true });
  } catch (error) {
    console.error('Analytics error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function analizarPatrones(base44, evento) {
  try {
    // Si es un error crítico, crear alerta
    if (evento.severidad === 'critical' || evento.tipo === 'error') {
      const existente = await base44.asServiceRole.entities.SystemAlert.filter({
        titulo: evento.titulo,
        estado: 'activo'
      });

      if (existente.length > 0) {
        // Actualizar existente
        await base44.asServiceRole.entities.SystemAlert.update(existente[0].id, {
          ocurrencias: (existente[0].ocurrencias || 1) + 1,
          ultima_ocurrencia: new Date().toISOString()
        });
      } else {
        // Crear nueva alerta
        await base44.asServiceRole.entities.SystemAlert.create({
          titulo: evento.titulo || 'Error no identificado',
          descripcion: evento.mensaje || evento.detalles?.mensaje,
          categoria: 'error',
          severidad: evento.severidad || 'high',
          ocurrencias: 1,
          primera_ocurrencia: new Date().toISOString(),
          ultima_ocurrencia: new Date().toISOString(),
          evidencia: evento.detalles,
          prioridad_score: calcularScore(evento)
        });
      }
    }

    // Detectar problemas de rendimiento
    if (evento.tipo === 'performance' && evento.duracion > 3000) {
      await crearAlertaRendimiento(base44, evento);
    }

    // Detectar anomalías en patrones de usuario
    await analizarComportamientoUsuario(base44, evento);
  } catch (e) {
    console.log('Error en análisis de patrones:', e);
  }
}

async function crearAlertaRendimiento(base44, evento) {
  const existente = await base44.asServiceRole.entities.SystemAlert.filter({
    titulo: `Rendimiento lento: ${evento.pagina}`,
    estado: 'activo'
  });

  if (existente.length === 0) {
    await base44.asServiceRole.entities.SystemAlert.create({
      titulo: `Rendimiento lento: ${evento.pagina}`,
      descripcion: `La página ${evento.pagina} está tardando ${evento.duracion}ms`,
      categoria: 'performance',
      severidad: evento.duracion > 5000 ? 'high' : 'medium',
      solucion_sugerida: 'Revisar consultas a BD, optimizar componentes, lazy loading',
      prioridad_score: evento.duracion > 5000 ? 75 : 45
    });
  }
}

async function analizarComportamientoUsuario(base44, evento) {
  // Detectar abandono (usuario sale sin completar acción)
  if (evento.tipo === 'user_action' && evento.accion === 'page_exit') {
    const eventos_previos = await base44.asServiceRole.entities.AnalyticsEvent.filter({
      usuario_email: evento.email,
      pagina: evento.pagina
    });

    if (eventos_previos.length > 5) {
      // Usuario volvió a la misma página múltiples veces
      await base44.asServiceRole.entities.SystemAlert.create({
        titulo: `Patrón de abandono: ${evento.pagina}`,
        descripcion: `Usuario ${evento.email} intentó acceder a ${evento.pagina} ${eventos_previos.length} veces`,
        categoria: 'behavior',
        severidad: 'low',
        solucion_sugerida: 'Revisar UX de esta página, podría haber confusión'
      });
    }
  }
}

function calcularScore(evento) {
  let score = 50;
  
  if (evento.severidad === 'critical') score += 50;
  else if (evento.severidad === 'error') score += 30;
  else if (evento.severidad === 'warning') score += 15;
  
  if (evento.detalles?.afecta_multiples_usuarios) score += 20;
  
  return Math.min(score, 100);
}
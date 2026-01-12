import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Solo admins' }, { status: 403 });
    }

    // Obtener todas las plantillas
    const allTemplates = await base44.asServiceRole.entities.EventTemplate.list();
    
    console.log(`Total plantillas encontradas: ${allTemplates.length}`);

    // Agrupar por nombre_plantilla
    const grouped = {};
    for (const template of allTemplates) {
      const key = template.nombre_plantilla;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(template);
    }

    // Eliminar duplicados (dejar solo el más antiguo de cada grupo)
    let deletedCount = 0;
    for (const [nombre, templates] of Object.entries(grouped)) {
      if (templates.length > 1) {
        // Ordenar por fecha de creación (más antiguo primero)
        templates.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
        
        // Eliminar todos excepto el primero (más antiguo)
        for (let i = 1; i < templates.length; i++) {
          await base44.asServiceRole.entities.EventTemplate.delete(templates[i].id);
          deletedCount++;
          console.log(`Eliminado duplicado de "${nombre}" (${templates[i].id})`);
        }
      }
    }

    return Response.json({
      success: true,
      total_original: allTemplates.length,
      plantillas_unicas: Object.keys(grouped).length,
      duplicados_eliminados: deletedCount,
      grupos: Object.keys(grouped)
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
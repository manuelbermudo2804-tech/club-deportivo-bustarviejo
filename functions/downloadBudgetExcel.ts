import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { budgetId } = await req.json();

    if (!budgetId) {
      return Response.json({ error: 'budgetId required' }, { status: 400 });
    }

    // Obtener presupuesto
    const budgets = await base44.entities.Budget.list();
    const budget = budgets.find(b => b.id === budgetId);

    if (!budget) {
      return Response.json({ error: 'Budget not found' }, { status: 404 });
    }

    // Generar CSV (Excel puede abrirlo directamente)
    const partidas = budget.partidas || [];
    const categorías = ['Ingresos', 'Gastos Fijos', 'Gastos Variables', 'Inversiones'];
    
    let csv = 'PRESUPUESTO,' + (budget.nombre || 'Sin nombre') + '\n';
    csv += 'TEMPORADA,' + (budget.temporada || '') + '\n\n';
    
    categorías.forEach(categoria => {
      const itemsDeCategoria = partidas.filter(p => p.categoria === categoria);
      
      csv += categoria.toUpperCase() + '\n';
      csv += 'Partida,Presupuestado,Ejecutado,Diferencia\n';
      
      itemsDeCategoria.forEach(item => {
        const diferencia = (item.presupuestado || 0) - (item.ejecutado || 0);
        csv += `"${item.nombre || ''}",${item.presupuestado || 0},${item.ejecutado || 0},${diferencia}\n`;
      });
      
      const subtotalPresupuestado = itemsDeCategoria.reduce((sum, i) => sum + (i.presupuestado || 0), 0);
      const subtotalEjecutado = itemsDeCategoria.reduce((sum, i) => sum + (i.ejecutado || 0), 0);
      csv += `SUBTOTAL ${categoria},${subtotalPresupuestado},${subtotalEjecutado},${subtotalPresupuestado - subtotalEjecutado}\n\n`;
    });

    // Totales generales
    const totalPresupuestado = (budget.total_presupuestado_ingresos || 0) + (budget.total_presupuestado_gastos || 0);
    const totalEjecutado = (budget.total_ejecutado_ingresos || 0) + (budget.total_ejecutado_gastos || 0);
    csv += `TOTAL GENERAL,,${totalEjecutado}\n`;

    // Convertir a base64
    const encoder = new TextEncoder();
    const csvBytes = encoder.encode(csv);
    const base64 = btoa(String.fromCharCode(...new Uint8Array(csvBytes)));

    return Response.json({
      file_base64: base64,
      filename: `Presupuesto_${(budget.nombre || 'presupuesto').replace(/\s+/g, '_')}_${budget.temporada}.csv`
    });

  } catch (error) {
    console.error('Error generating Excel:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
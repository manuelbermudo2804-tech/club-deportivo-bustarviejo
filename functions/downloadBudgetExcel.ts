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
    const budget = await base44.entities.Budget.list().then(list => 
      list.find(b => b.id === budgetId)
    );

    if (!budget) {
      return Response.json({ error: 'Budget not found' }, { status: 404 });
    }

    // Generar Excel simple usando formato CSV embebido en XLSX
    // Para esto usamos una librería que esté disponible en Deno
    const xlsxModule = await import('npm:xlsx@0.18.5');
    const XLSX = xlsxModule.default;

    // Preparar datos por categoría
    const partidas = budget.partidas || [];
    const categorías = ['Ingresos', 'Gastos Fijos', 'Gastos Variables', 'Inversiones'];
    
    const filas = [];
    filas.push(['PRESUPUESTO', budget.nombre]);
    filas.push(['TEMPORADA', budget.temporada]);
    filas.push([]);
    
    categorías.forEach(categoria => {
      const itemsDeCategoria = partidas.filter(p => p.categoria === categoria);
      
      filas.push([categoria.toUpperCase()]);
      filas.push(['Partida', 'Presupuestado', 'Ejecutado', 'Diferencia']);
      
      itemsDeCategoria.forEach(item => {
        const diferencia = (item.presupuestado || 0) - (item.ejecutado || 0);
        filas.push([
          item.nombre,
          item.presupuestado || 0,
          item.ejecutado || 0,
          diferencia
        ]);
      });
      
      // Subtotales por categoría
      const subtotalPresupuestado = itemsDeCategoria.reduce((sum, i) => sum + (i.presupuestado || 0), 0);
      const subtotalEjecutado = itemsDeCategoria.reduce((sum, i) => sum + (i.ejecutado || 0), 0);
      filas.push([
        `SUBTOTAL ${categoria}`,
        subtotalPresupuestado,
        subtotalEjecutado,
        subtotalPresupuestado - subtotalEjecutado
      ]);
      filas.push([]);
    });

    // Totales generales
    filas.push(['TOTALES']);
    filas.push(['', budget.total_presupuestado_ingresos + (budget.total_presupuestado_gastos || 0), budget.total_ejecutado_ingresos + (budget.total_ejecutado_gastos || 0)]);

    // Crear workbook
    const worksheet = XLSX.utils.aoa_to_sheet(filas);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Presupuesto');

    // Generar como buffer y convertir a base64
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const base64 = btoa(String.fromCharCode.apply(null, excelBuffer));

    return Response.json({
      file_base64: base64,
      filename: `Presupuesto_${budget.nombre.replace(/\s+/g, '_')}_${budget.temporada}.xlsx`
    });

  } catch (error) {
    console.error('Error generating Excel:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
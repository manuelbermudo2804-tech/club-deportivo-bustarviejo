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
      return Response.json({ error: 'budgetId is required' }, { status: 400 });
    }

    // Obtener presupuesto
    const budget = await base44.entities.Budget.get(budgetId);

    if (!budget) {
      return Response.json({ error: 'Budget not found' }, { status: 404 });
    }

    // Usar ExcelJS para crear el archivo
    const ExcelJS = (await import('npm:exceljs@4.3.0')).default;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Presupuesto');

    // Configurar columnas
    worksheet.columns = [
      { header: 'Categoría', key: 'categoria', width: 20 },
      { header: 'Partida', key: 'nombre', width: 35 },
      { header: 'Presupuestado (€)', key: 'presupuestado', width: 18 },
      { header: 'Ejecutado (€)', key: 'ejecutado', width: 18 }
    ];

    // Estilos header
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF366092' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'center' };

    // Colores por categoría
    const categoriaColors = {
      'Ingresos': 'FF90EE90',
      'Gastos Fijos': 'FFFFCC99',
      'Gastos Variables': 'FFFF9999',
      'Inversiones': 'FF99CCFF'
    };

    // Agregar partidas
    const partidas = budget?.partidas || [];
    partidas.forEach((p, idx) => {
      const row = worksheet.addRow({
        categoria: p.categoria,
        nombre: p.nombre,
        presupuestado: Number(p.presupuestado || 0),
        ejecutado: Number(p.ejecutado || 0)
      });

      // Colorear fila según categoría
      const color = categoriaColors[p.categoria] || 'FFFFFFFF';
      row.cells[0].fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: color }
      };

      // Formato números
      row.getCell('presupuestado').numFmt = '#,##0.00';
      row.getCell('ejecutado').numFmt = '#,##0.00';
      row.getCell('presupuestado').alignment = { horizontal: 'right' };
      row.getCell('ejecutado').alignment = { horizontal: 'right' };
    });

    // Fila de totales
    const totalRow = worksheet.addRow({
      categoria: 'TOTAL',
      nombre: 'SUMA TOTAL',
      presupuestado: { formula: `SUM(C2:C${partidas.length + 1})` },
      ejecutado: { formula: `SUM(D2:D${partidas.length + 1})` }
    });
    totalRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
    totalRow.getCell('presupuestado').numFmt = '#,##0.00';
    totalRow.getCell('ejecutado').numFmt = '#,##0.00';

    // Convertir a buffer
    const buffer = await workbook.xlsx.writeBuffer();
    const base64 = btoa(String.fromCharCode.apply(null, buffer));

    return Response.json({
      success: true,
      filename: `Presupuesto_${budget.nombre}_${budget.temporada}.xlsx`,
      file_base64: base64,
      message: 'Excel generado correctamente'
    });

  } catch (error) {
    console.error('Error generating Excel:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
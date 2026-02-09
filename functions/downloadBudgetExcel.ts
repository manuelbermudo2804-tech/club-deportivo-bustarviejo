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

    // Importar XLSX
    const ExcelJS = (await import('npm:exceljs@4.3.0')).default;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Presupuesto');

    // Configurar ancho de columnas
    worksheet.columns = [
      { header: 'Categoría', key: 'categoria', width: 20 },
      { header: 'Partida', key: 'nombre', width: 30 },
      { header: 'Presupuestado', key: 'presupuestado', width: 15 },
      { header: 'Ejecutado', key: 'ejecutado', width: 15 }
    ];

    // Estilos
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF366092' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    };

    const numberFormat = '#,##0.00';
    const categoriaColors = {
      'Ingresos': 'FF90EE90',
      'Gastos Fijos': 'FFFFCC99',
      'Gastos Variables': 'FFFF9999',
      'Inversiones': 'FF99CCFF'
    };

    // Aplicar estilo a headers
    worksheet.getRow(1).eachCell(cell => {
      cell.font = headerStyle.font;
      cell.fill = headerStyle.fill;
      cell.alignment = headerStyle.alignment;
    });

    // Agregar partidas
    const partidas = budget?.partidas || [];
    partidas.forEach(p => {
      const row = worksheet.addRow({
        categoria: p.categoria,
        nombre: p.nombre,
        presupuestado: p.presupuestado || 0,
        ejecutado: p.ejecutado || 0
      });

      const color = categoriaColors[p.categoria] || 'FFFFFFFF';
      row.getCell('categoria').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: color }
      };

      row.getCell('presupuestado').numFmt = numberFormat;
      row.getCell('ejecutado').numFmt = numberFormat;
    });

    // Convertir a buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Subir a Drive y obtener URL compartible
    const file = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    return Response.json({
      success: true,
      file_url
    });

  } catch (error) {
    console.error('Error generating Excel:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
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

    const budgets = await base44.entities.Budget.list();
    const budget = budgets.find(b => b.id === budgetId);

    if (!budget) {
      return Response.json({ error: 'Budget not found' }, { status: 404 });
    }

    const xlsx = await import('npm:xlsx@0.18.5');
    const XLSX = xlsx.default;

    const partidas = budget.partidas || [];
    const categorías = ['Ingresos', 'Gastos Fijos', 'Gastos Variables', 'Inversiones'];
    
    // Crear workbook
    const wb = XLSX.utils.book_new();
    const ws = {};
    let row = 1;

    // Estilos
    const headerStyle = {
      fill: { fgColor: { rgb: 'FF1F4788' } },
      font: { bold: true, color: { rgb: 'FFFFFFFF' }, size: 14 },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: { bottom: { style: 'thin' }, top: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
    };

    const categoryStyle = {
      fill: { fgColor: { rgb: 'FFF5A623' } },
      font: { bold: true, color: { rgb: 'FFFFFFFF' }, size: 11 },
      alignment: { horizontal: 'left', vertical: 'center' },
      border: { bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
    };

    const subtotalStyle = {
      fill: { fgColor: { rgb: 'FFFCE4B6' } },
      font: { bold: true, size: 10 },
      alignment: { horizontal: 'right', vertical: 'center' },
      border: { bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } },
      numFmt: '#,##0.00'
    };

    const dataStyle = {
      alignment: { horizontal: 'right', vertical: 'center' },
      border: { bottom: { style: 'hair' }, left: { style: 'hair' }, right: { style: 'hair' } },
      numFmt: '#,##0.00'
    };

    const titleStyle = {
      font: { bold: true, size: 16, color: { rgb: 'FF1F4788' } },
      alignment: { horizontal: 'left', vertical: 'center' }
    };

    // Título
    ws[`A${row}`] = { v: budget.nombre || 'Presupuesto', s: titleStyle };
    row += 1;
    ws[`A${row}`] = { v: `Temporada ${budget.temporada}`, s: { font: { italic: true, size: 10, color: { rgb: 'FF666666' } } } };
    row += 2;

    // Encabezados de columna
    const headerRow = row;
    ws[`A${row}`] = { v: 'Partida', s: headerStyle };
    ws[`B${row}`] = { v: 'Presupuestado', s: headerStyle };
    ws[`C${row}`] = { v: 'Ejecutado', s: headerStyle };
    ws[`D${row}`] = { v: 'Diferencia', s: headerStyle };
    row += 1;

    // Datos por categoría
    categorías.forEach(categoria => {
      const items = partidas.filter(p => p.categoria === categoria);
      
      if (items.length === 0) return;

      // Título de categoría
      ws[`A${row}`] = { v: categoria.toUpperCase(), s: categoryStyle };
      ws[`B${row}`] = { s: categoryStyle };
      ws[`C${row}`] = { s: categoryStyle };
      ws[`D${row}`] = { s: categoryStyle };
      row += 1;

      // Items
      items.forEach(item => {
        const diff = (item.presupuestado || 0) - (item.ejecutado || 0);
        ws[`A${row}`] = { v: item.nombre || '', s: { alignment: { horizontal: 'left' }, border: { bottom: { style: 'hair' }, left: { style: 'hair' }, right: { style: 'hair' } } } };
        ws[`B${row}`] = { v: item.presupuestado || 0, s: dataStyle };
        ws[`C${row}`] = { v: item.ejecutado || 0, s: dataStyle };
        ws[`D${row}`] = { v: diff, s: dataStyle };
        row += 1;
      });

      // Subtotal
      const subtotalPres = items.reduce((sum, i) => sum + (i.presupuestado || 0), 0);
      const subtotalEjec = items.reduce((sum, i) => sum + (i.ejecutado || 0), 0);
      ws[`A${row}`] = { v: `SUBTOTAL ${categoria}`, s: subtotalStyle };
      ws[`B${row}`] = { v: subtotalPres, s: subtotalStyle };
      ws[`C${row}`] = { v: subtotalEjec, s: subtotalStyle };
      ws[`D${row}`] = { v: subtotalPres - subtotalEjec, s: subtotalStyle };
      row += 2;
    });

    // Total general
    const totalStyle = {
      fill: { fgColor: { rgb: 'FF1F4788' } },
      font: { bold: true, color: { rgb: 'FFFFFFFF' }, size: 11 },
      alignment: { horizontal: 'right', vertical: 'center' },
      border: { bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } },
      numFmt: '#,##0.00'
    };

    ws[`A${row}`] = { v: 'TOTAL GENERAL', s: totalStyle };
    ws[`B${row}`] = { v: budget.total_presupuestado_ingresos + (budget.total_presupuestado_gastos || 0), s: totalStyle };
    ws[`C${row}`] = { v: budget.total_ejecutado_ingresos + (budget.total_ejecutado_gastos || 0), s: totalStyle };
    ws[`D${row}`] = { v: (budget.total_presupuestado_ingresos + (budget.total_presupuestado_gastos || 0)) - (budget.total_ejecutado_ingresos + (budget.total_ejecutado_gastos || 0)), s: totalStyle };

    // Ancho de columnas
    ws['!cols'] = [
      { wch: 30 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Presupuesto');
    
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const base64 = btoa(String.fromCharCode(...new Uint8Array(excelBuffer)));

    return Response.json({
      file_base64: base64,
      filename: `Presupuesto_${(budget.nombre || 'presupuesto').replace(/\s+/g, '_')}_${budget.temporada}.xlsx`
    });

  } catch (error) {
    console.error('Error generating Excel:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
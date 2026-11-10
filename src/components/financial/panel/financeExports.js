import jsPDF from "jspdf";

const f = (v) => (Number(v) || 0).toFixed(2);

const download = (blob, name) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export function exportFinancePDF(stats, temporada) {
  const doc = new jsPDF();
  doc.setFontSize(20);
  doc.text("Informe Financiero - CD Bustarviejo", 20, 20);
  doc.setFontSize(12);
  doc.text(`Temporada: ${temporada || "N/A"}`, 20, 30);
  doc.text(`Fecha: ${new Date().toLocaleDateString("es-ES")}`, 20, 37);
  const lines = [
    ["Resumen", null],
    [`Cobrado: ${f(stats.totalIngresos)}€`],
    [`Pendiente de cobro: ${f(stats.totalPendiente)}€ (vencido: ${f(stats.cuotasVencidas)}€)`],
    [`Gastado: ${f(stats.gastos)}€`],
    ["Desglose", null],
    [`Cuotas: cobradas ${f(stats.cuotasPagadas)}€ | pendientes ${f(stats.cuotasPendientes)}€ | en revisión ${f(stats.cuotasEnRevision)}€`],
    [`Socios: cobrados ${f(stats.sociosPagados)}€ | pendientes ${f(stats.sociosPendientes)}€`],
    [`Patrocinios: cobrados ${f(stats.patrociniosTotal)}€ | pendientes ${f(stats.patrociniosPendientes)}€`],
    [`Lotería: cobrada ${f(stats.loteriaPagada)}€ | pendiente ${f(stats.loteriaPendiente)}€`],
  ];
  let y = 52;
  lines.forEach(([text, isTitle]) => {
    if (isTitle === null) { y += 4; doc.setFontSize(14); doc.text(text, 20, y); doc.setFontSize(10); y += 9; }
    else { doc.text(text, 25, y); y += 7; }
  });
  doc.save(`informe_financiero_${temporada || "actual"}.pdf`);
}

export function exportFinanceCSV(stats, temporada) {
  const rows = [
    ["Concepto", "Cobrado", "Pendiente", "En revisión"],
    ["Cuotas jugadores", f(stats.cuotasPagadas), f(stats.cuotasPendientes), f(stats.cuotasEnRevision)],
    ["Socios", f(stats.sociosPagados), f(stats.sociosPendientes), "0"],
    ["Patrocinios", f(stats.patrociniosTotal), f(stats.patrociniosPendientes), "0"],
    ["Lotería", f(stats.loteriaPagada), f(stats.loteriaPendiente), "0"],
    ["TOTAL", f(stats.totalIngresos), f(stats.totalPendiente), f(stats.cuotasEnRevision)],
    [],
    ["Gastado temporada", f(stats.gastos)],
  ];
  const csv = "\uFEFF" + rows.map((r) => r.join(";")).join("\r\n");
  download(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `informe_financiero_${temporada || "actual"}.csv`);
}

export function exportTransactionsCSV(rows, temporada) {
  const columns = [
    ["fecha", "Fecha"], ["tipo", "Tipo"], ["concepto", "Concepto"], ["categoria", "Categoría"],
    ["subcategoria", "Subcategoría"], ["proveedor_cliente", "Proveedor/Cliente"], ["numero_factura", "Nº factura"],
    ["cantidad", "Importe (€)"], ["estado", "Estado"], ["metodo_pago", "Método de pago"], ["temporada", "Temporada"], ["notas", "Notas"],
  ];
  const esc = (v) => '"' + (v == null ? "" : String(v)).replace(/"/g, '""') + '"';
  const csv = "\uFEFF" + [columns.map(([, l]) => esc(l)).join(";"), ...rows.map((r) => columns.map(([k]) => esc(r[k])).join(";"))].join("\r\n");
  download(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `movimientos-financieros-${temporada || "club"}.csv`);
}
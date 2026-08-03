import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";

// Genera listados de dorsales asignados (nombre + dorsal) por categoría,
// pensados para entregar a la tienda de ropa.
export default function ExportDorsalesButton({ assignments, categorias, temporada, categoriaActual }) {
  const [open, setOpen] = useState(false);

  // Solo dorsales realmente asignados
  const asignados = (assignments || []).filter((a) => a.estado === "asignado");

  const buildRows = (cats) => {
    const rows = [];
    cats.forEach((cat) => {
      const enCat = asignados
        .filter((a) => a.categoria === cat)
        .sort((a, b) => Number(a.dorsal) - Number(b.dorsal));
      enCat.forEach((a) => {
        rows.push({ categoria: cat, dorsal: a.dorsal, nombre: a.jugador_nombre || "" });
      });
    });
    return rows;
  };

  const downloadCSV = (cats, nombreArchivo) => {
    const rows = buildRows(cats);
    if (rows.length === 0) {
      toast.error("No hay dorsales asignados para exportar");
      return;
    }
    const header = "Categoría;Dorsal;Nombre";
    const body = rows.map((r) => `${r.categoria};${r.dorsal};${r.nombre}`).join("\n");
    // BOM para que Excel abra bien los acentos
    const csv = "\uFEFF" + header + "\n" + body;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${nombreArchivo}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Listado exportado (${rows.length} dorsales)`);
    setOpen(false);
  };

  const printListado = (cats) => {
    const rows = buildRows(cats);
    if (rows.length === 0) {
      toast.error("No hay dorsales asignados para imprimir");
      return;
    }
    const grupos = cats
      .map((cat) => ({ cat, items: rows.filter((r) => r.categoria === cat) }))
      .filter((g) => g.items.length > 0);

    const html = `
      <html><head><title>Dorsales ${temporada}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:24px;color:#1e293b;}
        h1{font-size:20px;margin:0 0 4px;}
        h2{font-size:15px;margin:20px 0 8px;padding:6px 10px;background:#f1f5f9;border-left:4px solid #ea580c;}
        table{width:100%;border-collapse:collapse;margin-bottom:8px;}
        th,td{text-align:left;padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:13px;}
        th{background:#fff7ed;font-size:11px;text-transform:uppercase;color:#9a3412;}
        .dorsal{font-weight:bold;color:#ea580c;width:60px;}
        @media print{h2{break-after:avoid;}}
      </style></head><body>
      <h1>Listado de dorsales · CD Bustarviejo</h1>
      <div style="font-size:12px;color:#64748b;margin-bottom:8px;">Temporada ${temporada}</div>
      ${grupos.map((g) => `
        <h2>${g.cat} (${g.items.length})</h2>
        <table>
          <thead><tr><th>Dorsal</th><th>Nombre</th></tr></thead>
          <tbody>
            ${g.items.map((r) => `<tr><td class="dorsal">#${r.dorsal}</td><td>${r.nombre}</td></tr>`).join("")}
          </tbody>
        </table>
      `).join("")}
      </body></html>`;

    const win = window.open("", "_blank");
    if (!win) { toast.error("Permite las ventanas emergentes para imprimir"); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
    setOpen(false);
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline" className="gap-2">
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">Exportar</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Exportar dorsales para la tienda</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">Categoría actual · {categoriaActual}</p>
              <div className="flex gap-2">
                <Button onClick={() => downloadCSV([categoriaActual], `dorsales_${categoriaActual}_${temporada}`)} className="flex-1 gap-2 bg-green-600 hover:bg-green-700">
                  <FileSpreadsheet className="w-4 h-4" /> Excel/CSV
                </Button>
                <Button onClick={() => printListado([categoriaActual])} variant="outline" className="flex-1 gap-2">
                  <FileText className="w-4 h-4" /> Imprimir/PDF
                </Button>
              </div>
            </div>

            <div className="pt-3 border-t">
              <p className="text-sm font-semibold text-slate-700 mb-2">Todas las categorías</p>
              <div className="flex gap-2">
                <Button onClick={() => downloadCSV(categorias, `dorsales_todos_${temporada}`)} className="flex-1 gap-2 bg-green-600 hover:bg-green-700">
                  <FileSpreadsheet className="w-4 h-4" /> Excel/CSV
                </Button>
                <Button onClick={() => printListado(categorias)} variant="outline" className="flex-1 gap-2">
                  <FileText className="w-4 h-4" /> Imprimir/PDF
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
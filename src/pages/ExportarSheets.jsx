import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table2, Users, Euro, Shirt, ExternalLink, Loader2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

const EXPORTS = [
  { tipo: "jugadores", titulo: "Jugadores", desc: "Nombre, categoría, dorsal, tutores y contactos", icon: Users, color: "text-blue-600" },
  { tipo: "pagos", titulo: "Pagos de la temporada", desc: "Importes, estado, fechas y nº de recibo", icon: Euro, color: "text-green-600" },
  { tipo: "equipacion", titulo: "Pedidos de equipación", desc: "Quién ha pedido y quién no, con teléfonos", icon: Shirt, color: "text-orange-600" },
];

export default function ExportarSheets() {
  const [cargando, setCargando] = useState(null);
  const [resultados, setResultados] = useState({});

  const exportar = async (tipo) => {
    setCargando(tipo);
    try {
      const res = await base44.functions.invoke("exportarASheets", { tipo });
      const data = res.data || {};
      if (data.error) throw new Error(data.error);
      setResultados((prev) => ({ ...prev, [tipo]: data }));
      toast.success(`Hoja creada con ${data.filas} filas`);
      window.open(data.url, "_blank");
    } catch (e) {
      toast.error(e.message || "No se pudo crear la hoja");
    } finally {
      setCargando(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 p-3 sm:p-5 lg:p-6">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-md sm:p-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15 sm:h-14 sm:w-14">
            <FileSpreadsheet className="h-6 w-6 text-orange-400 sm:h-7 sm:w-7" />
          </div>
          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-orange-300 sm:text-xs">Datos y administración</p>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Exportar a Google Sheets</h1>
            <p className="mt-1 text-sm text-slate-300">Crea hojas actualizadas en el Google Drive del club</p>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-600 shadow-sm sm:p-5">
        Cada exportación crea una hoja de cálculo nueva con los datos actualizados. Revisa el tipo de información antes de compartir el enlace, especialmente cuando incluya contactos o datos de pagos.
      </div>

      {EXPORTS.map((e) => (
        <Card key={e.tipo} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <e.icon className={`w-4 h-4 ${e.color}`} />
              {e.titulo}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-slate-500">{e.desc}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => exportar(e.tipo)} disabled={cargando === e.tipo} className="h-10 rounded-xl bg-orange-600 font-semibold text-white hover:bg-orange-700">
                {cargando === e.tipo
                  ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  : <Table2 className="w-4 h-4 mr-2" />}
                Crear hoja
              </Button>
              {resultados[e.tipo] && (
                <a
                  href={resultados[e.tipo].url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-emerald-700 underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Abrir última hoja ({resultados[e.tipo].filas} filas)
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table2, Users, Euro, Shirt, ExternalLink, Loader2 } from "lucide-react";
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
    <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Table2 className="w-6 h-6 text-emerald-600" />
        <h1 className="text-xl lg:text-2xl font-bold">Exportar a Google Sheets</h1>
      </div>
      <p className="text-sm text-slate-600">
        Cada exportación crea una hoja de cálculo nueva en el Google Drive del club con los datos actualizados.
      </p>

      {EXPORTS.map((e) => (
        <Card key={e.tipo}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <e.icon className={`w-4 h-4 ${e.color}`} />
              {e.titulo}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-slate-500">{e.desc}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => exportar(e.tipo)} disabled={cargando === e.tipo}>
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
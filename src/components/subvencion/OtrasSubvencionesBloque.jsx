import React, { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Download, Trash2, Loader2 } from "lucide-react";
import { inSeason, eur, esEstaSubvencion } from "@/components/subvencion/expedienteConfig";
import { docOtrasSubvenciones } from "@/components/subvencion/documentosPlantillas";
import { descargarDocumentoOficial } from "@/components/subvencion/pdfOficial";
import OtraSubvencionForm from "@/components/subvencion/OtraSubvencionForm";

export default function OtrasSubvencionesBloque({ temporada, entidad }) {
  const [lista, setLista] = useState(null);
  const [bajando, setBajando] = useState(false);

  const load = useCallback(async () => {
    const rows = await base44.entities.FinancialTransaction.filter({ tipo: "Ingreso", categoria: "Subvenciones" }, "fecha", 500);
    setLista(rows.filter((r) => r.estado !== "Anulado" && inSeason(r.temporada, r.fecha, temporada) && !esEstaSubvencion(r, entidad)));
  }, [temporada, entidad]);

  useEffect(() => { load(); }, [load]);

  const borrar = async (id) => { await base44.entities.FinancialTransaction.delete(id); load(); };

  const descargar = async () => {
    setBajando(true);
    await descargarDocumentoOficial(docOtrasSubvenciones(temporada, lista.map((x) => ({ entidad: x.proveedor_cliente, concepto: x.concepto, importe: x.cantidad }))));
    setBajando(false);
  };

  if (!lista) return <Loader2 className="w-4 h-4 animate-spin text-slate-400" />;
  const total = lista.reduce((s, x) => s + (x.cantidad || 0), 0);

  return (
    <div className="space-y-2 bg-slate-50 rounded-lg p-3">
      {lista.length === 0 ? (
        <p className="text-xs text-slate-500">No hay ninguna apuntada: se descargará la declaración de no haber recibido otras subvenciones.</p>
      ) : (
        <div className="space-y-1">
          {lista.map((x) => (
            <div key={x.id} className="flex items-center gap-2 text-sm">
              <span className="flex-1">{x.proveedor_cliente} · {x.concepto}</span>
              <span className="font-medium">{eur(x.cantidad)}</span>
              <button onClick={() => borrar(x.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
          <div className="flex justify-between text-sm font-bold border-t pt-1"><span>Total</span><span>{eur(total)}</span></div>
        </div>
      )}
      <OtraSubvencionForm temporada={temporada} onSaved={load} />
      <Button size="sm" onClick={descargar} disabled={bajando} className="bg-orange-600 hover:bg-orange-700">
        {bajando ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1" />} Descargar PDF para firmar
      </Button>
    </div>
  );
}
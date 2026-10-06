import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Trash2, Loader2 } from "lucide-react";
import NuevoContratoForm from "@/components/contratos/NuevoContratoForm";
import { descargarContratoPdf } from "@/components/contratos/contratoPdf";

export default function ContratosVoluntariado() {
  const [busy, setBusy] = useState(null);
  const { data: contratos = [], isLoading, refetch } = useQuery({
    queryKey: ["contratosVoluntariado"],
    queryFn: () => base44.entities.ContratoVoluntariado.list("-created_date"),
  });

  const descargar = async (c) => { setBusy(c.id); await descargarContratoPdf(c); setBusy(null); };
  const borrar = async (c) => {
    if (!confirm(`¿Borrar el acuerdo de ${c.entrenador_nombre}?`)) return;
    await base44.entities.ContratoVoluntariado.delete(c.id);
    refetch();
  };

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">✍️ Documentos para firmar</h1>
      <NuevoContratoForm onCreated={refetch} />
      <div className="space-y-2">
        {isLoading && <Loader2 className="w-6 h-6 animate-spin mx-auto" />}
        {!isLoading && contratos.length === 0 && <p className="text-sm text-slate-500 text-center py-6">Aún no hay acuerdos.</p>}
        {contratos.map((c) => (
          <div key={c.id} className="bg-white rounded-xl border p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{c.entrenador_nombre}</p>
              <p className="text-xs text-slate-500 truncate">{c.titulo}</p>
              {c.firma_fecha && <p className="text-xs text-slate-500">Firmado {new Date(c.firma_fecha).toLocaleString("es-ES")}</p>}
            </div>
            <Badge className={c.estado === "firmado" ? "bg-green-600" : "bg-amber-500"}>{c.estado === "firmado" ? "Firmado" : "Pendiente"}</Badge>
            <Button size="icon" variant="outline" onClick={() => descargar(c)} disabled={busy === c.id}>
              {busy === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            </Button>
            <Button size="icon" variant="ghost" onClick={() => borrar(c)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
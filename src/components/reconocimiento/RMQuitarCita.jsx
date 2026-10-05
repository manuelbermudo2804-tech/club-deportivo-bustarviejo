import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { RM_DOCS } from "./rmDocs";

// Quita uno de los PDFs del reconocimiento
export default function RMQuitarCita({ rm, tipo = "hoja" }) {
  const d = RM_DOCS[tipo];
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const quitar = async () => {
    if (!window.confirm(`¿Quitar el PDF de la ${d.titulo}?`)) return;
    setBusy(true);
    await base44.entities.ReconocimientoMedico.update(rm.id, { [d.uri]: "", [d.nombre]: "", [d.fecha]: null, [d.por]: "" });
    qc.invalidateQueries({ queryKey: ["reconocimientos"] });
    setBusy(false);
    toast.success("PDF eliminado");
  };
  return (
    <Button size="sm" variant="outline" disabled={busy} onClick={quitar} className="text-red-600 border-red-200 hover:bg-red-50">
      {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />} Quitar {d.corto}
    </Button>
  );
}
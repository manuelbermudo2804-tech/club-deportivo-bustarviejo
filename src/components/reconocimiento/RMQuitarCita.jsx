import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Quita el PDF de la cita del reconocimiento
export default function RMQuitarCita({ rm }) {
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const quitar = async () => {
    if (!window.confirm("¿Quitar el PDF de la cita?")) return;
    setBusy(true);
    await base44.entities.ReconocimientoMedico.update(rm.id, {
      cita_pdf_uri: "", cita_pdf_nombre: "", cita_fecha_subida: null, cita_subida_por: "",
    });
    qc.invalidateQueries({ queryKey: ["reconocimientos"] });
    setBusy(false);
    toast.success("Cita eliminada");
  };
  return (
    <Button size="sm" variant="outline" disabled={busy} onClick={quitar} className="text-red-600 border-red-200 hover:bg-red-50">
      {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />} Quitar cita
    </Button>
  );
}
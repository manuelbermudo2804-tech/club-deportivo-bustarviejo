import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// El club completa/corrige los datos oficiales de un entrenador
export default function FichaEntrenadorDialog({ coach, onClose }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    nombre_completo_oficial: coach.nombre_completo_oficial || coach.full_name || "",
    dni_entrenador: coach.dni_entrenador || "",
    telefono_contacto: coach.telefono_contacto || "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const guardar = async () => {
    setSaving(true);
    await base44.entities.User.update(coach.id, {
      nombre_completo_oficial: f.nombre_completo_oficial.trim(),
      dni_entrenador: f.dni_entrenador.trim().toUpperCase(),
      telefono_contacto: f.telefono_contacto.trim(),
    });
    toast.success("Ficha guardada");
    qc.invalidateQueries({ queryKey: ["coaches"] });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Ficha de {coach.full_name}</DialogTitle></DialogHeader>
        <p className="text-xs text-slate-500">{coach.email}</p>
        <div className="space-y-3">
          <div><Label>Nombre y apellidos</Label><Input value={f.nombre_completo_oficial} onChange={set("nombre_completo_oficial")} /></div>
          <div><Label>DNI / NIE</Label><Input value={f.dni_entrenador} onChange={set("dni_entrenador")} /></div>
          <div><Label>Teléfono</Label><Input value={f.telefono_contacto} onChange={set("telefono_contacto")} /></div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={saving} onClick={guardar} className="bg-orange-600 hover:bg-orange-700">{saving ? "Guardando..." : "Guardar"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
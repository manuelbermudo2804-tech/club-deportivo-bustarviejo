import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Check, X, HelpCircle, Clock, Loader2 } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "asistire", label: "Asistirá", icon: Check, color: "bg-green-500 hover:bg-green-600 text-white" },
  { value: "no_asistire", label: "No asiste", icon: X, color: "bg-red-500 hover:bg-red-600 text-white" },
  { value: "duda", label: "Duda", icon: HelpCircle, color: "bg-yellow-500 hover:bg-yellow-600 text-white" },
  { value: "pendiente", label: "Pendiente", icon: Clock, color: "bg-slate-400 hover:bg-slate-500 text-white" },
];

export default function AdminQuickConfirmDialog({ open, onOpenChange, callup, onUpdated }) {
  const [saving, setSaving] = useState(false);
  const [localJugadores, setLocalJugadores] = useState(
    () => (callup?.jugadores_convocados || []).map(j => ({ ...j }))
  );

  React.useEffect(() => {
    if (open && callup) {
      setLocalJugadores((callup.jugadores_convocados || []).map(j => ({ ...j })));
    }
  }, [open, callup?.id]);

  const handleChange = (idx, newStatus) => {
    setLocalJugadores(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], confirmacion: newStatus, fecha_confirmacion: new Date().toISOString() };
      return copy;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.Convocatoria.update(callup.id, {
        jugadores_convocados: localJugadores
      });
      toast.success("Confirmaciones actualizadas");
      onUpdated?.();
      onOpenChange(false);
    } catch (e) {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const statusBadge = (status) => {
    const opt = STATUS_OPTIONS.find(o => o.value === status);
    if (!opt) return null;
    const colors = {
      asistire: "bg-green-100 text-green-800",
      no_asistire: "bg-red-100 text-red-800",
      duda: "bg-yellow-100 text-yellow-800",
      pendiente: "bg-slate-100 text-slate-700",
    };
    return <Badge className={`text-xs ${colors[status]}`}>{opt.label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">⚡ Confirmar asistencia (Admin)</DialogTitle>
          <p className="text-xs text-amber-600 font-medium">
            ⚠️ Provisional — solo para demostración. Los padres confirmarán desde su app.
          </p>
        </DialogHeader>

        <div className="space-y-2 mt-2">
          {localJugadores.map((j, idx) => (
            <div key={j.jugador_id || idx} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{j.jugador_nombre}</p>
                <div className="mt-1">{statusBadge(j.confirmacion)}</div>
              </div>
              <div className="flex gap-1 shrink-0">
                {STATUS_OPTIONS.slice(0, 3).map(opt => {
                  const Icon = opt.icon;
                  const isActive = j.confirmacion === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleChange(idx, opt.value)}
                      className={`p-1.5 rounded-md transition-all ${
                        isActive ? opt.color + " ring-2 ring-offset-1 ring-slate-400" : "bg-slate-200 hover:bg-slate-300 text-slate-600"
                      }`}
                      title={opt.label}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Guardar cambios
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
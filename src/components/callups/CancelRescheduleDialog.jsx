import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Ban, RefreshCw, Loader2 } from "lucide-react";

export default function CancelRescheduleDialog({ open, onOpenChange, callup, mode, onConfirm, isSubmitting }) {
  const [motivo, setMotivo] = useState("");
  const [nuevaFecha, setNuevaFecha] = useState(callup?.fecha_partido || "");
  const [nuevaHora, setNuevaHora] = useState(callup?.hora_partido || "");

  const isCancelMode = mode === "cancel";

  const handleSubmit = () => {
    if (isCancelMode) {
      onConfirm({ motivo });
    } else {
      onConfirm({ motivo, nuevaFecha, nuevaHora });
    }
  };

  const isValid = isCancelMode
    ? motivo.trim().length > 0
    : motivo.trim().length > 0 && nuevaFecha && nuevaHora;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            {isCancelMode ? (
              <>
                <Ban className="w-5 h-5 text-red-600" />
                Cancelar Convocatoria
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5 text-amber-600" />
                Reprogramar Convocatoria
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            <strong>{callup?.titulo}</strong>
            {callup?.rival && ` vs ${callup.rival}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isCancelMode && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-sm text-red-800">
                <strong>⚠️ Atención:</strong> Se notificará a todos los padres/jugadores de la cancelación por email y chat del grupo.
              </p>
            </div>
          )}

          {!isCancelMode && (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-sm text-amber-800">
                  <strong>📅 Cambia la fecha/hora:</strong> Se notificará a todos del cambio.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Nueva Fecha *</Label>
                  <Input
                    type="date"
                    value={nuevaFecha}
                    onChange={(e) => setNuevaFecha(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Nueva Hora *</Label>
                  <Input
                    type="time"
                    value={nuevaHora}
                    onChange={(e) => setNuevaHora(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Motivo *</Label>
            <Textarea
              placeholder={isCancelMode 
                ? "Ej: Lluvia torrencial, campo inundado..." 
                : "Ej: Cambio de horario por el rival..."}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} size="sm">
            Volver
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className={isCancelMode
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "bg-amber-600 hover:bg-amber-700 text-white"
            }
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando...</>
            ) : isCancelMode ? (
              <><Ban className="w-4 h-4 mr-2" /> Confirmar Cancelación</>
            ) : (
              <><RefreshCw className="w-4 h-4 mr-2" /> Confirmar Reprogramación</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
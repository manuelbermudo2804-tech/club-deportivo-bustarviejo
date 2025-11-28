import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

export default function PlayerAvailabilityDialog({ player, open, onOpenChange, onSave, isSaving }) {
  const [lesionado, setLesionado] = useState(player?.lesionado || false);
  const [sancionado, setSancionado] = useState(player?.sancionado || false);
  const [motivo, setMotivo] = useState(player?.motivo_indisponibilidad || "");
  const [fechaDisponibilidad, setFechaDisponibilidad] = useState(player?.fecha_disponibilidad || "");

  const handleSave = () => {
    onSave({
      lesionado,
      sancionado,
      motivo_indisponibilidad: (lesionado || sancionado) ? motivo : "",
      fecha_disponibilidad: (lesionado || sancionado) ? fechaDisponibilidad : ""
    });
  };

  const isUnavailable = lesionado || sancionado;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isUnavailable ? (
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            )}
            Disponibilidad de {player?.nombre}
          </DialogTitle>
          <DialogDescription>
            Indica si el jugador está disponible para entrenamientos y partidos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Estado Actual */}
          <div className="flex justify-center">
            {isUnavailable ? (
              <Badge className="bg-amber-100 text-amber-800 text-lg px-4 py-2">
                ⚠️ No Disponible
              </Badge>
            ) : (
              <Badge className="bg-green-100 text-green-800 text-lg px-4 py-2">
                ✅ Disponible
              </Badge>
            )}
          </div>

          {/* Toggle Lesionado */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-red-50 border-2 border-red-200">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🤕</span>
              <div>
                <Label className="text-base font-medium text-red-900">Lesionado</Label>
                <p className="text-xs text-red-700">El jugador tiene una lesión</p>
              </div>
            </div>
            <Switch
              checked={lesionado}
              onCheckedChange={(checked) => {
                setLesionado(checked);
                if (checked) setSancionado(false);
              }}
              className="data-[state=checked]:bg-red-600"
            />
          </div>

          {/* Toggle Sancionado */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-orange-50 border-2 border-orange-200">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🚫</span>
              <div>
                <Label className="text-base font-medium text-orange-900">Sancionado</Label>
                <p className="text-xs text-orange-700">El jugador tiene una sanción</p>
              </div>
            </div>
            <Switch
              checked={sancionado}
              onCheckedChange={(checked) => {
                setSancionado(checked);
                if (checked) setLesionado(false);
              }}
              className="data-[state=checked]:bg-orange-600"
            />
          </div>

          {/* Campos adicionales cuando no está disponible */}
          {isUnavailable && (
            <div className="space-y-4 p-4 rounded-lg bg-slate-50 border">
              <div className="space-y-2">
                <Label>Motivo de la {lesionado ? "lesión" : "sanción"}</Label>
                <Textarea
                  placeholder={lesionado ? "Ej: Esguince de tobillo..." : "Ej: Acumulación de tarjetas..."}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Fecha estimada de disponibilidad</Label>
                <Input
                  type="date"
                  value={fechaDisponibilidad}
                  onChange={(e) => setFechaDisponibilidad(e.target.value)}
                />
                <p className="text-xs text-slate-500">
                  Fecha en la que se espera que el jugador vuelva a estar disponible
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className={isUnavailable ? "bg-amber-600 hover:bg-amber-700" : "bg-green-600 hover:bg-green-700"}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
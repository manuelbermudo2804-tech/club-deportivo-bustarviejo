import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

const positions = [
  { value: "Portero", emoji: "🧤", color: "from-blue-500 to-blue-600", bg: "bg-blue-50 border-blue-300" },
  { value: "Defensa", emoji: "🛡️", color: "from-green-500 to-green-600", bg: "bg-green-50 border-green-300" },
  { value: "Medio", emoji: "🎯", color: "from-yellow-500 to-amber-600", bg: "bg-yellow-50 border-yellow-300" },
  { value: "Delantero", emoji: "⚡", color: "from-red-500 to-red-600", bg: "bg-red-50 border-red-300" },
  { value: "Sin asignar", emoji: "⚽", color: "from-slate-400 to-slate-500", bg: "bg-slate-50 border-slate-300" },
];

export default function PlayerPositionDialog({ player, open, onOpenChange, onSave, isSaving }) {
  const [posicion, setPosicion] = useState(player?.posicion || "Sin asignar");
  const [dorsal, setDorsal] = useState(player?.numero_camiseta || "");

  // Sync state when player changes
  React.useEffect(() => {
    if (player) {
      setPosicion(player.posicion || "Sin asignar");
      setDorsal(player.numero_camiseta || "");
    }
  }, [player?.id, open]);

  const handleSave = () => {
    onSave({
      posicion,
      numero_camiseta: dorsal ? String(dorsal) : ""
    });
  };

  if (!player) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {player.foto_url ? (
              <img src={player.foto_url} alt={player.nombre} className="w-12 h-12 rounded-full object-cover border-2 border-orange-300" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-lg">
                {player.nombre?.charAt(0)}
              </div>
            )}
            <div>
              <p className="text-base">{player.nombre}</p>
              <p className="text-xs text-slate-500 font-normal">{player.categoria_principal || player.deporte}</p>
            </div>
          </DialogTitle>
          <DialogDescription>
            Asigna la posición y dorsal del jugador
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Posición */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Posición</Label>
            <div className="grid grid-cols-2 gap-2">
              {positions.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPosicion(p.value)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    posicion === p.value
                      ? `${p.bg} ring-2 ring-offset-1 ring-blue-500 shadow-md`
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{p.emoji}</span>
                    <span className={`text-sm font-semibold ${posicion === p.value ? "text-slate-900" : "text-slate-600"}`}>
                      {p.value}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Dorsal */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Dorsal (opcional)</Label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min="1"
                max="99"
                value={dorsal}
                onChange={(e) => setDorsal(e.target.value)}
                placeholder="Ej: 10"
                className="w-24 text-center text-lg font-bold"
              />
              {dorsal && (
                <div className="w-12 h-12 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg border-2 border-white">
                  {dorsal}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
            {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</> : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
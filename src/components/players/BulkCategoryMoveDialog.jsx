import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowRight, Info, Loader2, Users } from "lucide-react";
import { toast } from "sonner";

/**
 * Diálogo de traspaso masivo de categoría.
 * Mueve varios jugadores de una categoría a otra ya existente cambiando SOLO
 * el campo de categoría del jugador (deporte + categoria_principal + categorias).
 * NO toca cuotas, pagos ni recalcula nada: cada jugador conserva sus pagos tal cual.
 */
export default function BulkCategoryMoveDialog({ open, onOpenChange, players, onDone }) {
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [saving, setSaving] = useState(false);

  const getCat = (p) => p.categoria_principal || p.deporte;

  // Solo jugadores activos para el traspaso
  const activePlayers = useMemo(() => players.filter(p => p.activo), [players]);

  // Categorías existentes (ordenadas)
  const categorias = useMemo(
    () => [...new Set(activePlayers.map(getCat).filter(Boolean))].sort(),
    [activePlayers]
  );

  // Jugadores de la categoría origen
  const jugadoresOrigen = useMemo(
    () => (origen ? activePlayers.filter(p => getCat(p) === origen) : []),
    [origen, activePlayers]
  );

  const toggleId = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const allSelected = jugadoresOrigen.length > 0 && selectedIds.length === jugadoresOrigen.length;
  const toggleAll = () => {
    setSelectedIds(allSelected ? [] : jugadoresOrigen.map(p => p.id));
  };

  const handleOrigenChange = (val) => {
    setOrigen(val);
    setSelectedIds([]);
  };

  const reset = () => {
    setOrigen(""); setDestino(""); setSelectedIds([]); setSaving(false);
  };

  const handleClose = () => {
    if (saving) return;
    reset();
    onOpenChange(false);
  };

  const handleMove = async () => {
    if (!destino || selectedIds.length === 0) return;
    setSaving(true);
    try {
      let moved = 0;
      for (const id of selectedIds) {
        const player = jugadoresOrigen.find(p => p.id === id);
        if (!player) continue;
        // Actualizar SOLO campos de categoría, sin tocar cuotas/pagos
        const patch = { deporte: destino };
        if (player.categoria_principal) patch.categoria_principal = destino;
        if (Array.isArray(player.categorias) && player.categorias.length > 0) {
          patch.categorias = player.categorias.map(c => (c === origen ? destino : c));
        }
        await base44.entities.Player.update(id, patch);
        moved++;
      }
      toast.success(`${moved} jugador${moved !== 1 ? 'es' : ''} movido${moved !== 1 ? 's' : ''} a "${destino}" (sin cambios en cuotas)`);
      reset();
      onOpenChange(false);
      if (onDone) onDone();
    } catch (err) {
      console.error("Error moviendo jugadores:", err);
      toast.error("Error al mover jugadores: " + (err.message || ""));
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-600" />
            Juntar categorías
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 text-sm">
              Mueve jugadores de una categoría a otra ya existente. <strong>Las cuotas y pagos NO cambian</strong>: cada jugador conserva exactamente lo que tenía.
            </AlertDescription>
          </Alert>

          {/* Origen y destino */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-end gap-3">
            <div className="space-y-2">
              <Label>Categoría origen</Label>
              <Select value={origen} onValueChange={handleOrigenChange}>
                <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                <SelectContent className="max-h-[50vh]">
                  {categorias.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat} ({activePlayers.filter(p => getCat(p) === cat).length})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="hidden sm:flex justify-center pb-2">
              <ArrowRight className="w-5 h-5 text-slate-400" />
            </div>
            <div className="space-y-2">
              <Label>Categoría destino</Label>
              <Select value={destino} onValueChange={setDestino}>
                <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                <SelectContent className="max-h-[50vh]">
                  {categorias.filter(c => c !== origen).map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Lista de jugadores del origen */}
          {origen && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Jugadores a mover</Label>
                {jugadoresOrigen.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="text-xs font-medium text-orange-600 hover:text-orange-700"
                  >
                    {allSelected ? "Desmarcar todos" : "Marcar todos"}
                  </button>
                )}
              </div>
              {jugadoresOrigen.length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center">No hay jugadores activos en esta categoría.</p>
              ) : (
                <div className="border rounded-lg divide-y max-h-[40vh] overflow-y-auto">
                  {jugadoresOrigen.map(p => (
                    <label
                      key={p.id}
                      className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50"
                    >
                      <Checkbox
                        checked={selectedIds.includes(p.id)}
                        onCheckedChange={() => toggleId(p.id)}
                      />
                      <span className="text-sm text-slate-800">{p.nombre}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleClose} disabled={saving}>Cancelar</Button>
            <Button
              onClick={handleMove}
              disabled={!destino || selectedIds.length === 0 || saving}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Mover {selectedIds.length > 0 ? `${selectedIds.length} ` : ""}jugador{selectedIds.length !== 1 ? "es" : ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
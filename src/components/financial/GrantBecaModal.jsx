import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Modal para conceder una beca a un jugador desde el Fondo Solidario.
 * - Selecciona jugador
 * - Importe (no puede superar el disponible)
 * - Motivo (opcional)
 * Al confirmar: crea registro Beca + aplica ajuste_cuota al jugador.
 */
export default function GrantBecaModal({ open, onOpenChange, temporada, disponible, players = [], onSuccess }) {
  const [jugadorId, setJugadorId] = useState("");
  const [importe, setImporte] = useState("");
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);

  const activePlayers = useMemo(
    () => (players || []).filter((p) => p.activo !== false).sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "")),
    [players]
  );

  const selectedPlayer = useMemo(
    () => activePlayers.find((p) => p.id === jugadorId),
    [activePlayers, jugadorId]
  );

  const importeNum = Number(importe) || 0;
  const importeValido = importeNum > 0 && importeNum <= disponible;

  const reset = () => {
    setJugadorId("");
    setImporte("");
    setMotivo("");
  };

  const handleClose = () => {
    if (saving) return;
    reset();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!jugadorId || !selectedPlayer) {
      toast.error("Selecciona un jugador");
      return;
    }
    if (!importeValido) {
      toast.error(`El importe debe ser mayor que 0 y máximo ${disponible.toFixed(2)}€`);
      return;
    }

    setSaving(true);
    try {
      const me = await base44.auth.me();

      // 1) Crear registro de Beca
      await base44.entities.Beca.create({
        temporada,
        jugador_id: jugadorId,
        jugador_nombre: selectedPlayer.nombre,
        categoria: selectedPlayer.categoria_principal || selectedPlayer.deporte || "",
        importe: importeNum,
        motivo: motivo.trim() || "Beca concedida desde Fondo Solidario",
        estado: "activa",
        concedida_por: me?.email || "",
        fecha_concesion: new Date().toISOString(),
      });

      // 2) Aplicar ajuste de cuota al jugador (descuento)
      const cuotaOriginal = Number(selectedPlayer?.ajuste_cuota?.cuota_original) || 0;
      const cuotaAjustadaPrevia = Number(selectedPlayer?.ajuste_cuota?.cuota_ajustada) || cuotaOriginal;
      const nuevaCuotaAjustada = Math.max(0, cuotaAjustadaPrevia - importeNum);

      await base44.entities.Player.update(jugadorId, {
        ajuste_cuota: {
          cuota_original: cuotaOriginal || cuotaAjustadaPrevia,
          cuota_ajustada: nuevaCuotaAjustada,
          motivo: `Beca Fondo Solidario: ${motivo.trim() || "Sin especificar"}`.slice(0, 200),
          motivo_tipo: "descuento_familiar",
          notas: `Beca de ${importeNum.toFixed(2)}€ concedida desde el Fondo Solidario por ${me?.email || "admin"}`,
          ajustado_por: me?.email || "",
          fecha_ajuste: new Date().toISOString(),
        },
      });

      toast.success(`Beca de ${importeNum.toFixed(2)}€ concedida a ${selectedPlayer.nombre}`);
      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      console.error("Error al conceder beca:", err);
      toast.error("Error al conceder la beca");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-700">
            <Heart className="w-5 h-5" />
            Conceder Beca del Fondo Solidario
          </DialogTitle>
          <DialogDescription>
            Descuenta el importe de la cuota del jugador y queda registrado en el histórico.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-xs text-slate-600">Disponible en el Fondo</p>
            <p className="text-xl font-bold text-green-700">{disponible.toFixed(2)}€</p>
          </div>

          <div>
            <Label htmlFor="jugador">Jugador a becar *</Label>
            <Select value={jugadorId} onValueChange={setJugadorId}>
              <SelectTrigger id="jugador">
                <SelectValue placeholder="Selecciona un jugador..." />
              </SelectTrigger>
              <SelectContent>
                {activePlayers.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-slate-500">No hay jugadores activos</div>
                ) : (
                  activePlayers.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre} {p.categoria_principal ? `— ${p.categoria_principal}` : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="importe">Importe de la beca (€) *</Label>
            <Input
              id="importe"
              type="number"
              min="0"
              step="0.01"
              max={disponible}
              value={importe}
              onChange={(e) => setImporte(e.target.value)}
              placeholder="Ej: 50"
            />
            {importeNum > disponible && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Supera el disponible
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="motivo">Motivo (opcional)</Label>
            <Textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Situación familiar, justificación interna..."
              rows={2}
            />
            <p className="text-xs text-slate-500 mt-1">Solo visible para administradores.</p>
          </div>

          {selectedPlayer && importeValido && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
              Se aplicará un descuento de <strong>{importeNum.toFixed(2)}€</strong> a la cuota de <strong>{selectedPlayer.nombre}</strong>.
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !importeValido || !jugadorId}
            className="bg-green-600 hover:bg-green-700"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Heart className="w-4 h-4 mr-2" />}
            Conceder beca
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
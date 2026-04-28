import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserCheck, Trash2 } from "lucide-react";

export default function PairParentsDialog({
  open,
  onOpenChange,
  pairingContext,
  setPairingContext,
  players,
  getUserPlayers,
  onConfirm,
  onClearSecondParent,
  isPending,
}) {
  const playerOptions = pairingContext.user
    ? getUserPlayers(pairingContext.user.email)
    : players;
  const selectedPlayer = players.find((p) => p.id === pairingContext.playerId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">👨‍👩‍👧 Casar progenitores</DialogTitle>
          <DialogDescription>
            Vincula manualmente a dos progenitores en la ficha de un jugador.
            Importante: el primer progenitor se mantiene como <strong>email_padre</strong> y
            el segundo se establece como <strong>email_tutor_2</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {pairingContext.user && (
            <div className="bg-blue-50 border border-blue-300 rounded p-3 text-sm">
              <p className="font-bold text-blue-900">Progenitor actual:</p>
              <p className="text-blue-800">
                {pairingContext.user.full_name} ({pairingContext.user.email})
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Jugador *</Label>
            <Select
              value={pairingContext.playerId}
              onValueChange={(v) =>
                setPairingContext((prev) => ({ ...prev, playerId: v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona jugador" />
              </SelectTrigger>
              <SelectContent>
                {playerOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedPlayer && (
            <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs space-y-1">
              <p>
                <strong>Progenitor 1:</strong>{" "}
                {selectedPlayer.email_padre || <em className="text-slate-400">vacío</em>}
              </p>
              <p>
                <strong>Progenitor 2:</strong>{" "}
                {selectedPlayer.email_tutor_2 || <em className="text-slate-400">vacío</em>}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Email del segundo progenitor *</Label>
            <Input
              type="email"
              placeholder="email@ejemplo.com"
              value={pairingContext.partnerEmail}
              onChange={(e) =>
                setPairingContext((prev) => ({
                  ...prev,
                  partnerEmail: e.target.value,
                }))
              }
            />
            <p className="text-xs text-slate-500">
              Si el jugador ya tiene segundo progenitor distinto, te pediremos confirmación antes de reemplazar.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="outline"
            className="text-red-700 border-red-300 hover:bg-red-50"
            onClick={onClearSecondParent}
            disabled={!pairingContext.playerId || isPending}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Quitar 2º progenitor
          </Button>
          <Button
            onClick={onConfirm}
            disabled={
              !pairingContext.playerId || !pairingContext.partnerEmail || isPending
            }
            className="bg-orange-600 hover:bg-orange-700"
          >
            <UserCheck className="w-4 h-4 mr-2" />
            Confirmar emparejado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
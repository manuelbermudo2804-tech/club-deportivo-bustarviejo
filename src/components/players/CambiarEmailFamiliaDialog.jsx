import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const FIELDS = [
  { key: "email_padre", label: "Tutor/a 1" },
  { key: "email_tutor_2", label: "Tutor/a 2" },
  { key: "email_jugador", label: "Jugador (mayor de edad)" },
  { key: "acceso_menor_email", label: "Acceso del menor" },
];

export default function CambiarEmailFamiliaDialog({ open, onOpenChange, players = [], onDone }) {
  const [playerId, setPlayerId] = useState("");
  const [field, setField] = useState("email_padre");
  const [newEmail, setNewEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const player = players.find(p => p.id === playerId);
  const available = FIELDS.filter(f => player?.[f.key]);
  const oldEmail = player?.[field] || "";

  const reset = () => { setPlayerId(""); setField("email_padre"); setNewEmail(""); };

  const handleSave = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!player || !email || !email.includes("@")) {
      toast.error("Selecciona un jugador y escribe un correo válido");
      return;
    }
    setSaving(true);
    try {
      await base44.entities.Player.update(player.id, { [field]: email });

      // Arrastrar el histórico de pagos al correo nuevo (si era un tutor)
      let migrated = 0;
      if (field === "email_padre" || field === "email_tutor_2") {
        const pays = await base44.entities.Payment.filter({ jugador_id: player.id });
        const toFix = pays.filter(p => p[field] === oldEmail);
        if (toFix.length > 0) {
          await base44.entities.Payment.bulkUpdate(toFix.map(p => ({ id: p.id, [field]: email })));
          migrated = toFix.length;
        }
      }

      toast.success(`Correo actualizado${migrated ? ` · ${migrated} pagos migrados` : ""}`);
      reset();
      onOpenChange(false);
      onDone?.();
    } catch (e) {
      toast.error("Error al cambiar el correo: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-orange-600" />
            Cambiar correo de la familia
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Jugador</Label>
            <Select value={playerId} onValueChange={(v) => { setPlayerId(v); setNewEmail(""); }}>
              <SelectTrigger><SelectValue placeholder="Selecciona un jugador" /></SelectTrigger>
              <SelectContent>
                {players.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nombre} — {p.categoria_principal || p.deporte}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {player && available.length > 0 && (
            <div className="space-y-2">
              <Label>¿Qué correo quieres cambiar?</Label>
              <RadioGroup value={field} onValueChange={setField} className="space-y-2">
                {available.map(f => (
                  <div key={f.key} className="flex items-center gap-2 bg-slate-50 rounded-lg p-2 border">
                    <RadioGroupItem value={f.key} id={`f-${f.key}`} />
                    <Label htmlFor={`f-${f.key}`} className="cursor-pointer text-sm">
                      <span className="font-semibold">{f.label}:</span> {player[f.key]}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {player && (
            <div className="space-y-2">
              <Label>Correo nuevo</Label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="nuevo@correo.com"
              />
              {oldEmail && newEmail && (
                <p className="text-xs text-slate-600 flex items-center gap-1">
                  {oldEmail} <ArrowRight className="w-3 h-3" /> {newEmail.trim().toLowerCase()}
                </p>
              )}
              <p className="text-xs text-slate-500">
                El jugador y todos sus datos se mantienen; la familia entrará con el correo nuevo y el
                histórico de pagos se migra automáticamente.
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-orange-600 hover:bg-orange-700"
              onClick={handleSave}
              disabled={saving || !player || !newEmail.trim()}
            >
              {saving ? "Guardando..." : "Cambiar correo"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
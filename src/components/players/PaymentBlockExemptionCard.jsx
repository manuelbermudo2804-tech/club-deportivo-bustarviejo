import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Save } from "lucide-react";
import { toast } from "sonner";

/**
 * Tarjeta admin/tesorero para excluir a un jugador del bloqueo automático
 * por impago en convocatorias. Solo visible internamente.
 */
export default function PaymentBlockExemptionCard({ player, onUpdated }) {
  const [exento, setExento] = useState(player.exento_bloqueo_impago === true);
  const [motivo, setMotivo] = useState(player.motivo_exencion_bloqueo || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.Player.update(player.id, {
        exento_bloqueo_impago: exento,
        motivo_exencion_bloqueo: exento ? motivo : "",
      });
      toast.success(exento ? "Jugador excluido del bloqueo por impago" : "Exclusión retirada");
      onUpdated?.();
    } catch (e) {
      toast.error("Error al guardar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-2 border-purple-200 shadow-lg bg-purple-50/40">
      <CardHeader className="border-b border-purple-200">
        <CardTitle className="text-lg flex items-center gap-2 text-purple-800">
          <ShieldCheck className="w-5 h-5" />
          Excepción de bloqueo por impago
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <p className="text-xs text-slate-600">
          Si está activado, este jugador <strong>no se marcará como moroso</strong> en convocatorias
          aunque tenga cuotas vencidas. Útil para becas, acuerdos con directiva o situaciones
          familiares especiales. <strong>El entrenador no ve este motivo.</strong>
        </p>

        <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
          <Label htmlFor="exento-switch" className="cursor-pointer font-semibold">
            Excluir del bloqueo automático
          </Label>
          <Switch id="exento-switch" checked={exento} onCheckedChange={setExento} />
        </div>

        {exento && (
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo (solo visible para admin / tesorero)</Label>
            <Textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: Beca aprobada por directiva en junta del 15/05/2026"
              rows={3}
            />
          </div>
        )}

        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-purple-600 hover:bg-purple-700 w-full"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Guardando..." : "Guardar excepción"}
        </Button>
      </CardContent>
    </Card>
  );
}
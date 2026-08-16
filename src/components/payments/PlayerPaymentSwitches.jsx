import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Switch } from "@/components/ui/switch";
import { Bell, Ban, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Dos interruptores manuales por jugador (solo club):
 *  1. Recordatorio: la familia ve un banner de cuota pendiente.
 *  2. Fuera de convocatorias: el jugador no entra en convocatorias y la familia lo ve.
 */
export default function PlayerPaymentSwitches({ player, onUpdated }) {
  const [aviso, setAviso] = useState(player.aviso_impago_activo === true);
  const [bloqueo, setBloqueo] = useState(player.bloqueo_convocatoria_activo === true);
  const [saving, setSaving] = useState(false);

  const save = async (data, apply) => {
    setSaving(true);
    try {
      await base44.entities.Player.update(player.id, data);
      apply();
      onUpdated?.();
    } catch (e) {
      toast.error("No se pudo guardar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const alDia = !aviso && !bloqueo;

  return (
    <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
      {alDia && (
        <p className="flex items-center gap-1.5 text-xs text-green-700">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Sin avisos activos — la familia no ve ningún mensaje
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-xs font-medium text-amber-800">
          <Bell className="w-4 h-4 text-amber-600" />
          Mostrar recordatorio de pago a la familia
        </span>
        <Switch
          disabled={saving}
          checked={aviso}
          onCheckedChange={(v) => save({ aviso_impago_activo: v }, () => setAviso(v))}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-xs font-medium text-red-800">
          <Ban className="w-4 h-4 text-red-600" />
          Fuera de convocatorias hasta estar al corriente
        </span>
        <Switch
          disabled={saving}
          checked={bloqueo}
          onCheckedChange={(v) => save({ bloqueo_convocatoria_activo: v }, () => setBloqueo(v))}
        />
      </div>
    </div>
  );
}
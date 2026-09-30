import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { useActiveSeason } from "@/components/season/SeasonProvider";
import { sameSeason } from "@/lib/sameSeason";

// Interruptor "Pagado esta temporada" en la tarjeta del patrocinador
export default function SponsorPagoTemporada({ sponsor }) {
  const { activeSeason } = useActiveSeason();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const pagos = sponsor.pagos_temporadas || [];
  const pago = pagos.find(p => sameSeason(p.temporada, activeSeason));

  const toggle = async (checked) => {
    setSaving(true);
    const me = await base44.auth.me();
    const resto = pagos.filter(p => !sameSeason(p.temporada, activeSeason));
    const nuevos = checked
      ? [...resto, { temporada: activeSeason, fecha_pago: new Date().toISOString().slice(0, 10), importe: sponsor.precio_anual || 0, marcado_por: me.email }]
      : resto;
    await base44.entities.Sponsor.update(sponsor.id, { pagos_temporadas: nuevos });
    await queryClient.invalidateQueries({ queryKey: ['sponsors'] });
    setSaving(false);
    toast.success(checked ? "Marcado como pagado" : "Marcado como pendiente");
  };

  return (
    <div className={`mb-4 p-3 rounded-lg border-2 flex items-center justify-between gap-2 ${pago ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-300'}`}>
      <div className="flex items-center gap-2 min-w-0">
        {pago ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" /> : <Clock className="w-5 h-5 text-red-500 shrink-0" />}
        <div className="min-w-0">
          <p className={`text-sm font-bold ${pago ? 'text-green-800' : 'text-red-700'}`}>
            {pago ? `PAGADO ${activeSeason}` : `PENDIENTE ${activeSeason}`}
          </p>
          {pago?.fecha_pago && <p className="text-[11px] text-green-700">el {new Date(pago.fecha_pago).toLocaleDateString('es-ES')}</p>}
        </div>
      </div>
      <Switch checked={!!pago} disabled={saving} onCheckedChange={toggle} />
    </div>
  );
}
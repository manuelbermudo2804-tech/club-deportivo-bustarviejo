import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";
import useTemaFestivo from "@/hooks/useTemaFestivo";
import { TEMAS_FESTIVOS } from "./temasFestivos";
import PruebaFestivaAdmin from "./PruebaFestivaAdmin";

// Panel de admin para activar/desactivar a mano la decoración festiva de la app.
export default function TemaFestivoPanel() {
  const qc = useQueryClient();
  const { registro } = useTemaFestivo();
  const [saving, setSaving] = useState(false);
  const activo = registro?.tema && registro.tema !== "ninguno" ? registro.tema : null;

  const guardar = async (data) => {
    setSaving(true);
    const me = await base44.auth.me();
    const payload = { ...data, activado_por: me.email };
    if (registro) await base44.entities.TemaFestivo.update(registro.id, payload);
    else await base44.entities.TemaFestivo.create({ tema: "ninguno", particulas: true, ...payload });
    await qc.invalidateQueries({ queryKey: ["temaFestivo"] });
    setSaving(false);
    toast.success(data.tema === "ninguno" ? "Decoración desactivada" : "Decoración actualizada");
  };

  return (
    <div className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-violet-600" />
        <p className="font-bold text-slate-900">Decoración festiva de la app</p>
        {saving && <Loader2 className="w-4 h-4 animate-spin text-violet-600" />}
      </div>
      <p className="text-xs text-slate-600">Pulsa una tarjeta para <strong>activarlo para TODOS</strong>. Nada se activa solo.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Object.entries(TEMAS_FESTIVOS).map(([clave, t]) => (
          <button
            key={clave}
            disabled={saving}
            onClick={() => guardar({ tema: clave })}
            className={`relative h-28 rounded-xl bg-gradient-to-br ${t.fondo} text-white text-left p-3 overflow-hidden transition-transform hover:scale-[1.03] ${activo === clave ? "ring-4 ring-violet-500 ring-offset-2" : ""}`}
          >
            <span className="absolute right-2 bottom-1 text-5xl opacity-90">{t.emoji}</span>
            <span className="font-black text-sm">{t.nombre}</span>
            {activo === clave && <span className="absolute top-2 right-2 bg-white text-violet-700 rounded-full p-0.5"><Check className="w-3.5 h-3.5" /></span>}
          </button>
        ))}
      </div>

      <PruebaFestivaAdmin />

      {activo && (
        <div className="space-y-3 pt-2 border-t border-violet-100">
          <div className="flex items-center justify-between">
            <span className="text-sm">✨ Efecto animado (nieve, estrellas, confeti…)</span>
            <Switch checked={registro?.particulas !== false} onCheckedChange={(v) => guardar({ particulas: v })} />
          </div>
          <Input
            key={registro?.id + activo}
            defaultValue={registro?.mensaje || ""}
            placeholder={`Mensaje personalizado (por defecto: "${TEMAS_FESTIVOS[activo].mensaje.slice(0, 40)}…")`}
            onBlur={(e) => e.target.value !== (registro?.mensaje || "") && guardar({ mensaje: e.target.value })}
          />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.open(`/?epoca=${activo}`, "_blank")}>Ver cómo queda</Button>
            <Button variant="destructive" size="sm" disabled={saving} onClick={() => guardar({ tema: "ninguno" })}>Desactivar decoración</Button>
          </div>
        </div>
      )}
    </div>
  );
}
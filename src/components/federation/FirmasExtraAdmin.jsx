import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Firmas federativas extra: solo para jugadores apuntados a más de una categoría
export default function FirmasExtraAdmin({ player }) {
  const queryClient = useQueryClient();
  const principal = player.categoria_principal || player.deporte;
  const extras = (player.categorias || []).filter((c) => c && c !== principal);
  const [firmas, setFirmas] = useState(player.firmas_extra || []);
  const [saving, setSaving] = useState(false);
  if (extras.length === 0) return null;

  const get = (cat) => firmas.find((f) => f.categoria === cat) || { categoria: cat, enlace: "", completada: false };
  const set = (cat, patch) => {
    const next = { ...get(cat), ...patch };
    if (patch.completada) next.fecha_completada = new Date().toISOString();
    setFirmas([...firmas.filter((f) => f.categoria !== cat), next]);
  };

  const save = async () => {
    setSaving(true);
    await base44.entities.Player.update(player.id, { firmas_extra: firmas });
    queryClient.invalidateQueries({ queryKey: ["players"] });
    setSaving(false);
    toast.success("Firmas extra guardadas");
  };

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-2">
      <p className="text-xs font-semibold text-blue-800">Firmas de otras categorías</p>
      {extras.map((cat) => {
        const f = get(cat);
        return (
          <div key={cat} className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-sm font-medium text-slate-700 sm:w-32 flex-shrink-0">{cat}:</span>
            <Input value={f.enlace} onChange={(e) => set(cat, { enlace: e.target.value })} placeholder="Enlace de firma de la federación" className="flex-1 bg-white" />
            <label className="flex items-center gap-1 text-xs cursor-pointer">
              <input type="checkbox" checked={!!f.completada} onChange={(e) => set(cat, { completada: e.target.checked })} />
              Firmado
            </label>
          </div>
        );
      })}
      <Button size="sm" onClick={save} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
        {saving ? "Guardando..." : "Guardar firmas extra"}
      </Button>
    </div>
  );
}
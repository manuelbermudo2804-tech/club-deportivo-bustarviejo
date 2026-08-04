import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Award } from "lucide-react";
import { toast } from "sonner";

// Equipo menos goleado en los partidos de la fase Oro (referencia para el Zamora).
function equipoMenosGoleadoOro(partidos, equipos) {
  const contra = {};
  const jugados = {};
  partidos
    .filter((p) => p.fase === "oro" && p.finalizado && p.marcador_local != null && p.marcador_visitante != null)
    .forEach((p) => {
      contra[p.equipo_local_id] = (contra[p.equipo_local_id] || 0) + p.marcador_visitante;
      contra[p.equipo_visitante_id] = (contra[p.equipo_visitante_id] || 0) + p.marcador_local;
      jugados[p.equipo_local_id] = (jugados[p.equipo_local_id] || 0) + 1;
      jugados[p.equipo_visitante_id] = (jugados[p.equipo_visitante_id] || 0) + 1;
    });
  const cand = Object.keys(jugados);
  if (cand.length === 0) return null;
  cand.sort((a, b) => contra[a] - contra[b]);
  const eq = equipos.find((e) => e.id === cand[0]);
  return eq ? { nombre: eq.nombre, encajados: contra[cand[0]] } : null;
}

// Panel para rellenar a mano los premios que el sistema no deduce:
// nombre del portero Zamora Oro y los MVP de Oro y Plata.
export default function PremiosManualesPanel({ torneo, categoria, equipos, partidos }) {
  const queryClient = useQueryClient();
  const partidosCat = partidos.filter((p) => p.categoria_id === categoria.id);
  const equiposCat = equipos.filter((e) => e.categoria_id === categoria.id);
  const zamora = equipoMenosGoleadoOro(partidosCat, equiposCat);

  const [form, setForm] = useState({
    zamora_oro_portero: "",
    mvp_oro_nombre: "",
    mvp_oro_equipo: "",
    mvp_plata_nombre: "",
    mvp_plata_equipo: "",
    ...(categoria.premios_manuales || {}),
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const guardar = useMutation({
    mutationFn: () => base44.entities.TorneoCategoria.update(categoria.id, { premios_manuales: form }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["torneo-full", torneo.id] }); toast.success("Premios guardados"); },
    onError: () => toast.error("Error al guardar"),
  });

  return (
    <div className="bg-white rounded-xl border p-4 space-y-4">
      <div className="flex items-center gap-2 text-slate-800 font-semibold">
        <Award className="w-5 h-5 text-purple-500" /> Premios manuales del palmarés
      </div>
      <p className="text-xs text-slate-500">
        El resto de premios (campeones, subcampeones, pichichi, equipo menos goleado) los calcula el sistema. Aquí solo rellenas lo que no se puede deducir.
      </p>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-600">🧤 Portero Zamora (Fase Oro)</label>
        {zamora ? (
          <p className="text-xs text-blue-600 bg-blue-50 rounded px-2 py-1">
            Equipo menos goleado de Oro: <strong>{zamora.nombre}</strong> ({zamora.encajados} encajados). Escribe el nombre de su portero.
          </p>
        ) : (
          <p className="text-xs text-slate-400">Aún no hay partidos de Oro finalizados para calcular el equipo menos goleado.</p>
        )}
        <Input value={form.zamora_oro_portero} onChange={(e) => set("zamora_oro_portero", e.target.value)} placeholder="Nombre del portero" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600">🌟 MVP Fase Oro</label>
          <Input value={form.mvp_oro_nombre} onChange={(e) => set("mvp_oro_nombre", e.target.value)} placeholder="Jugador" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600 invisible">Equipo</label>
          <Input value={form.mvp_oro_equipo} onChange={(e) => set("mvp_oro_equipo", e.target.value)} placeholder="Equipo" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600">🌟 MVP Fase Plata</label>
          <Input value={form.mvp_plata_nombre} onChange={(e) => set("mvp_plata_nombre", e.target.value)} placeholder="Jugador" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600 invisible">Equipo</label>
          <Input value={form.mvp_plata_equipo} onChange={(e) => set("mvp_plata_equipo", e.target.value)} placeholder="Equipo" />
        </div>
      </div>

      <Button onClick={() => guardar.mutate()} disabled={guardar.isPending} className="w-full">
        Guardar premios
      </Button>
    </div>
  );
}
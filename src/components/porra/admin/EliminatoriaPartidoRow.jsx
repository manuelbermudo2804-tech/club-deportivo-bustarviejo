import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

// Fila de partido eliminatorio con selectores de equipos + botones 1/X/2
export default function EliminatoriaPartidoRow({ partido, equipos, onUpdate }) {
  const [saving, setSaving] = useState(false);

  const equiposOrdenados = [...equipos].sort((a, b) => a.nombre.localeCompare(b.nombre));

  const handleSetEquipo = async (campo, codigo) => {
    setSaving(true);
    try {
      await base44.entities.PorraPartido.update(partido.id, {
        [campo]: codigo || "",
      });
      toast.success("Equipo asignado");
      onUpdate?.();
    } catch (e) {
      toast.error("Error: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResultado = async (resultado) => {
    if (!partido.equipo_local_codigo || !partido.equipo_visitante_codigo) {
      toast.error("Asigna primero los dos equipos");
      return;
    }
    setSaving(true);
    try {
      let ganador = "";
      if (resultado === "1") ganador = partido.equipo_local_codigo;
      else if (resultado === "2") ganador = partido.equipo_visitante_codigo;
      await base44.entities.PorraPartido.update(partido.id, {
        resultado_real: resultado,
        ganador_codigo: ganador,
        finalizado: true,
      });
      toast.success(`Resultado: ${resultado}`);
      onUpdate?.();
    } catch (e) {
      toast.error("Error: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const local = equipos.find(e => e.codigo === partido.equipo_local_codigo);
  const visit = equipos.find(e => e.codigo === partido.equipo_visitante_codigo);

  return (
    <div className="p-3 hover:bg-slate-50 border-b last:border-b-0">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-bold text-slate-500 w-20">Partido {partido.numero_partido}</span>
        {partido.finalizado && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
            ✓ Finalizado
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto] gap-2 items-center">
        <div className="flex items-center gap-2">
          <span className="text-xl">{local?.bandera_emoji || "🏳️"}</span>
          <select
            value={partido.equipo_local_codigo || ""}
            onChange={(e) => handleSetEquipo("equipo_local_codigo", e.target.value)}
            disabled={saving}
            className="flex-1 px-2 py-1.5 border rounded text-sm bg-white"
          >
            <option value="">— {partido.equipo_local_placeholder || "Local"} —</option>
            {equiposOrdenados.map(eq => (
              <option key={eq.codigo} value={eq.codigo}>
                {eq.bandera_emoji} {eq.nombre}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs text-slate-400 font-bold text-center px-1">VS</span>

        <div className="flex items-center gap-2">
          <span className="text-xl">{visit?.bandera_emoji || "🏳️"}</span>
          <select
            value={partido.equipo_visitante_codigo || ""}
            onChange={(e) => handleSetEquipo("equipo_visitante_codigo", e.target.value)}
            disabled={saving}
            className="flex-1 px-2 py-1.5 border rounded text-sm bg-white"
          >
            <option value="">— {partido.equipo_visitante_placeholder || "Visitante"} —</option>
            {equiposOrdenados.map(eq => (
              <option key={eq.codigo} value={eq.codigo}>
                {eq.bandera_emoji} {eq.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-1 justify-end">
          {["1", "X", "2"].map(r => (
            <button
              key={r}
              onClick={() => handleResultado(r)}
              disabled={saving}
              className={`w-9 h-9 rounded text-xs font-bold transition-all disabled:opacity-50 ${
                partido.resultado_real === r
                  ? "bg-green-600 text-white shadow scale-110"
                  : "bg-slate-200 hover:bg-slate-300 text-slate-700"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
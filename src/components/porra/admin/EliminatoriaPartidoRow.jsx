import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

// Fila de partido eliminatorio con selectores de equipos + botones 1/X/2
// Mantiene estado local para no recargar todo el panel admin al guardar
export default function EliminatoriaPartidoRow({ partido, equipos, todosLosEquipos = [], equiposUsadosEnFase = new Set(), onLocalChange }) {
  const [saving, setSaving] = useState(false);
  const [local, setLocal] = useState(partido);

  // Sincronizar si la prop cambia externamente, PERO sin perder nunca un resultado/equipo
  // que ya marcamos localmente y que la prop entrante aún no refleja (props con datos viejos
  // que llegan justo después de marcar, antes de que la BD recargue). Así un resultado marcado
  // jamás "desaparece" de la pantalla.
  useEffect(() => {
    setLocal(prev => {
      // Si la prop trae un resultado o ganador y el local no, o coinciden → usar la prop (datos frescos)
      const propTieneResultado = !!partido.resultado_real || !!partido.ganador_codigo;
      const localTieneResultado = !!prev?.resultado_real || !!prev?.ganador_codigo;
      // Si el local tiene un resultado marcado y la prop viene VACÍA (dato viejo), conservar el local
      if (localTieneResultado && !propTieneResultado && prev?.id === partido.id) {
        return prev;
      }
      // Igual para equipos asignados: no dejar que una prop vacía borre equipos ya puestos localmente
      const merged = { ...partido };
      if (!partido.equipo_local_codigo && prev?.equipo_local_codigo && prev.id === partido.id) {
        merged.equipo_local_codigo = prev.equipo_local_codigo;
      }
      if (!partido.equipo_visitante_codigo && prev?.equipo_visitante_codigo && prev.id === partido.id) {
        merged.equipo_visitante_codigo = prev.equipo_visitante_codigo;
      }
      return merged;
    });
  }, [partido.id, partido.updated_date, partido.resultado_real, partido.ganador_codigo, partido.equipo_local_codigo, partido.equipo_visitante_codigo]);

  const equiposOrdenados = [...equipos].sort((a, b) => a.nombre.localeCompare(b.nombre));

  // Filtrar equipos ya usados en OTROS partidos de la misma fase
  // (siempre permitir los dos equipos del partido actual)
  const getOpciones = (codigoActual) => {
    const codigosPartidoActual = new Set([local.equipo_local_codigo, local.equipo_visitante_codigo].filter(Boolean));
    return equiposOrdenados.filter(eq => {
      if (eq.codigo === codigoActual) return true;
      if (codigosPartidoActual.has(eq.codigo)) return false; // el otro equipo del mismo partido
      return !equiposUsadosEnFase.has(eq.codigo);
    });
  };

  // El equipo GUARDADO en el partido debe tener SIEMPRE su <option>, aunque el filtro de
  // equipos disponibles aún no lo incluya (p.ej. justo al recargar el panel al volver de pestaña,
  // antes de que carguen config/grupos). Sin esto, el <select> tiene un value sin option y
  // el navegador muestra el placeholder vacío, dando la falsa sensación de que "se borró".
  const optionEquipoGuardado = (codigo) => {
    if (!codigo) return null;
    if (equipos.some(eq => eq.codigo === codigo)) return null; // ya está en la lista
    // Buscar el equipo completo para mostrar bandera + nombre (no solo el código)
    const eq = todosLosEquipos.find(e => e.codigo === codigo);
    return <option value={codigo}>{eq ? `${eq.bandera_emoji} ${eq.nombre}` : codigo}</option>;
  };

  const handleSetEquipo = async (campo, codigo) => {
    setSaving(true);
    const previo = local[campo];
    // Actualizar estado local INMEDIATAMENTE (optimista)
    const nuevoPartido = { ...local, [campo]: codigo || "" };
    setLocal(nuevoPartido);
    onLocalChange?.(nuevoPartido);
    try {
      await base44.entities.PorraPartido.update(partido.id, { [campo]: codigo || "" });
      toast.success("Equipo asignado");
    } catch (e) {
      // Revertir si falla
      setLocal({ ...local, [campo]: previo });
      onLocalChange?.({ ...local, [campo]: previo });
      toast.error("Error: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResultado = async (resultado) => {
    if (!local.equipo_local_codigo || !local.equipo_visitante_codigo) {
      toast.error("Asigna primero los dos equipos");
      return;
    }
    setSaving(true);
    let ganador = "";
    if (resultado === "1") ganador = local.equipo_local_codigo;
    else if (resultado === "2") ganador = local.equipo_visitante_codigo;

    const previo = { ...local };
    const nuevoPartido = { ...local, resultado_real: resultado, ganador_codigo: ganador, finalizado: true };
    setLocal(nuevoPartido);
    onLocalChange?.(nuevoPartido);
    try {
      await base44.entities.PorraPartido.update(partido.id, {
        resultado_real: resultado,
        ganador_codigo: ganador,
        finalizado: true,
      });
      toast.success(`Ganador: ${ganador}`);
    } catch (e) {
      setLocal(previo);
      onLocalChange?.(previo);
      toast.error("Error: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const buscarEq = (codigo) => equipos.find(e => e.codigo === codigo) || todosLosEquipos.find(e => e.codigo === codigo);
  const localEq = buscarEq(local.equipo_local_codigo);
  const visitEq = buscarEq(local.equipo_visitante_codigo);

  return (
    <div className="p-3 hover:bg-slate-50 border-b last:border-b-0">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-bold text-slate-500 w-20">Partido {local.numero_partido}</span>
        {local.finalizado && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
            ✓ Finalizado
          </span>
        )}
        {saving && <span className="text-xs text-slate-400">Guardando…</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto] gap-2 items-center">
        <div className="flex items-center gap-2">
          <span className="text-xl">{localEq?.bandera_emoji || "🏳️"}</span>
          <select
            value={local.equipo_local_codigo || ""}
            onChange={(e) => handleSetEquipo("equipo_local_codigo", e.target.value)}
            disabled={saving}
            className="flex-1 px-2 py-1.5 border rounded text-sm bg-white"
          >
            <option value="">— {local.equipo_local_placeholder || "Local"} —</option>
            {optionEquipoGuardado(local.equipo_local_codigo)}
            {getOpciones(local.equipo_local_codigo).map(eq => (
              <option key={eq.codigo} value={eq.codigo}>
                {eq.bandera_emoji} {eq.nombre}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs text-slate-400 font-bold text-center px-1">VS</span>

        <div className="flex items-center gap-2">
          <span className="text-xl">{visitEq?.bandera_emoji || "🏳️"}</span>
          <select
            value={local.equipo_visitante_codigo || ""}
            onChange={(e) => handleSetEquipo("equipo_visitante_codigo", e.target.value)}
            disabled={saving}
            className="flex-1 px-2 py-1.5 border rounded text-sm bg-white"
          >
            <option value="">— {local.equipo_visitante_placeholder || "Visitante"} —</option>
            {optionEquipoGuardado(local.equipo_visitante_codigo)}
            {getOpciones(local.equipo_visitante_codigo).map(eq => (
              <option key={eq.codigo} value={eq.codigo}>
                {eq.bandera_emoji} {eq.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-1 justify-end">
          {["1", "2"].map(r => (
            <button
              key={r}
              onClick={() => handleResultado(r)}
              disabled={saving}
              className={`w-9 h-9 rounded text-xs font-bold transition-all disabled:opacity-50 ${
                local.resultado_real === r
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
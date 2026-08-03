import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trophy, Sparkles, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { clasificadosPorPosicion, construirCuadro, avanceGanador } from "@/lib/torneoBracket";
import { semillasFase } from "@/lib/torneoGrupoUnico";
import BracketView from "./BracketView";

const CFG_FASE = {
  oro: { titulo: "🥇 Copa Oro", color: "#d97706" },
  plata: { titulo: "🥈 Copa Plata", color: "#64748b" },
  bronce: { titulo: "🥉 Copa Bronce", color: "#ea580c" },
};

// Fase 2: genera cuadros por nivel desde la liguilla y gestiona el avance de ganadores.
export default function EliminatoriasManager({ torneo, categoria, grupos, equipos, partidos }) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["torneo-full", torneo.id] });

  const [plazasOro, setPlazasOro] = useState(1); // nº de posiciones por grupo que van a Oro
  const [plazasPlata, setPlazasPlata] = useState(1);

  const esGrupoUnico = torneo.formato_liguilla === "grupo_unico";
  const equiposCat = equipos.filter((e) => e.categoria_id === categoria.id);
  const fasesConfig = (torneo.fases_finales || []).filter((f) => f.clave && f.desde && f.hasta);

  const partidosCat = partidos.filter((p) => p.categoria_id === categoria.id);
  const partidosLiguilla = partidosCat.filter((p) => p.fase === "liguilla");
  const yaGenerados = partidosCat.some((p) => p.fase === "oro" || p.fase === "plata" || p.fase === "bronce");
  const liguillaCompleta = partidosLiguilla.length > 0 && partidosLiguilla.every((p) => p.finalizado);

  // Persiste un cuadro construido en memoria y resuelve partido_siguiente_id
  const persistirCuadro = async (cuadro) => {
    if (cuadro.length === 0) return;
    const creados = await base44.entities.TorneoPartido.bulkCreate(
      cuadro.map(({ _ref, _siguiente, ...rest }) => rest)
    );
    // Mapear _ref → id real (bulkCreate mantiene el orden)
    const refToId = {};
    cuadro.forEach((c, i) => { refToId[c._ref] = creados[i].id; });
    // Actualizar enlaces al siguiente partido y al partido de 3er puesto (perdedor de semis)
    const updates = cuadro
      .filter((c) => c._siguiente != null || c._tercerPuesto != null)
      .map((c) => {
        const u = { id: refToId[c._ref] };
        if (c._siguiente != null) u.partido_siguiente_id = refToId[c._siguiente];
        if (c._tercerPuesto != null) u.partido_tercer_puesto_id = refToId[c._tercerPuesto];
        return u;
      });
    if (updates.length > 0) await base44.entities.TorneoPartido.bulkUpdate(updates);
  };

  const generar = useMutation({
    mutationFn: async () => {
      const porPos = clasificadosPorPosicion(grupos, equipos, partidosCat, torneo);

      // Oro: posiciones 1..plazasOro de cada grupo. Plata: siguientes plazasPlata.
      const semillasOro = [];
      const semillasPlata = [];
      for (let pos = 1; pos <= plazasOro; pos++) (porPos[pos] || []).forEach((e) => semillasOro.push(e));
      for (let pos = plazasOro + 1; pos <= plazasOro + plazasPlata; pos++) (porPos[pos] || []).forEach((e) => semillasPlata.push(e));

      if (semillasOro.length < 2) throw new Error("No hay suficientes equipos para la Copa Oro");

      const cuadroOro = construirCuadro(semillasOro, "oro", torneo, categoria);
      const cuadroPlata = semillasPlata.length >= 2 ? construirCuadro(semillasPlata, "plata", torneo, categoria) : [];

      await persistirCuadro(cuadroOro);
      await persistirCuadro(cuadroPlata);
      await base44.entities.TorneoCategoria.update(categoria.id, { fase_actual: "eliminatorias", cuadros_generados: true });
    },
    onSuccess: () => { invalidate(); toast.success("Cuadros generados"); },
    onError: (e) => toast.error(e.message),
  });

  const generarGrupoUnico = useMutation({
    mutationFn: async () => {
      if (fasesConfig.length === 0) throw new Error("Configura las fases finales en 'Editar torneo' (ej: Oro 1º-16º, Plata 17º-24º)");
      let creadoAlguno = false;
      for (const fase of fasesConfig) {
        const semillas = semillasFase(equiposCat, partidosCat, torneo, fase);
        if (semillas.length < 2) continue;
        const cuadro = construirCuadro(semillas, fase.clave, torneo, categoria);
        await persistirCuadro(cuadro);
        creadoAlguno = true;
      }
      if (!creadoAlguno) throw new Error("No hay suficientes equipos clasificados para ninguna fase");
      await base44.entities.TorneoCategoria.update(categoria.id, { fase_actual: "eliminatorias", cuadros_generados: true });
    },
    onSuccess: () => { invalidate(); toast.success("Cuadros generados"); },
    onError: (e) => toast.error(e.message),
  });

  const regenerar = useMutation({
    mutationFn: async () => {
      const elim = partidosCat.filter((p) => p.fase === "oro" || p.fase === "plata" || p.fase === "bronce");
      await Promise.all(elim.map((p) => base44.entities.TorneoPartido.delete(p.id)));
      await base44.entities.TorneoCategoria.update(categoria.id, { fase_actual: "liguilla", cuadros_generados: false });
    },
    onSuccess: () => { invalidate(); toast.success("Cuadros eliminados. Puedes regenerarlos."); },
  });

  const guardarResultado = useMutation({
    mutationFn: async ({ partido, local, visit }) => {
      // Guardar el resultado
      await base44.entities.TorneoPartido.update(partido.id, {
        marcador_local: local, marcador_visitante: visit, finalizado: true,
      });
      // Avanzar ganador al siguiente partido
      const avance = avanceGanador(partido, local, visit, partidosCat);
      if (avance?.ganadorId) {
        await base44.entities.TorneoPartido.update(partido.id, { ganador_id: avance.ganadorId });
        if (avance.siguiente) {
          const campo = avance.siguiente.campo === "local"
            ? { equipo_local_id: avance.siguiente.equipoId, equipo_local_placeholder: avance.siguiente.placeholder }
            : { equipo_visitante_id: avance.siguiente.equipoId, equipo_visitante_placeholder: avance.siguiente.placeholder };
          await base44.entities.TorneoPartido.update(avance.siguiente.id, campo);
        }
        // Colocar al PERDEDOR en el partido de 3er/4º puesto (solo semifinales)
        if (avance.tercerPuesto) {
          const campoTp = avance.tercerPuesto.campo === "local"
            ? { equipo_local_id: avance.tercerPuesto.equipoId, equipo_local_placeholder: avance.tercerPuesto.placeholder }
            : { equipo_visitante_id: avance.tercerPuesto.equipoId, equipo_visitante_placeholder: avance.tercerPuesto.placeholder };
          await base44.entities.TorneoPartido.update(avance.tercerPuesto.id, campoTp);
        }
      }
    },
    onSuccess: () => { invalidate(); toast.success("Resultado guardado y ganador avanzado"); },
    onError: () => toast.error("Error al guardar"),
  });

  const guardarUbicacion = useMutation({
    mutationFn: ({ partido, patch }) => base44.entities.TorneoPartido.update(partido.id, patch),
    onSuccess: () => { invalidate(); },
    onError: () => toast.error("Error al guardar campo/hora"),
  });

  if (!yaGenerados && esGrupoUnico) {
    return (
      <div className="bg-white rounded-xl border p-4 space-y-4">
        <div className="flex items-center gap-2 text-slate-800 font-semibold">
          <Trophy className="w-5 h-5 text-amber-500" /> Generar cuadros por nivel
        </div>
        {!liguillaCompleta && (
          <p className="text-sm text-amber-600 bg-amber-50 rounded-lg p-2">
            Termina de meter todos los resultados de la liguilla para generar los cuadros con la clasificación general definitiva.
          </p>
        )}
        {fasesConfig.length === 0 ? (
          <p className="text-sm text-slate-500 bg-slate-50 rounded-lg p-3">
            No hay fases configuradas. Ve a <strong>Editar torneo</strong> y añade las fases finales (ej: Fase Oro 1º–16º, Fase Plata 17º–24º).
          </p>
        ) : (
          <div className="space-y-2">
            {fasesConfig.map((f) => (
              <div key={f.clave} className="flex items-center gap-2 text-sm bg-slate-50 rounded-lg px-3 py-2">
                <span className="font-semibold text-slate-700">{CFG_FASE[f.clave]?.titulo || f.nombre}</span>
                <span className="text-slate-500">clasificación general {f.desde}º – {f.hasta}º</span>
              </div>
            ))}
          </div>
        )}
        <Button onClick={() => generarGrupoUnico.mutate()} disabled={generarGrupoUnico.isPending || fasesConfig.length === 0}>
          <Sparkles className="w-4 h-4 mr-1" /> Generar cuadros
        </Button>
        <p className="text-xs text-slate-400">
          Cada fase toma su tramo de la clasificación general y se siembra automáticamente (1º vs último, 2º vs penúltimo…). El avance de ganadores es automático.
        </p>
      </div>
    );
  }

  if (!yaGenerados) {
    return (
      <div className="bg-white rounded-xl border p-4 space-y-4">
        <div className="flex items-center gap-2 text-slate-800 font-semibold">
          <Trophy className="w-5 h-5 text-amber-500" /> Generar cuadros Oro / Plata
        </div>
        {!liguillaCompleta && (
          <p className="text-sm text-amber-600 bg-amber-50 rounded-lg p-2">
            Termina de meter todos los resultados de la liguilla para generar los cuadros con la clasificación definitiva.
          </p>
        )}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-slate-500 block">Posiciones a Copa Oro (por grupo)</label>
            <Input type="number" min={1} max={4} value={plazasOro} onChange={(e) => setPlazasOro(Number(e.target.value))} className="w-24" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block">Posiciones a Copa Plata (por grupo)</label>
            <Input type="number" min={0} max={4} value={plazasPlata} onChange={(e) => setPlazasPlata(Number(e.target.value))} className="w-24" />
          </div>
          <Button onClick={() => generar.mutate()} disabled={generar.isPending}>
            <Sparkles className="w-4 h-4 mr-1" /> Generar cuadros
          </Button>
        </div>
        <p className="text-xs text-slate-400">
          Los mejores de cada grupo van a la Copa Oro y los siguientes a la Copa Plata. El cuadro y el avance de ganadores se crean automáticamente.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => { if (confirm("¿Eliminar los cuadros y volver a la liguilla? Se perderán los resultados de eliminatorias.")) regenerar.mutate(); }} disabled={regenerar.isPending}>
          <RotateCcw className="w-4 h-4 mr-1" /> Regenerar cuadros
        </Button>
      </div>
      {(esGrupoUnico
        ? fasesConfig.map((f) => ({ fase: f.clave, ...CFG_FASE[f.clave], titulo: CFG_FASE[f.clave]?.titulo || f.nombre }))
        : [{ fase: "oro", ...CFG_FASE.oro }, { fase: "plata", ...CFG_FASE.plata }]
      ).map((b) => (
        <BracketView key={b.fase} partidos={partidosCat} equipos={equipos} torneo={torneo}
          fase={b.fase} titulo={b.titulo} color={b.color}
          onSave={(partido, local, visit) => guardarResultado.mutate({ partido, local, visit })}
          onSaveUbicacion={(partido, patch) => guardarUbicacion.mutate({ partido, patch })} isSaving={guardarResultado.isPending} />
      ))}
    </div>
  );
}
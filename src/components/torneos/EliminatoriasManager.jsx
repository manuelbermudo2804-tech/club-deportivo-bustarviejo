import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trophy, Sparkles, RotateCcw, LayoutGrid } from "lucide-react";
import { toast } from "sonner";
import { clasificadosPorPosicion, construirCuadro, avanceGanador, rellenarPrimeraRonda } from "@/lib/torneoBracket";
import { semillasFase, semillasFasePlaceholder, calcularClasificacionGeneral } from "@/lib/torneoGrupoUnico";
import BracketView from "./BracketView";
import BracketArbol from "./BracketArbol";
import AsignarEquiposRonda1 from "./AsignarEquiposRonda1";
import GoleadoresDialog from "./GoleadoresDialog";

const CFG_FASE = {
  oro: { titulo: "🥇 Copa Oro", color: "#d97706" },
  plata: { titulo: "🥈 Copa Plata", color: "#64748b" },
  bronce: { titulo: "🥉 Copa Bronce", color: "#ea580c" },
};

// Fase 2: genera cuadros por nivel desde la liguilla y gestiona el avance de ganadores.
export default function EliminatoriasManager({ torneo, categoria, grupos, equipos, partidos, jugadores = [], goles = [] }) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["torneo-full", torneo.id] });

  const [plazasOro, setPlazasOro] = useState(1); // nº de posiciones por grupo que van a Oro
  const [plazasPlata, setPlazasPlata] = useState(1);
  const [golPartido, setGolPartido] = useState(null); // partido cuyo diálogo de goleadores está abierto

  // Total de goles registrados por partido, para mostrar el contador en cada cruce.
  const golesPorPartido = React.useMemo(() => {
    const map = {};
    goles.forEach((g) => { map[g.partido_id] = (map[g.partido_id] || 0) + (g.goles || 1); });
    return map;
  }, [goles]);

  const esGrupoUnico = torneo.formato_liguilla === "grupo_unico";
  const equiposCat = equipos.filter((e) => e.categoria_id === categoria.id);
  const fasesConfig = (torneo.fases_finales || []).filter((f) => f.clave && f.desde && f.hasta);

  const partidosCat = partidos.filter((p) => p.categoria_id === categoria.id);
  const partidosLiguilla = partidosCat.filter((p) => p.fase === "liguilla");
  const yaGenerados = partidosCat.some((p) => p.fase === "oro" || p.fase === "plata" || p.fase === "bronce");
  const liguillaCompleta = partidosLiguilla.length > 0 && partidosLiguilla.every((p) => p.finalizado);

  // Guarda anti-duplicado: relee la BD y aborta si ya existen partidos
  // eliminatorios para esta categoría (evita doble clic / doble generación).
  const abortarSiYaExisten = async () => {
    const existentes = await base44.entities.TorneoPartido.filter({ categoria_id: categoria.id });
    if (existentes.some((p) => p.fase === "oro" || p.fase === "plata" || p.fase === "bronce")) {
      throw new Error("Los cuadros ya están generados. Usa 'Regenerar cuadros' si quieres rehacerlos.");
    }
  };

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
      await abortarSiYaExisten();
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
      await abortarSiYaExisten();
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

  // Genera el ESQUELETO del cuadro (en blanco), con placeholders por posición
  // ("1º clasificado" vs "16º clasificado"…). Permite asignar sede/hora desde ya;
  // los equipos reales se rellenan solos según avanza la liguilla.
  const generarGrupoUnicoEnBlanco = useMutation({
    mutationFn: async () => {
      if (fasesConfig.length === 0) throw new Error("Configura las fases finales en 'Editar torneo' (ej: Oro 1º-16º, Plata 17º-24º)");
      await abortarSiYaExisten();
      let creadoAlguno = false;
      for (const fase of fasesConfig) {
        const semillas = semillasFasePlaceholder(fase);
        if (semillas.length < 2) continue;
        const cuadro = construirCuadro(semillas, fase.clave, torneo, categoria);
        await persistirCuadro(cuadro);
        creadoAlguno = true;
      }
      if (!creadoAlguno) throw new Error("Las fases configuradas no tienen suficientes plazas");
      await base44.entities.TorneoCategoria.update(categoria.id, { fase_actual: "eliminatorias", cuadros_generados: true });
    },
    onSuccess: () => { invalidate(); toast.success("Cuadro en blanco generado. Ya puedes asignar sede y hora."); },
    onError: (e) => toast.error(e.message),
  });

  // Relleno MANUAL: cuando el cuadro se generó en blanco (por posiciones), el admin
  // puede pulsar un botón para colocar automáticamente los equipos según la
  // clasificación general actual. Ya no es automático — así el admin decide los cruces.
  const autoRellenar = useMutation({
    mutationFn: async () => {
      const primerasRondas = partidosCat.filter(
        (p) => (p.fase === "oro" || p.fase === "plata" || p.fase === "bronce") &&
          (p.equipo_local_pos != null || p.equipo_visitante_pos != null)
      );
      const clasif = calcularClasificacionGeneral(equiposCat, partidosCat, torneo);
      const updates = rellenarPrimeraRonda(primerasRondas, clasif);
      if (updates.length === 0) throw new Error("No hay posiciones decididas todavía para rellenar");
      await base44.entities.TorneoPartido.bulkUpdate(updates);
    },
    onSuccess: () => { invalidate(); toast.success("Equipos colocados según la clasificación"); },
    onError: (e) => toast.error(e.message),
  });

  // Asignación manual de un equipo a un partido de la primera ronda
  const asignarEquipo = useMutation({
    mutationFn: ({ partido, patch }) => base44.entities.TorneoPartido.update(partido.id, patch),
    onSuccess: () => { invalidate(); },
    onError: () => toast.error("Error al asignar equipo"),
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

  // Mapa equipo_id → posición en la clasificación general de la liguilla.
  // Permite mostrar la semilla (1º, 2º…) junto a cada equipo del cuadro, aunque
  // el partido no tenga guardado equipo_local_pos/equipo_visitante_pos.
  const seedPorEquipo = React.useMemo(() => {
    const map = {};
    if (esGrupoUnico) {
      // Posición global de la clasificación general (1º, 2º, 3º…)
      calcularClasificacionGeneral(equiposCat, partidosCat, torneo)
        .forEach((f) => { if (f.equipo_id) map[f.equipo_id] = String(f.posicion); });
    } else {
      // Formato grupos: posición dentro de su grupo (ej: 1ºA, 2ºB)
      const porPos = clasificadosPorPosicion(grupos, equipos, partidosCat, torneo);
      Object.entries(porPos).forEach(([pos, arr]) => {
        arr.forEach((e) => { if (e.equipo_id) map[e.equipo_id] = `${pos}${e.grupo?.replace(/^grupo\s*/i, "") || ""}`; });
      });
    }
    return map;
  }, [esGrupoUnico, equiposCat, partidosCat, torneo, grupos, equipos]);

  if (!yaGenerados && esGrupoUnico) {
    return (
      <div className="bg-white rounded-xl border p-4 space-y-4">
        <div className="flex items-center gap-2 text-slate-800 font-semibold">
          <Trophy className="w-5 h-5 text-amber-500" /> Generar cuadros por nivel
        </div>
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

        {/* Opción 1: cuadro en blanco (siempre disponible) */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
          <p className="text-sm font-semibold text-blue-900 flex items-center gap-1.5">
            <LayoutGrid className="w-4 h-4" /> Generar cuadro en blanco
          </p>
          <p className="text-xs text-blue-800">
            Crea el esqueleto del cuadro con los huecos (1º clasificado, 2º clasificado…) para que puedas <strong>asignar sede y hora desde ya</strong>. Los equipos irán apareciendo automáticamente según metes los resultados de la liguilla.
          </p>
          <Button onClick={() => generarGrupoUnicoEnBlanco.mutate()} disabled={generarGrupoUnicoEnBlanco.isPending || fasesConfig.length === 0} className="bg-blue-600 hover:bg-blue-700">
            <LayoutGrid className="w-4 h-4 mr-1" /> Generar cuadro en blanco
          </Button>
        </div>

        {/* Opción 2: con clasificación real (solo si la liguilla está completa) */}
        <div className="bg-slate-50 border rounded-lg p-3 space-y-2">
          <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" /> Generar con la clasificación final
          </p>
          {!liguillaCompleta ? (
            <p className="text-xs text-amber-600">
              Disponible cuando termines de meter todos los resultados de la liguilla. Sembrará cada equipo directamente en su hueco.
            </p>
          ) : (
            <p className="text-xs text-slate-500">
              Cada fase toma su tramo de la clasificación general y se siembra automáticamente (1º vs último…).
            </p>
          )}
          <Button variant="outline" onClick={() => generarGrupoUnico.mutate()} disabled={generarGrupoUnico.isPending || fasesConfig.length === 0 || !liguillaCompleta}>
            <Sparkles className="w-4 h-4 mr-1" /> Generar con clasificación
          </Button>
        </div>
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

  // Devuelve los partidos de la PRIMERA ronda de una fase (la de más plazas),
  // aún sin resultado, para poder asignar los cruces manualmente.
  const partidosPrimeraRonda = (fase) => {
    const deFase = partidosCat.filter((p) => p.fase === fase);
    if (deFase.length === 0) return [];
    // Primera ronda = la que tiene más partidos (mayor nº de plazas)
    const conteo = {};
    deFase.forEach((p) => { conteo[p.ronda] = (conteo[p.ronda] || 0) + 1; });
    const rondaInicial = Object.entries(conteo).sort((a, b) => b[1] - a[1])[0]?.[0];
    return deFase
      .filter((p) => p.ronda === rondaInicial && !p.finalizado)
      .sort((a, b) => (a.orden_bracket || 0) - (b.orden_bracket || 0));
  };

  // ¿El cuadro se generó en blanco (por posiciones)? → mostrar auto-rellenar
  const generadoEnBlanco = partidosCat.some(
    (p) => (p.fase === "oro" || p.fase === "plata" || p.fase === "bronce") &&
      (p.equipo_local_pos != null || p.equipo_visitante_pos != null)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        {esGrupoUnico && generadoEnBlanco && (
          <Button variant="outline" size="sm" onClick={() => autoRellenar.mutate()} disabled={autoRellenar.isPending}>
            <Sparkles className="w-4 h-4 mr-1" /> Rellenar por clasificación
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => { if (confirm("¿Eliminar los cuadros y volver a la liguilla? Se perderán los resultados de eliminatorias.")) regenerar.mutate(); }} disabled={regenerar.isPending}>
          <RotateCcw className="w-4 h-4 mr-1" /> Regenerar cuadros
        </Button>
      </div>
      {(esGrupoUnico
        ? fasesConfig.map((f) => ({ fase: f.clave, ...CFG_FASE[f.clave], titulo: CFG_FASE[f.clave]?.titulo || f.nombre }))
        : [{ fase: "oro", ...CFG_FASE.oro }, { fase: "plata", ...CFG_FASE.plata }]
      ).map((b) => (
        <div key={b.fase} className="space-y-3">
          <AsignarEquiposRonda1
            partidos={partidosPrimeraRonda(b.fase)}
            equiposCat={equiposCat}
            seedPorEquipo={seedPorEquipo}
            onAsignar={(partido, patch) => asignarEquipo.mutate({ partido, patch })}
          />
          <BracketView partidos={partidosCat} equipos={equipos} torneo={torneo} seedPorEquipo={seedPorEquipo}
            fase={b.fase} titulo={b.titulo} color={b.color}
            onSave={(partido, local, visit) => guardarResultado.mutate({ partido, local, visit })}
            onSaveUbicacion={(partido, patch) => guardarUbicacion.mutate({ partido, patch })} isSaving={guardarResultado.isPending}
            onGoleadores={(partido) => setGolPartido(partido)} golesPorPartido={golesPorPartido} />

          {/* Vista previa del cuadro tal como lo verá el público (árbol simétrico estilo PDF) */}
          <div className="bg-slate-900 rounded-xl p-4 border border-slate-700 torneo-night">
            <p className="text-xs text-slate-400 mb-2">👁️ Vista previa del cuadro (así lo verá el público)</p>
            <BracketArbol partidos={partidosCat} equipos={equipos} seedPorEquipo={seedPorEquipo}
              fase={b.fase} titulo={b.titulo} color={b.color} />
          </div>
        </div>
      ))}

      {golPartido && (
        <GoleadoresDialog
          open={!!golPartido}
          onOpenChange={(v) => !v && setGolPartido(null)}
          partido={golPartido}
          eqLocal={equipos.find((e) => e.id === golPartido.equipo_local_id)}
          eqVisit={equipos.find((e) => e.id === golPartido.equipo_visitante_id)}
          jugadores={jugadores}
          golesExistentes={goles.filter((g) => g.partido_id === golPartido.id)}
          torneo={torneo}
          categoria={categoria}
          onSaved={invalidate}
        />
      )}
    </div>
  );
}
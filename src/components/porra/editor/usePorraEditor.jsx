import { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

// Hook centralizado para gestionar el estado de la porra de un participante
// - Carga participante, equipos, partidos, config
// - Auto-save con debounce
// - Bloqueo automático si pasó la fecha límite
export default function usePorraEditor(token) {
  const [participante, setParticipante] = useState(null);
  const [config, setConfig] = useState(null);
  const [equipos, setEquipos] = useState([]);
  const [partidos, setPartidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const saveTimerRef = useRef(null);

  const isBlocked = (() => {
    if (!participante) return true;
    if (participante.bloqueada) return true;
    if (config?.fecha_limite_predicciones) {
      const limite = new Date(config.fecha_limite_predicciones).getTime();
      if (Date.now() > limite) return true;
    }
    return false;
  })();

  const cargar = useCallback(async () => {
    if (!token) {
      setError('Token no válido');
      setLoading(false);
      return;
    }
    try {
      const [parts, configs, eqs, pts] = await Promise.all([
        base44.entities.PorraParticipante.filter({ token_acceso: token }),
        base44.entities.PorraConfig.list(),
        base44.entities.PorraEquipo.list('grupo', 100),
        base44.entities.PorraPartido.list('numero_partido', 200),
      ]);
      const p = parts[0];
      if (!p) {
        setError('Porra no encontrada');
      } else if (p.estado_pago !== 'pagado') {
        setError('Pago pendiente');
      } else {
        setParticipante(p);
        setConfig(configs[0] || null);
        setEquipos(eqs);
        setPartidos(pts);
      }
    } catch (e) {
      setError('Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { cargar(); }, [cargar]);

  // Calcula porcentaje y flags de completado
  const computeCompletados = (p) => {
    const totalGrupos = 72;
    const totalEliminatorias = 32; // 16+8+4+2+1+1 = 32
    const totalEspeciales = 4;
    const totalGruposClasif = 12;

    const predGrupos = Object.keys(p.predicciones_grupos || {}).length;
    const clasifGrupos = Object.keys(p.clasificacion_grupos || {}).length;
    const predElim = Object.keys(p.predicciones_eliminatorias || {}).length;
    const especiales = p.predicciones_especiales || {};
    const numEspeciales = ['mejor_jugador', 'maximo_goleador', 'mejor_portero', 'mejor_joven']
      .filter(k => especiales[k]).length;

    const completado_grupos = predGrupos >= totalGrupos && clasifGrupos >= totalGruposClasif;
    const completado_bracket = predElim >= totalEliminatorias;
    const completado_especiales = numEspeciales >= totalEspeciales;

    const total = totalGrupos + totalGruposClasif + totalEliminatorias + totalEspeciales;
    const hecho = predGrupos + clasifGrupos + predElim + numEspeciales;
    const porcentaje_completado = Math.round((hecho / total) * 100);

    return { completado_grupos, completado_bracket, completado_especiales, porcentaje_completado };
  };

  // Guardado con debounce 700ms
  const guardarDebounced = useCallback((updates) => {
    if (!participante || isBlocked) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const merged = { ...participante, ...updates };
    setParticipante(merged); // optimista
    saveTimerRef.current = setTimeout(async () => {
      try {
        setSaving(true);
        const flags = computeCompletados(merged);
        await base44.entities.PorraParticipante.update(participante.id, { ...updates, ...flags });
        setParticipante(prev => ({ ...prev, ...flags }));
      } catch (e) {
        toast.error('Error al guardar');
      } finally {
        setSaving(false);
      }
    }, 700);
  }, [participante, isBlocked]);

  // Helpers de modificación
  const setResultadoGrupo = (partidoId, resultado) => {
    const nuevo = { ...(participante.predicciones_grupos || {}), [partidoId]: resultado };
    guardarDebounced({ predicciones_grupos: nuevo });
  };

  const setClasificacionGrupo = (grupo, ordenCodigos) => {
    const nuevo = { ...(participante.clasificacion_grupos || {}), [grupo]: ordenCodigos };
    guardarDebounced({ clasificacion_grupos: nuevo });
  };

  const setEliminatoriaGanador = (partidoId, codigoGanador) => {
    const nuevo = { ...(participante.predicciones_eliminatorias || {}), [partidoId]: codigoGanador };
    guardarDebounced({ predicciones_eliminatorias: nuevo });
  };

  const setEspecial = (tipo, codigoEquipo) => {
    const nuevo = { ...(participante.predicciones_especiales || {}), [tipo]: codigoEquipo };
    guardarDebounced({ predicciones_especiales: nuevo });
  };

  const setTercerPuesto = (data) => {
    guardarDebounced({ prediccion_tercer_puesto: data });
  };

  return {
    participante, config, equipos, partidos,
    loading, saving, error, isBlocked,
    setResultadoGrupo, setClasificacionGrupo,
    setEliminatoriaGanador, setEspecial, setTercerPuesto,
    refrescar: cargar,
  };
}
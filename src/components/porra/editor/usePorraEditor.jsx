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
      const { data } = await base44.functions.invoke('porraGetByToken', { token });
      if (data?.error) {
        setError(data.error);
      } else if (data?.participante) {
        setParticipante(data.participante);
        setConfig(data.config || null);
        setEquipos(data.equipos || []);
        setPartidos(data.partidos || []);
      } else {
        setError('Porra no encontrada');
      }
    } catch (e) {
      // Si el endpoint backend devuelve 4xx, axios lanza error con response.data
      const msg = e?.response?.data?.error || 'Error al cargar';
      setError(msg);
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
    const totalTerceros = 8;

    const predGrupos = Object.keys(p.predicciones_grupos || {}).length;
    const clasifGrupos = Object.keys(p.clasificacion_grupos || {}).length;
    const predElim = Object.keys(p.predicciones_eliminatorias || {}).length;
    const terceros = (p.mejores_terceros || []).length;
    const especiales = p.predicciones_especiales || {};
    const numEspeciales = ['mejor_jugador', 'maximo_goleador', 'mejor_portero', 'mejor_joven']
      .filter(k => especiales[k]).length;

    const completado_grupos = predGrupos >= totalGrupos && clasifGrupos >= totalGruposClasif;
    const completado_terceros = terceros === totalTerceros;
    const completado_bracket = predElim >= totalEliminatorias;
    const completado_especiales = numEspeciales >= totalEspeciales;

    const total = totalGrupos + totalGruposClasif + totalTerceros + totalEliminatorias + totalEspeciales;
    const hecho = predGrupos + clasifGrupos + terceros + predElim + numEspeciales;
    const porcentaje_completado = Math.round((hecho / total) * 100);

    return { completado_grupos, completado_terceros, completado_bracket, completado_especiales, porcentaje_completado };
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
        await base44.functions.invoke('porraUpdateByToken', {
          token,
          updates: { ...updates, ...flags },
        });
        setParticipante(prev => ({ ...prev, ...flags }));
      } catch (e) {
        toast.error('Error al guardar');
      } finally {
        setSaving(false);
      }
    }, 700);
  }, [participante, isBlocked, token]);

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

  const setMejoresTerceros = (lista) => {
    guardarDebounced({ mejores_terceros: lista });
  };

  return {
    participante, config, equipos, partidos,
    loading, saving, error, isBlocked,
    setResultadoGrupo, setClasificacionGrupo,
    setEliminatoriaGanador, setEspecial, setTercerPuesto, setMejoresTerceros,
    refrescar: cargar,
  };
}
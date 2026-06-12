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
  // Ref para evitar stale closures: siempre lee el participante más reciente
  const participanteRef = useRef(null);
  const pendingUpdatesRef = useRef({});
  useEffect(() => { participanteRef.current = participante; }, [participante]);

  // 🔒 Mundial 2026 EN MARCHA:
  // - Grupos, mejores terceros y especiales: BLOQUEADOS para todo el mundo (el Mundial ya empezó).
  // - Bracket: editable hasta el 28-jun 18:00 Madrid (16:00 UTC), salvo que el usuario ya
  //   haya confirmado su re-edición (entonces queda bloqueado también).
  const BRACKET_DEADLINE_MS = Date.UTC(2026, 5, 28, 16, 0, 0);
  // 🎟️ Excepción puntual: participantes a los que admin permite editar mejores terceros
  // aunque el Mundial ya haya empezado. Solo afecta a la pestaña Terceros (el backend
  // también lo blinda — ver functions/porraUpdateByToken).
  const EXCEPCION_TERCEROS_IDS = new Set([
    '6a1157c170b2ab600e6dea5e', // Carlos Molina ("Mol")
  ]);
  const tieneExcepcionTerceros = !!participante && EXCEPCION_TERCEROS_IDS.has(participante.id);
  const isBlocked = true; // grupos / terceros / especiales: SIEMPRE bloqueados desde el inicio del Mundial
  const isTercerosBlocked = isBlocked && !tieneExcepcionTerceros;
  const isBracketBlocked = (() => {
    if (!participante) return true;
    if (participante.bracket_reeditado) return true;
    if (Date.now() > BRACKET_DEADLINE_MS) return true;
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

  // Flush inmediato: guarda lo pendiente ya (sin esperar al debounce)
  const flushGuardado = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const pending = pendingUpdatesRef.current;
    if (!pending || Object.keys(pending).length === 0) return;
    if (!participanteRef.current) return;
    // Determinar bloqueo efectivo según qué se está guardando
    const pendingKeys = Object.keys(pending);
    const soloBracket = pendingKeys.every(k => k === 'predicciones_eliminatorias');
    const soloTerceros = pendingKeys.every(k => k === 'mejores_terceros');
    let bloqueadoEfectivo = isBlocked;
    if (soloBracket) bloqueadoEfectivo = isBracketBlocked;
    else if (soloTerceros) bloqueadoEfectivo = isTercerosBlocked;
    if (bloqueadoEfectivo) return;
    pendingUpdatesRef.current = {};
    try {
      setSaving(true);
      const flags = computeCompletados(participanteRef.current);
      await base44.functions.invoke('porraUpdateByToken', {
        token,
        updates: { ...pending, ...flags },
      });
      setParticipante(prev => ({ ...prev, ...flags }));
    } catch (e) {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  }, [isBlocked, isBracketBlocked, isTercerosBlocked, token]);

  // Guardado con debounce 700ms — acumula updates pendientes para no perderlos
  // Solo bracket: si está bloqueado normal pero el test admin puede editar bracket,
  // permitimos guardar SI las únicas updates son del bracket.
  const guardarDebounced = useCallback((updates) => {
    if (!participanteRef.current) return;
    const updateKeys = Object.keys(updates || {});
    const soloBracket = updateKeys.every(k => k === 'predicciones_eliminatorias');
    const soloTerceros = updateKeys.every(k => k === 'mejores_terceros');
    let bloqueadoEfectivo = isBlocked;
    if (soloBracket) bloqueadoEfectivo = isBracketBlocked;
    else if (soloTerceros) bloqueadoEfectivo = isTercerosBlocked;
    if (bloqueadoEfectivo) return;
    // Acumular updates pendientes (no sobrescribir si llegan varios antes del flush)
    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...updates };
    // Actualizar UI optimista usando siempre la referencia más reciente
    setParticipante(prev => ({ ...prev, ...updates }));
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { flushGuardado(); }, 700);
  }, [isBlocked, isBracketBlocked, isTercerosBlocked, flushGuardado]);

  // Si el usuario cierra/recarga la pestaña: intentar flush antes de salir
  useEffect(() => {
    const onBeforeUnload = () => { flushGuardado(); };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      flushGuardado(); // al desmontar también
    };
  }, [flushGuardado]);

  // Helpers de modificación
  // ⚠️ IMPORTANTE: usar participanteRef.current (no participante) para evitar STALE CLOSURES.
  // Sin esto, toques rápidos en móvil pueden hacer que una predicción pise a otra
  // → causa el bug del "95%" (faltan predicciones sin que el usuario lo sepa).
  const setResultadoGrupo = (partidoId, resultado) => {
    const actual = participanteRef.current?.predicciones_grupos || {};
    const nuevo = { ...actual, [partidoId]: resultado };
    guardarDebounced({ predicciones_grupos: nuevo });
  };

  const setClasificacionGrupo = (grupo, ordenCodigos) => {
    const actual = participanteRef.current?.clasificacion_grupos || {};
    const nuevo = { ...actual, [grupo]: ordenCodigos };
    guardarDebounced({ clasificacion_grupos: nuevo });
  };

  const setEliminatoriaGanador = (partidoId, codigoGanador) => {
    const actual = participanteRef.current?.predicciones_eliminatorias || {};
    const nuevo = { ...actual, [partidoId]: codigoGanador };
    guardarDebounced({ predicciones_eliminatorias: nuevo });
  };

  const setEspecial = (tipo, codigoEquipo) => {
    const actual = participanteRef.current?.predicciones_especiales || {};
    const nuevo = { ...actual, [tipo]: codigoEquipo };
    guardarDebounced({ predicciones_especiales: nuevo });
  };

  const setTercerPuesto = (data) => {
    guardarDebounced({ prediccion_tercer_puesto: data });
  };

  const setMejoresTerceros = (lista) => {
    guardarDebounced({ mejores_terceros: lista });
  };

  // Confirma y cierra el bracket: flush + llamada explícita para marcar bracket_reeditado=true
  const confirmarBracket = useCallback(async () => {
    if (!token || !participanteRef.current) return { ok: false };
    // Flush pendientes primero para no perder el último cambio
    await flushGuardado();
    try {
      setSaving(true);
      const { data } = await base44.functions.invoke('porraConfirmarBracket', { token });
      if (data?.success) {
        setParticipante(prev => ({ ...prev, bracket_reeditado: true, fecha_bracket_reeditado: new Date().toISOString() }));
        return { ok: true };
      }
      return { ok: false, error: data?.error || 'No se pudo confirmar' };
    } catch (e) {
      return { ok: false, error: e?.response?.data?.error || 'Error al confirmar' };
    } finally {
      setSaving(false);
    }
  }, [token, flushGuardado]);

  return {
    participante, config, equipos, partidos,
    loading, saving, error, isBlocked, isBracketBlocked, isTercerosBlocked,
    setResultadoGrupo, setClasificacionGrupo,
    setEliminatoriaGanador, setEspecial, setTercerPuesto, setMejoresTerceros,
    confirmarBracket,
    refrescar: cargar,
    flushGuardado,
  };
}
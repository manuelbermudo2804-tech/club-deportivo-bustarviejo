import { useState, useEffect } from "react";

// Hook que gestiona la activación escalonada de motores de fondo
// para evitar ráfagas de llamadas al cargar la app.
// Consolidado de 5 a 3 etapas para reducir latencia total de carga.
export default function useEngineStages(isLoading, user) {
  const [enginesReady, setEnginesReady] = useState(false);
  const [enginesStage2Ready, setEnginesStage2Ready] = useState(false);
  const [enginesStage3Ready, setEnginesStage3Ready] = useState(false);

  const isLowEndDevice = typeof navigator !== 'undefined' && (navigator.deviceMemory ? navigator.deviceMemory < 2 : false);
  const stageMultiplier = isLowEndDevice ? 1.8 : 1;

  // Stage 1: motores esenciales (sesión) tras 5s
  useEffect(() => {
    if (!isLoading && user) {
      const id = setTimeout(() => setEnginesReady(true), 5000);
      return () => clearTimeout(id);
    }
  }, [isLoading, user]);

  // Stage 2: notificaciones y pagos (4s después)
  // Stage 3: recordatorios, renovaciones y sonidos (10s después)
  useEffect(() => {
    if (!enginesReady) return;
    const t2 = setTimeout(() => setEnginesStage2Ready(true), 4000 * stageMultiplier);
    const t3 = setTimeout(() => setEnginesStage3Ready(true), 10000 * stageMultiplier);
    return () => { clearTimeout(t2); clearTimeout(t3); };
  }, [enginesReady]);

  return { enginesReady, enginesStage2Ready, enginesStage3Ready };
}
import { useState, useEffect } from "react";

// Hook que gestiona la activación escalonada de motores de fondo
// para evitar ráfagas de llamadas al cargar la app.
// Devuelve 5 flags booleanos que se activan progresivamente.
export default function useEngineStages(isLoading, user) {
  const [enginesReady, setEnginesReady] = useState(false);
  const [enginesStage2Ready, setEnginesStage2Ready] = useState(false);
  const [enginesStage3Ready, setEnginesStage3Ready] = useState(false);
  const [enginesStage4Ready, setEnginesStage4Ready] = useState(false);
  const [enginesStage5Ready, setEnginesStage5Ready] = useState(false);

  const isLowEndDevice = typeof navigator !== 'undefined' && (navigator.deviceMemory ? navigator.deviceMemory < 2 : false);
  const stageMultiplier = isLowEndDevice ? 1.8 : 1;

  // Stage 1: activar motores principales tras 5s de carga completa
  useEffect(() => {
    if (!isLoading && user) {
      const id = setTimeout(() => setEnginesReady(true), 5000);
      return () => clearTimeout(id);
    }
  }, [isLoading, user]);

  // Stages 2-5: escalonados para reducir presión en RAM
  useEffect(() => {
    if (!enginesReady) return;
    const t2 = setTimeout(() => setEnginesStage2Ready(true), 4000 * stageMultiplier);
    const t3 = setTimeout(() => setEnginesStage3Ready(true), 8000 * stageMultiplier);
    const t4 = setTimeout(() => setEnginesStage4Ready(true), 14000 * stageMultiplier);
    const t5 = setTimeout(() => setEnginesStage5Ready(true), 20000 * stageMultiplier);
    return () => { clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, [enginesReady]);

  return { enginesReady, enginesStage2Ready, enginesStage3Ready, enginesStage4Ready, enginesStage5Ready };
}
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";

// Cálculo de temporada por fecha (fallback si no hay SeasonConfig activa)
// Regla: a partir de septiembre comienza la nueva temporada (sep -> ago)
function computeSeasonByDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1; // 1-12
  if (m >= 9) return `${y}/${y + 1}`;
  return `${y - 1}/${y}`;
}

const SeasonContext = createContext({
  activeSeason: computeSeasonByDate(),
  seasonConfig: null,
  setActiveSeason: () => {},
  refreshSeason: () => {},
});

export function SeasonProvider({ children, externalConfig }) {
  const [seasonConfig, setSeasonConfig] = useState(externalConfig || null);

  useEffect(() => {
    if (externalConfig !== undefined) {
      setSeasonConfig(externalConfig);
    }
  }, [externalConfig]);
  const [manualSeason, setManualSeason] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadActiveConfig = async () => {
    setLoading(true);
    try {
      const configs = await base44.entities.SeasonConfig.filter({ activa: true });
      setSeasonConfig(configs?.[0] || null);
    } catch (e) {
      // Silenciar: el layout ya maneja errores globales
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActiveConfig();
  }, []);

  const activeSeason = useMemo(() => {
    if (manualSeason) return manualSeason;
    if (seasonConfig?.temporada) return seasonConfig.temporada;
    return computeSeasonByDate();
  }, [manualSeason, seasonConfig]);

  const value = useMemo(() => ({
    activeSeason,
    seasonConfig,
    setActiveSeason: setManualSeason,
    refreshSeason: loadActiveConfig,
    loading,
  }), [activeSeason, seasonConfig, loading]);

  return (
    <SeasonContext.Provider value={value}>
      {children}
    </SeasonContext.Provider>
  );
}

export function useActiveSeason() {
  return useContext(SeasonContext);
}
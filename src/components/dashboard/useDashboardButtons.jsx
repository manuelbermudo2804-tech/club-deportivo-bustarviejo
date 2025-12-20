import { useMemo } from "react";

export function useDashboardButtons(allButtons, userConfig) {
  return useMemo(() => {
    // Si no hay configuración o está vacía, usar los primeros 6 por defecto
    const config = (userConfig && userConfig.length > 0) ? userConfig : allButtons.slice(0, 6).map(b => b.id);
    
    // Filtrar y ordenar según configuración
    return config
      .map(id => allButtons.find(b => b.id === id))
      .filter(Boolean); // Eliminar nulls si hay IDs inválidos
  }, [allButtons, userConfig]);
}
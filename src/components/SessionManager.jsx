import { useEffect } from "react";

export default function SessionManager() {
  useEffect(() => {
    // Al cargar la app, limpiar cualquier dato viejo de sesiones anteriores
    const cleanupOldSessions = () => {
      // Solo limpiamos cosas específicas que podrían causar conflictos
      // NO tocamos el localStorage del auth que maneja Base44
      const itemsToCheck = [
        'react-query-cache',
        'lastVisitedPage',
        'tempData'
      ];
      
      itemsToCheck.forEach(item => {
        try {
          localStorage.removeItem(item);
        } catch (e) {
          // Ignorar errores silenciosamente
        }
      });
    };

    cleanupOldSessions();
  }, []);

  return null;
}
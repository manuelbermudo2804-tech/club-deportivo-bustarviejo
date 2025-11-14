import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function SessionManager() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const currentUser = await base44.auth.me();
        const storedUserId = localStorage.getItem("current_user_id");
        
        // Si hay un usuario diferente al almacenado, limpiar todo y recargar
        if (storedUserId && storedUserId !== currentUser.id) {
          console.log("Detected user change, clearing cache and reloading...");
          
          // Limpiar localStorage
          localStorage.clear();
          
          // Limpiar todo el cache de React Query
          queryClient.clear();
          
          // Guardar el nuevo usuario
          localStorage.setItem("current_user_id", currentUser.id);
          
          // Forzar recarga completa de la página
          window.location.reload();
        } else if (!storedUserId) {
          // Primera vez que se carga, guardar el usuario
          localStorage.setItem("current_user_id", currentUser.id);
        }
      } catch (error) {
        // Si no hay usuario autenticado, limpiar todo
        localStorage.removeItem("current_user_id");
      }
    };

    checkSession();
    
    // Verificar cada 3 segundos si cambió el usuario
    const interval = setInterval(checkSession, 3000);
    
    return () => clearInterval(interval);
  }, [queryClient]);

  return null;
}
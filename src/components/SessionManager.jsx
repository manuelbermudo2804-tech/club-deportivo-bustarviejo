import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function SessionManager() {
  const queryClient = useQueryClient();
  const isCheckingRef = useRef(false);
  const hasReloadedRef = useRef(false);

  useEffect(() => {
    const checkSession = async () => {
      // Evitar múltiples verificaciones simultáneas
      if (isCheckingRef.current || hasReloadedRef.current) return;
      
      isCheckingRef.current = true;
      
      try {
        const currentUser = await base44.auth.me();
        const storedUserId = localStorage.getItem("current_user_id");
        
        // Si hay un usuario diferente al almacenado, limpiar todo y recargar UNA SOLA VEZ
        if (storedUserId && storedUserId !== currentUser.id) {
          console.log("🔄 Cambio de usuario detectado, actualizando...");
          
          // Marcar que vamos a recargar
          hasReloadedRef.current = true;
          
          // Limpiar cache de React Query
          queryClient.clear();
          
          // Actualizar el ID de usuario
          localStorage.setItem("current_user_id", currentUser.id);
          
          // Esperar un momento y recargar
          setTimeout(() => {
            window.location.reload();
          }, 100);
        } else if (!storedUserId) {
          // Primera vez que se carga, guardar el usuario
          localStorage.setItem("current_user_id", currentUser.id);
        }
      } catch (error) {
        // Si no hay usuario autenticado, limpiar
        localStorage.removeItem("current_user_id");
      } finally {
        isCheckingRef.current = false;
      }
    };

    // Verificar al cargar la página
    checkSession();
    
    // Verificar cada 5 segundos (menos agresivo)
    const interval = setInterval(checkSession, 5000);
    
    return () => {
      clearInterval(interval);
    };
  }, [queryClient]);

  return null;
}
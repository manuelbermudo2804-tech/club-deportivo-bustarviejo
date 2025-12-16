import { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";

export default function SessionManager() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // SEGURIDAD: Validar que el usuario actual coincide con el token de autenticación
    const validateSession = async () => {
      try {
        console.log('🔐 [SessionManager] Validando sesión...');
        const currentUser = await base44.auth.me();
        
        // Guardar el email del usuario actual en sessionStorage
        const storedEmail = sessionStorage.getItem('currentUserEmail');
        
        if (storedEmail && storedEmail !== currentUser.email) {
          // El email cambió - hay un problema de sesión
          console.error('⚠️⚠️⚠️ [SessionManager] CONFLICTO DE SESIÓN DETECTADO ⚠️⚠️⚠️');
          console.error('Email almacenado:', storedEmail);
          console.error('Email actual:', currentUser.email);
          
          // LIMPIAR TODO INMEDIATAMENTE
          queryClient.clear();
          sessionStorage.clear();
          localStorage.clear();
          
          // Forzar logout y redirección
          alert(`⚠️ CONFLICTO DE SESIÓN DETECTADO\n\nSesión anterior: ${storedEmail}\nSesión actual: ${currentUser.email}\n\nSe cerrará la sesión por seguridad.`);
          window.location.href = 'https://app.cdbustarviejo.com';
          return;
        }
        
        // Guardar email actual
        sessionStorage.setItem('currentUserEmail', currentUser.email);
        console.log('✅ [SessionManager] Sesión válida para:', currentUser.email);
        
      } catch (error) {
        console.error('❌ [SessionManager] Error validando sesión:', error);
        // Si falla auth, limpiar y redirigir
        queryClient.clear();
        sessionStorage.clear();
        base44.auth.logout('https://app.cdbustarviejo.com');
      }
    };

    validateSession();
    
    // Validar cada 30 segundos
    const interval = setInterval(validateSession, 30000);
    
    return () => clearInterval(interval);
  }, [queryClient]);

  return null;
}
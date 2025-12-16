import { useEffect } from "react";
import { base44 } from "@/api/base44Client";

export default function SessionManager() {
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
          console.error('⚠️ [SessionManager] CONFLICTO DE SESIÓN DETECTADO');
          console.error('Email almacenado:', storedEmail);
          console.error('Email actual:', currentUser.email);
          
          // Limpiar TODO y forzar logout
          sessionStorage.clear();
          localStorage.clear();
          window.location.href = 'https://app.cdbustarviejo.com';
          return;
        }
        
        // Guardar email actual
        sessionStorage.setItem('currentUserEmail', currentUser.email);
        console.log('✅ [SessionManager] Sesión válida para:', currentUser.email);
        
      } catch (error) {
        console.error('❌ [SessionManager] Error validando sesión:', error);
        // Si falla auth, limpiar y redirigir
        sessionStorage.clear();
        base44.auth.logout('https://app.cdbustarviejo.com');
      }
    };

    validateSession();
  }, []);

  return null;
}
import { useEffect } from "react";
import { base44 } from "@/api/base44Client";

export default function SessionManager() {
  useEffect(() => {
    // VALIDACIÓN DE SESIÓN DESACTIVADA - causaba demasiados logouts innecesarios
    // El sistema de auth de Base44 ya maneja la seguridad de sesiones
    console.log('🔐 [SessionManager] Modo pasivo - no se valida sesión activamente');
  }, []);

  return null;
}
import React, { useEffect } from "react";
import { createPageUrl } from "@/utils";

// DEPRECATED: Esta página ha sido reemplazada por AdminAccessCodes
// Redirigimos automáticamente al nuevo sistema de códigos de acceso
export default function InvitationRequests() {
  useEffect(() => {
    window.location.href = createPageUrl("AdminAccessCodes");
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
        <p className="text-slate-600">Redirigiendo al nuevo sistema de códigos de acceso...</p>
      </div>
    </div>
  );
}
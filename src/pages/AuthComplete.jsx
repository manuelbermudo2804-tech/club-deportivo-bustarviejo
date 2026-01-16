import React, { useEffect } from "react";

export default function AuthComplete() {
  useEffect(() => {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({ type: "base44-auth-complete" }, window.location.origin);
    }
    window.close();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="bg-white rounded-2xl shadow p-6 text-center">
        <p className="text-slate-700">Autenticación completada. Puedes cerrar esta ventana.</p>
      </div>
    </div>
  );
}
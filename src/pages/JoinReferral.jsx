import React, { useEffect } from "react";
export default function JoinReferral() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    window.location.replace(ref ? `/AltaSocio?ref=${encodeURIComponent(ref)}` : "/AltaSocio");
  }, []);
  return <main className="min-h-screen flex items-center justify-center p-6"><p>Redirigiendo al formulario oficial de alta de socios…</p></main>;
}

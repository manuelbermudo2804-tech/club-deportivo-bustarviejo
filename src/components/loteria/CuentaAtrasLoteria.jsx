import React, { useEffect, useState } from "react";

const pad = (n) => String(n).padStart(2, "0");

// Cuenta atrás en directo hasta la fecha de cierre de la venta.
export default function CuentaAtrasLoteria({ fechaCierre, className = "" }) {
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!fechaCierre) return null;
  const resto = new Date(fechaCierre).getTime() - ahora;
  if (resto <= 0) return <span className={className}>🔒 Venta cerrada</span>;

  const s = Math.floor(resto / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = s % 60;

  return (
    <span className={`tabular-nums ${className}`}>
      ⏳ Cierra en {d > 0 && `${d}d `}{pad(h)}h {pad(m)}m {pad(seg)}s
    </span>
  );
}
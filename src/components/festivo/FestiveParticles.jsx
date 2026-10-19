import React, { useMemo } from "react";
import { CONFETI_COLORES } from "./temasFestivos";

// Capa animada (nieve, estrellas, murciélagos o confeti) que cae suavemente sobre la app sin bloquear clics.
export default function FestiveParticles({ tema }) {
  const esHalloween = tema.nombre === "Halloween";
  const items = useMemo(
    () =>
      Array.from({ length: esHalloween ? 10 : 26 }, (_, i) => ({
        left: Math.random() * 100,
        delay: -Math.random() * 18,
        duration: esHalloween ? 18 + Math.random() * 12 : 10 + Math.random() * 10,
        size: esHalloween ? 9 + Math.random() * 10 : 10 + Math.random() * 16,
        opacity: esHalloween ? 0.18 + Math.random() * 0.22 : 0.35 + Math.random() * 0.55,
        glyph: Array.isArray(tema.particulas) ? tema.particulas[i % tema.particulas.length] : null,
        color: CONFETI_COLORES[i % CONFETI_COLORES.length],
      })),
    [tema, esHalloween]
  );

  return (
    <div className="festive-particles fixed inset-0 z-30 pointer-events-none overflow-hidden" aria-hidden="true">
      {items.map((p, i) => (
        <span
          key={i}
          className="festive-particle absolute top-0"
          style={{ left: `${p.left}%`, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s`, opacity: p.opacity }}
        >
          {p.glyph ? (
            <span className={`${tema.colorParticula} drop-shadow`} style={{ fontSize: p.size }}>{p.glyph}</span>
          ) : (
            <span className={`block rounded-sm ${p.color}`} style={{ width: p.size * 0.45, height: p.size * 0.8 }} />
          )}
        </span>
      ))}
    </div>
  );
}
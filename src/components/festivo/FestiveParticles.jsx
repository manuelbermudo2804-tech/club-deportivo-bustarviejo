import React, { useMemo } from "react";
import { CONFETI_COLORES } from "./temasFestivos";

// Capa animada (nieve, estrellas, murciélagos o confeti) que cae suavemente sobre la app sin bloquear clics.
export default function FestiveParticles({ tema }) {
  const perfil = {
    Halloween: { cantidad: 10, duracion: 18, variacion: 12, tamano: 9, variacionTamano: 10, opacidad: 0.18, variacionOpacidad: 0.22 },
    Navidad: { cantidad: 16, duracion: 16, variacion: 10, tamano: 10, variacionTamano: 12, opacidad: 0.22, variacionOpacidad: 0.28 },
    "Reyes Magos": { cantidad: 12, duracion: 18, variacion: 10, tamano: 9, variacionTamano: 10, opacidad: 0.18, variacionOpacidad: 0.24 },
    Carnaval: { cantidad: 10, duracion: 16, variacion: 10, tamano: 9, variacionTamano: 11, opacidad: 0.2, variacionOpacidad: 0.25 },
  }[tema.nombre] || { cantidad: 14, duracion: 16, variacion: 10, tamano: 10, variacionTamano: 12, opacidad: 0.22, variacionOpacidad: 0.28 };
  const items = useMemo(
    () =>
      Array.from({ length: perfil.cantidad }, (_, i) => ({
        left: Math.random() * 100,
        delay: -Math.random() * 18,
        duration: perfil.duracion + Math.random() * perfil.variacion,
        size: perfil.tamano + Math.random() * perfil.variacionTamano,
        opacity: perfil.opacidad + Math.random() * perfil.variacionOpacidad,
        glyph: Array.isArray(tema.particulas) ? tema.particulas[i % tema.particulas.length] : null,
        color: CONFETI_COLORES[i % CONFETI_COLORES.length],
      })),
    [tema, perfil]
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
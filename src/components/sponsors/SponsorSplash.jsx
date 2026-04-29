import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Crown } from "lucide-react";

/**
 * Splash de 2 segundos al abrir la app que muestra el logo del Patrocinador Principal.
 *
 * Reglas:
 *  - Solo se muestra UNA vez por sesión del navegador (sessionStorage flag).
 *  - Solo aparece si existe un Sponsor con nivel_patrocinio="Principal" Y activo=true.
 *  - Si no hay patrocinador principal o ya se mostró → no renderiza nada (return null).
 *  - Duración: 4 segundos, después se cierra automáticamente.
 */
const SESSION_KEY = "sponsor_splash_shown_v1";
const DURATION_MS = 4000;

export default function SponsorSplash() {
  const [sponsor, setSponsor] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Si ya se mostró en esta sesión, salir
    try {
      if (sessionStorage.getItem(SESSION_KEY) === "1") return;
    } catch {}

    let mounted = true;
    let hideTimer = null;

    (async () => {
      try {
        const all = await base44.entities.Sponsor.list();
        const principal = all.find(
          (s) => s.activo === true && s.nivel_patrocinio === "Principal"
        );
        if (!mounted || !principal) return;

        setSponsor(principal);
        setVisible(true);

        // Marcar como mostrado para esta sesión
        try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}

        // Registrar impresión (no bloqueante)
        try {
          base44.entities.SponsorImpression.create({
            sponsor_id: principal.id,
            sponsor_nombre: principal.nombre,
            ubicacion: 'splash_welcome',
            tipo: 'impression',
            pagina: window.location.pathname,
          });
        } catch {}

        hideTimer = setTimeout(() => {
          if (mounted) setVisible(false);
        }, DURATION_MS);
      } catch {
        // Silencioso: si falla, no mostrar nada
      }
    })();

    return () => {
      mounted = false;
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  if (!sponsor) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900"
        >
          {/* Glow decorativo */}
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", bounce: 0.4 }}
            className="relative flex flex-col items-center px-8 text-center"
          >
            {/* Etiqueta superior */}
            <div className="flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30">
              <Crown className="w-3.5 h-3.5 text-amber-300" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
                Patrocinador Principal
              </span>
            </div>

            {/* Logo */}
            {sponsor.logo_url ? (
              <div className="bg-white rounded-3xl p-6 shadow-2xl mb-5">
                <img
                  src={sponsor.logo_url}
                  alt={sponsor.nombre}
                  className="h-28 lg:h-36 w-auto object-contain"
                />
              </div>
            ) : (
              <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-2xl mb-5">
                <Crown className="w-16 h-16 text-white" />
              </div>
            )}

            {/* Nombre */}
            <p className="text-white font-black text-2xl lg:text-3xl mb-1">
              {sponsor.nombre}
            </p>
            <p className="text-purple-200 text-sm">
              Orgulloso patrocinador de CD Bustarviejo
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Crown } from "lucide-react";

const HALLOWEEN_IMAGE = "https://www.cdbustarviejo.com/img/cdb-halloween-mobile.jpg";
const HALLOWEEN_SESSION_KEY = "cd_bustarviejo_halloween_welcome_v1";

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
const DURATION_MS = 5000;
const HALLOWEEN_DURATION_MS = 15000;

export default function SponsorSplash() {
  const [sponsor, setSponsor] = useState(null);
  const [visible, setVisible] = useState(false);
  const [halloween, setHalloween] = useState(false);

  useEffect(() => {
    let mounted = true;
    let hideTimer = null;

    (async () => {
      try {
        // Halloween se controla desde Temporadas y categorías → Decoración festiva.
        // Tiene prioridad sobre la bienvenida del patrocinador, sin registrar una impresión de GVC.
        const temas = await base44.entities.TemaFestivo.list("-updated_date", 1);
        const temaActivo = temas?.[0]?.tema;
        if (!mounted) return;

        if (temaActivo === "halloween") {
          try {
            if (sessionStorage.getItem(HALLOWEEN_SESSION_KEY) === "1") return;
            sessionStorage.setItem(HALLOWEEN_SESSION_KEY, "1");
          } catch {}
          setHalloween(true);
          setVisible(true);
          hideTimer = setTimeout(() => { if (mounted) setVisible(false); }, HALLOWEEN_DURATION_MS);
          return;
        }

        // Si ya se mostró el patrocinador en esta sesión, salir.
        try { if (sessionStorage.getItem(SESSION_KEY) === "1") return; } catch {}

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

  if (!sponsor && !halloween) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className={`fixed inset-0 z-[10000] flex items-center justify-center overflow-hidden ${halloween ? "bg-black" : "bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900"}`}
        >
          {halloween ? (
            <div className="absolute inset-0 h-full w-full">
              <img src={HALLOWEEN_IMAGE} alt="Halloween del C.D. Bustarviejo" className="h-full w-full object-cover object-center" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-24 text-center">
                <p className="mx-auto max-w-md text-balance text-lg font-black leading-tight text-white drop-shadow-lg sm:text-2xl">🎃 ¡EL C.D. BUSTARVIEJO TE DESEA UN HALLOWEEN DE MIEDO!</p>
              </div>
            </div>
          ) : (
          <>
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
            {sponsor.equipos_patrocinados && sponsor.equipos_patrocinados.length > 0 ? (
              <p className="text-pink-200 text-sm font-semibold">
                💗 Orgullosos del {sponsor.equipos_patrocinados.join(' y ')}
              </p>
            ) : (
              <p className="text-purple-200 text-sm">
                Orgulloso patrocinador de CD Bustarviejo
              </p>
            )}
          </motion.div>
          </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
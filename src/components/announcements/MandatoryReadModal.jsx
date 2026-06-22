import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldAlert, CheckCircle2 } from "lucide-react";
import { playerAllCategories } from "../utils/playerCategoryFilter";

// Modal bloqueante de acuse de recibo obligatorio (Estrategia A).
// Se muestra al abrir la app si el usuario tiene anuncios marcados como
// "requiere_confirmacion" que aún no ha confirmado. No se puede cerrar
// hasta pulsar "He leído este anuncio".
export default function MandatoryReadModal({ user }) {
  const [pending, setPending] = useState([]);
  const [index, setIndex] = useState(0);
  const [checked, setChecked] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user || user.role === "admin") return;
    let cancelled = false;

    const load = async () => {
      try {
        const [announcements, allPlayers] = await Promise.all([
          base44.entities.Announcement.filter({ requiere_confirmacion: true, publicado: true }),
          base44.entities.Player.filter({ email_padre: user.email }).catch(() => []),
        ]);

        // Categorías del usuario (para segmentación por grupo)
        const byTutor2 = await base44.entities.Player.filter({ email_tutor_2: user.email }).catch(() => []);
        const byJugador = await base44.entities.Player.filter({ email_jugador: user.email }).catch(() => []);
        const myPlayers = [...allPlayers, ...byTutor2, ...byJugador];
        const sports = [...new Set(myPlayers.flatMap((p) => playerAllCategories(p)))];

        const now = new Date();
        const relevant = announcements.filter((a) => {
          // Ya confirmado por este usuario
          if ((a.confirmado_por || []).some((c) => c.email === user.email)) return false;

          // Caducidad
          if (a.tipo_caducidad === "horas" && a.fecha_caducidad_calculada) {
            if (now > new Date(a.fecha_caducidad_calculada)) return false;
          } else if (a.fecha_expiracion) {
            if (now > new Date(a.fecha_expiracion)) return false;
          }

          // Segmentación por email específico
          const targeted = Array.isArray(a.destinatarios_emails) ? a.destinatarios_emails : [];
          if (targeted.length > 0) return targeted.includes(user.email);

          // Segmentación por grupo
          if (a.destinatarios_tipo === "Todos") return true;
          return sports.includes(a.destinatarios_tipo);
        });

        if (!cancelled) {
          setPending(relevant);
          setLoaded(true);
        }
      } catch (e) {
        if (!cancelled) setLoaded(true);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [user]);

  const current = pending[index];

  const handleConfirm = async () => {
    if (!current || confirming) return;
    setConfirming(true);
    try {
      const confirmadoPor = current.confirmado_por || [];
      confirmadoPor.push({ email: user.email, nombre: user.full_name, fecha: new Date().toISOString() });
      // También lo marcamos como leído normal para que no salga "NUEVO"
      const leidoPor = current.leido_por || [];
      if (!leidoPor.some((l) => l.email === user.email)) {
        leidoPor.push({ email: user.email, nombre: user.full_name, fecha: new Date().toISOString() });
      }
      await base44.entities.Announcement.update(current.id, { confirmado_por: confirmadoPor, leido_por: leidoPor });

      // Avanzar al siguiente o cerrar
      if (index < pending.length - 1) {
        setIndex(index + 1);
        setChecked(false);
      } else {
        setPending([]);
      }
    } catch (e) {
      // dejar el modal abierto para reintentar
    } finally {
      setConfirming(false);
    }
  };

  if (!loaded || !current) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-r from-red-600 to-red-700 p-5 text-white flex items-center gap-3">
          <ShieldAlert className="w-7 h-7 shrink-0" />
          <div>
            <p className="text-xs font-medium opacity-90">Anuncio importante del club</p>
            <h2 className="text-lg font-bold leading-tight">{current.titulo}</h2>
          </div>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          <p className="text-sm text-slate-700 whitespace-pre-wrap break-words leading-relaxed">
            {current.contenido}
          </p>

          {pending.length > 1 && (
            <p className="mt-4 text-xs text-slate-400 text-center">
              {index + 1} de {pending.length} anuncios por confirmar
            </p>
          )}
        </div>

        <div className="p-5 border-t border-slate-100 bg-slate-50 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="w-5 h-5 accent-red-600"
            />
            <span className="text-sm font-medium text-slate-800">He leído este anuncio</span>
          </label>
          <Button
            onClick={handleConfirm}
            disabled={!checked || confirming}
            className="w-full bg-red-600 hover:bg-red-700 h-11"
          >
            {confirming ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Confirmando...</>
            ) : (
              <><CheckCircle2 className="w-4 h-4 mr-2" /> Confirmar lectura</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
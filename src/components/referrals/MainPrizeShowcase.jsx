import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Trophy, Ticket } from "lucide-react";

/**
 * Tarjeta destacada del premio principal del sorteo + papeletas (con número)
 * del usuario actual. Solo se muestra si hay un premio configurado.
 */
export default function MainPrizeShowcase({ seasonConfig, userEmail }) {
  const [papeletas, setPapeletas] = useState([]);

  const premioNombre = seasonConfig?.sorteo_premio_principal_nombre;
  const premioFoto = seasonConfig?.sorteo_premio_principal_foto;
  const premioTexto = seasonConfig?.sorteo_premio_principal_texto;

  useEffect(() => {
    if (!userEmail || !seasonConfig?.temporada) return;
    let cancelled = false;
    base44.entities.ReferralHistory.filter({
      referidor_email: userEmail,
      temporada: seasonConfig.temporada,
    })
      .then((rows) => {
        if (cancelled) return;
        setPapeletas(rows.filter((r) => r.numero_papeleta).map((r) => r.numero_papeleta));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [userEmail, seasonConfig?.temporada]);

  // Sin premio configurado Y sin papeletas: no mostramos nada.
  // Si el usuario tiene papeletas, las mostramos aunque no haya premio configurado.
  if (!premioNombre && !premioFoto && papeletas.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl overflow-hidden text-slate-900 shadow-lg border-2 border-amber-200">
      {premioFoto && (
        <div className="relative h-44 w-full bg-slate-100">
          <img src={premioFoto} alt={premioNombre || "Premio"} className="w-full h-full object-cover" />
          <div className="absolute top-3 left-3 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5" /> PREMIO DEL SORTEO
          </div>
        </div>
      )}

      <div className="p-4 space-y-3">
        {!premioFoto && (
          <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
            <Trophy className="w-5 h-5" /> PREMIO DEL SORTEO
          </div>
        )}

        {premioNombre && (
          <h3 className="text-2xl font-extrabold text-center text-slate-900">🎁 {premioNombre}</h3>
        )}

        {premioTexto && (
          <p className="text-sm text-slate-600 text-center">{premioTexto}</p>
        )}

        {/* Papeletas del usuario */}
        <div className="border-t border-slate-100 pt-3">
          {papeletas.length > 0 ? (
            <>
              <p className="text-center text-sm font-semibold text-slate-700 mb-2">
                Tus {papeletas.length} papeleta{papeletas.length > 1 ? "s" : ""} para el sorteo:
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {papeletas.map((num) => (
                  <span
                    key={num}
                    className="inline-flex items-center gap-1 bg-gradient-to-br from-orange-500 to-amber-500 text-white font-mono font-bold text-sm px-3 py-1.5 rounded-lg shadow"
                  >
                    <Ticket className="w-3.5 h-3.5" /> #{num}
                  </span>
                ))}
              </div>
              <p className="text-center text-xs text-slate-400 mt-2">
                El día del sorteo se saca un número al azar. ¡Cuantas más papeletas, más opciones!
              </p>
            </>
          ) : (
            <p className="text-center text-sm text-slate-500">
              Aún no tienes papeletas. Cada amigo que traes como socio te da una papeleta con número para este sorteo. 🎟️
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
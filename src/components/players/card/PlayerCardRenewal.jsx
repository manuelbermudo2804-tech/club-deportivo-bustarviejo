import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

const ALL_CATEGORIES = [
  "Fútbol Pre-Benjamín (Mixto)",
  "Fútbol Benjamín (Mixto)",
  "Fútbol Alevín (Mixto)",
  "Fútbol Infantil (Mixto)",
  "Fútbol Cadete",
  "Fútbol Juvenil",
  "Fútbol Aficionado",
  "Fútbol Femenino",
  "Baloncesto (Mixto)"
];

export default function PlayerCardRenewal({ player, needsCategoryChange, categorySuggested, edadActual, onRenew, onMarkNotRenewing }) {
  const [confirmingRenew, setConfirmingRenew] = useState(false);
  const [confirmingNotRenew, setConfirmingNotRenew] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const isSpecialRenewal = needsCategoryChange;
  const gradientClass = isSpecialRenewal
    ? "from-purple-50 to-purple-100 border-purple-400"
    : "from-orange-50 to-orange-100 border-orange-400";
  const accentColor = isSpecialRenewal ? "purple" : "orange";

  return (
    <div className={`bg-gradient-to-r ${gradientClass} border-2 rounded-lg p-3 space-y-2`}>
      <div className="flex items-start gap-2">
        <AlertCircle className={`w-5 h-5 text-${accentColor}-700 mt-0.5 flex-shrink-0`} />
        <div className="flex-1">
          <p className={`text-sm font-bold text-${accentColor}-900 mb-1`}>
            {isSpecialRenewal ? "🎉 Renovación de Categoría" : "⏰ Renovación Pendiente"}
          </p>
          <p className={`text-xs text-${accentColor}-800 leading-relaxed mb-3`}>
            {isSpecialRenewal
              ? `${player.nombre} tiene ${edadActual} años. Elige la categoría para la próxima temporada:`
              : `Es momento de renovar la inscripción de ${player.nombre} para la próxima temporada. Elige categoría:`}
          </p>

          {!confirmingRenew ? (
            <div className="space-y-2">
              <div className="space-y-1">
                <label className={`text-xs font-bold text-${accentColor}-900 block`}>
                  {isSpecialRenewal ? "Selecciona categoría:" : "Categoría:"}
                </label>
                <select
                  value={selectedCategory || player.deporte}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className={`w-full px-3 py-2 border-2 border-${accentColor}-300 rounded-lg text-sm bg-white relative z-50`}
                >
                  <option value={player.deporte}>{player.deporte} (actual)</option>
                  {ALL_CATEGORIES.map(cat => (
                    !cat.includes(player.deporte) && (
                      <option key={cat} value={cat}>{cat}</option>
                    )
                  ))}
                </select>
              </div>
              {isSpecialRenewal && categorySuggested && (
                <div className="bg-purple-100 rounded-lg p-2 text-xs text-purple-900">
                  <p className="font-bold mb-1">Sugerencia:</p>
                  <p>{categorySuggested}</p>
                </div>
              )}
              <Button
                size="sm"
                onClick={(e) => { e.stopPropagation(); setConfirmingRenew(true); }}
                className={`w-full bg-${accentColor}-600 hover:bg-${accentColor}-700 text-white font-bold shadow-lg`}
              >
                {isSpecialRenewal ? "✨ Continuar Renovación" : "🔄 Continuar Renovación"}
              </Button>
            </div>
          ) : (
            <div className={`bg-${accentColor}-100 border-2 border-${accentColor}-400 rounded-lg p-2 space-y-2`}>
              <p className={`text-xs text-${accentColor}-900 font-bold`}>✅ Confirmar renovación:</p>
              <p className={`text-xs text-${accentColor}-800`}>
                {isSpecialRenewal ? `${player.deporte} → ` : "Categoría: "}
                <strong>{selectedCategory || player.deporte}</strong>
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRenew(player, selectedCategory || player.deporte);
                    setConfirmingRenew(false);
                  }}
                  className={`flex-1 bg-${accentColor}-600 hover:bg-${accentColor}-700 text-white`}
                >
                  ✅ Confirmar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => { e.stopPropagation(); setConfirmingRenew(false); }}
                  className="flex-1"
                >
                  Atrás
                </Button>
              </div>
            </div>
          )}

          {onMarkNotRenewing && !confirmingNotRenew && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => { e.stopPropagation(); setConfirmingNotRenew(true); }}
              className="w-full mt-2 border-slate-400 text-slate-700 hover:bg-slate-100"
            >
              ❌ No voy a renovar
            </Button>
          )}
          {confirmingNotRenew && (
            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-2 mt-2">
              <p className="text-xs text-red-800 mb-2 font-bold">⚠️ ¿Seguro que NO quieres renovar?</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkNotRenewing(player);
                    setConfirmingNotRenew(false);
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  Confirmar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => { e.stopPropagation(); setConfirmingNotRenew(false); }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
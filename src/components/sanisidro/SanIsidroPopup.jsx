import React, { useState, useEffect } from "react";
import { X, PartyPopper, Trophy, Users } from "lucide-react";
import SanIsidroForm from "./SanIsidroForm";

const FECHA_INICIO = new Date("2026-04-19T00:00:00");
const FECHA_FIN = new Date("2026-05-15T23:59:59");
const DISMISS_KEY = "sanisidro2026_popup_dismissed";

export default function SanIsidroPopup() {
  const [visible, setVisible] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const now = new Date();
    if (now < FECHA_INICIO || now > FECHA_FIN) return;

    const dismissed = sessionStorage.getItem(DISMISS_KEY);
    if (dismissed) return;

    const timer = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setVisible(false);
    sessionStorage.setItem(DISMISS_KEY, "1");
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-opacity duration-400"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-2xl animate-fade-in-scale max-h-[90vh] flex flex-col">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 bg-black/60 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {showForm ? (
          <SanIsidroForm onClose={handleClose} onBack={() => setShowForm(false)} />
        ) : (
          <>
            {/* Cartel image */}
            <div className="relative">
              <div className="bg-gradient-to-br from-red-600 via-yellow-500 to-green-600 p-6 text-center">
                <PartyPopper className="w-12 h-12 text-white mx-auto mb-2" />
                <h2 className="text-white text-2xl font-black tracking-tight">🎉 SAN ISIDRO 2026</h2>
                <p className="text-white/90 text-sm mt-1">Fiestas del CD Bustarviejo</p>
                <p className="text-yellow-200 text-xs mt-2 font-semibold">15 de Mayo • ¡No te lo pierdas!</p>
              </div>
            </div>

            {/* Activities */}
            <div className="p-4 space-y-3">
              <h3 className="text-slate-800 font-bold text-center text-lg">Torneos Deportivos</h3>
              
              <div className="bg-orange-50 rounded-xl p-3 border border-orange-200">
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="w-5 h-5 text-orange-600" />
                  <span className="font-bold text-orange-800">Fútbol Chapa</span>
                </div>
                <p className="text-orange-700 text-xs">• Categoría Niños/Jóvenes</p>
                <p className="text-orange-700 text-xs">• Categoría Adultos</p>
              </div>

              <div className="bg-green-50 rounded-xl p-3 border border-green-200">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-5 h-5 text-green-600" />
                  <span className="font-bold text-green-800">3 para 3</span>
                </div>
                <p className="text-green-700 text-xs">• Categoría 7-10 años</p>
                <p className="text-green-700 text-xs">• Categoría 11-15 años</p>
                <p className="text-green-700 text-xs">Equipos de 3 jugadores</p>
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={() => setShowForm(true)}
              className="block w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 text-lg transition-colors"
            >
              📝 INSCRIPCIONES
            </button>
          </>
        )}
      </div>
    </div>
  );
}
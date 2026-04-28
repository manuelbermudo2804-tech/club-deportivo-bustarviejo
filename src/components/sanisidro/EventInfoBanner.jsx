import React from "react";
import { MapPin, Calendar, Clock, Phone, Mail, Beer, UtensilsCrossed, Trophy, Users, Sparkles } from "lucide-react";

/**
 * Banner festivo con toda la información del cartel oficial.
 * Se muestra en la parte superior de la página pública para animar a la gente.
 */
export default function EventInfoBanner() {
  return (
    <div className="space-y-3">
      {/* Hero principal */}
      <div className="relative overflow-hidden rounded-2xl shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-red-600 via-orange-500 to-yellow-400" />
        {/* Festones decorativos */}
        <div className="absolute top-0 left-0 right-0 h-3 flex">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="flex-1"
              style={{ background: ["#dc2626", "#facc15", "#16a34a", "#2563eb", "#f97316"][i % 5] }}
            />
          ))}
        </div>
        <div className="relative p-5 text-center text-white">
          <div className="inline-flex items-center gap-1 bg-white/20 backdrop-blur rounded-full px-3 py-1 text-xs font-semibold mb-2">
            <Sparkles className="w-3 h-3" /> JORNADA DEPORTIVA Y FESTIVA
          </div>
          <h2 className="text-3xl font-black drop-shadow-lg">SAN ISIDRO 2026</h2>
          <div className="mt-2 inline-block bg-white text-red-700 font-black text-lg px-5 py-1.5 rounded-full shadow-md">
            🗓️ 15 DE MAYO
          </div>
          <p className="mt-2 text-sm font-semibold flex items-center justify-center gap-1">
            <MapPin className="w-4 h-4" /> Bustarviejo
          </p>
        </div>
      </div>

      {/* Programa */}
      <div className="bg-white rounded-2xl shadow-md border border-orange-200 p-4 space-y-3">
        <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
          <Trophy className="w-4 h-4 text-orange-600" />
          PROGRAMA DEL DÍA
        </h3>

        {/* Plaza Ayuntamiento */}
        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-3 border border-orange-200">
          <div className="flex items-center gap-2 text-orange-800 font-bold text-sm">
            <Clock className="w-4 h-4" /> A partir de las 17:00h
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-600 mt-1 font-semibold">
            <MapPin className="w-3 h-3" /> Plaza del Ayuntamiento
          </div>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            <li className="flex items-start gap-1.5">
              <span className="text-green-600 font-bold">✓</span>
              Fútbol 3×3 por categorías <span className="text-slate-500 text-xs">(desde 6 años)</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-green-600 font-bold">✓</span>
              Fútbol Chapa <span className="text-slate-500 text-xs">(2 categorías)</span>
            </li>
          </ul>
        </div>

        {/* Antiguas escuelas */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3 border border-green-200">
          <div className="flex items-center gap-2 text-green-800 font-bold text-sm">
            <Users className="w-4 h-4" /> Antiguas Escuelas
          </div>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            <li className="flex items-start gap-1.5"><span className="text-green-600 font-bold">✓</span> Fut-tenis</li>
            <li className="flex items-start gap-1.5"><span className="text-green-600 font-bold">✓</span> Baloncesto 3×3</li>
            <li className="flex items-start gap-1.5"><span className="text-green-600 font-bold">✓</span> Juegos deportivos <span className="text-slate-500 text-xs">(3 a 6 años)</span></li>
          </ul>
        </div>

        {/* Comida */}
        <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-xl p-3 border border-red-200">
          <div className="flex items-center gap-2 text-red-800 font-bold text-sm">
            <UtensilsCrossed className="w-4 h-4" /> Zona Comida y Punto de Información
          </div>
          <div className="text-xs text-slate-600 font-semibold mt-1">Desde las 13:00h</div>
          <div className="grid grid-cols-3 gap-1 mt-2 text-xs">
            <div className="bg-white rounded px-2 py-1 text-center font-semibold text-slate-700">🌭 Perritos</div>
            <div className="bg-white rounded px-2 py-1 text-center font-semibold text-slate-700">🥤 Refrescos</div>
            <div className="bg-white rounded px-2 py-1 text-center font-semibold text-slate-700 flex items-center justify-center gap-0.5"><Beer className="w-3 h-3" /> Cerveza</div>
          </div>
        </div>
      </div>

      {/* Llamada motivadora */}
      <div className="bg-gradient-to-r from-yellow-300 to-orange-300 rounded-2xl p-4 text-center shadow-md">
        <p className="font-black text-red-800 text-sm">
          ¡Apunta a tus hijos y ven a disfrutar del deporte en familia!
        </p>
        <p className="text-xs text-slate-700 mt-1 font-semibold">
          💪 Ayúdanos a recaudar fondos para el deporte base en Bustarviejo
        </p>
      </div>

      {/* Contacto */}
      <div className="bg-slate-800 text-white rounded-2xl p-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs">
        <a href="tel:606046828" className="flex items-center gap-1 font-semibold hover:text-yellow-300">
          <Phone className="w-3 h-3" /> 606 046 828
        </a>
        <a href="mailto:info@cdbustarviejo.com" className="flex items-center gap-1 font-semibold hover:text-yellow-300">
          <Mail className="w-3 h-3" /> info@cdbustarviejo.com
        </a>
      </div>
    </div>
  );
}
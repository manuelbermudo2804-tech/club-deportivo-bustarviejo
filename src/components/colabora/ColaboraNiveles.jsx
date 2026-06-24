import React from "react";
import { CheckCircle2, Hand, Sparkles } from "lucide-react";

// Niveles fijos de colaboración (sin Patrocinador Principal, según el club).
// El club puede ajustar precios/textos aquí fácilmente.
export const NIVELES = [
  {
    id: "colaborador",
    nombre: "Colaborador",
    precio: 100,
    sub: "Cuota base · 1 temporada",
    icon: Hand,
    destacado: true,
    incluye: [
      "Logo en la App del club (familias y deportistas)",
      "Logo en la Web oficial del club",
      "Mención en el boletín del club",
      "Publicación en redes sociales",
    ],
  },
];

export default function ColaboraNiveles({ selected, onSelect }) {
  return (
    <div className="grid gap-4">
      {NIVELES.map((n) => {
        const isSel = selected === n.id;
        return (
          <button
            key={n.id}
            type="button"
            onClick={() => onSelect(n.id)}
            className={`relative text-left bg-white rounded-2xl p-5 border-2 transition-all ${
              isSel
                ? "border-orange-500 ring-2 ring-orange-200 shadow-lg"
                : "border-slate-200 hover:border-orange-300 hover:shadow-md"
            }`}
          >
            {n.destacado && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow">
                MÁS POPULAR
              </span>
            )}
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSel ? "bg-orange-100" : "bg-slate-100"}`}>
                <n.icon className={`w-5 h-5 ${isSel ? "text-orange-600" : "text-slate-500"}`} />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900 leading-none">{n.precio}€</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{n.sub}</p>
              </div>
              {isSel && <CheckCircle2 className="w-5 h-5 text-orange-600 ml-auto" />}
            </div>
            <p className="font-bold text-slate-800 mb-2">{n.nombre}</p>
            <ul className="space-y-1.5">
              {n.incluye.map((item, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </button>
        );
      })}

      {/* Otra cantidad */}
      <button
        type="button"
        onClick={() => onSelect("otra")}
        className={`text-left bg-white rounded-2xl p-5 border-2 transition-all ${
          selected === "otra"
            ? "border-orange-500 ring-2 ring-orange-200 shadow-lg"
            : "border-dashed border-slate-300 hover:border-orange-300"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selected === "otra" ? "bg-orange-100" : "bg-slate-100"}`}>
            <Sparkles className={`w-5 h-5 ${selected === "otra" ? "text-orange-600" : "text-slate-500"}`} />
          </div>
          <div>
            <p className="font-bold text-slate-800">Otra cantidad</p>
            <p className="text-xs text-slate-500">Elige libremente cuánto quieres aportar al club</p>
          </div>
          {selected === "otra" && <CheckCircle2 className="w-5 h-5 text-orange-600 ml-auto" />}
        </div>
      </button>
    </div>
  );
}
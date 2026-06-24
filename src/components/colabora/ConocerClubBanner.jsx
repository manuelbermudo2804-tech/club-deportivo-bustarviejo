import React from "react";
import { Heart, ArrowRight } from "lucide-react";

// Banner que invita al colaborador a conocer la historia e impacto del club
// antes de aportar. Lleva a la página pública /Patrocinadores.
export default function ConocerClubBanner() {
  return (
    <a
      href="/Patrocinadores"
      className="block bg-white rounded-2xl border-2 border-orange-200 shadow-sm hover:shadow-md hover:border-orange-300 transition-all p-4 lg:p-5"
    >
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-orange-500 to-green-600 flex items-center justify-center">
          <Heart className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-black text-slate-900 leading-tight">¿Quieres conocer mejor el club antes de colaborar?</p>
          <p className="text-sm text-slate-500 mt-0.5">Descubre nuestra historia, el impacto que generas y lo que conseguimos juntos.</p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 text-orange-600 font-bold text-sm shrink-0">
          Ver historia <ArrowRight className="w-4 h-4" />
        </span>
      </div>
    </a>
  );
}
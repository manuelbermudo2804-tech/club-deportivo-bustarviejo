import React from "react";
import { Badge } from "@/components/ui/badge";
import { Home, TrendingUp, MapPin } from "lucide-react";

const POTENCIAL_STYLE = {
  alto: "bg-red-100 text-red-700 border-red-200",
  medio: "bg-amber-100 text-amber-700 border-amber-200",
  bajo: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function LocalityRankingCard({ loc }) {
  return (
    <div className={`rounded-xl border p-3 ${loc.esBase ? "border-green-200 bg-green-50" : "border-slate-200 bg-white"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {loc.esBase ? (
            <Home className="w-4 h-4 text-green-600 flex-shrink-0" />
          ) : (
            <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
          )}
          <span className="font-bold text-slate-800 truncate">{loc.label}</span>
        </div>
        <div className="text-right flex-shrink-0">
          <span className="text-lg font-bold text-slate-900">{loc.count}</span>
          <span className="text-xs text-slate-500 ml-1">{loc.pct}%</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        {loc.esBase ? (
          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 text-[10px]">
            Sede del club
          </Badge>
        ) : (
          <Badge variant="outline" className={`text-[10px] capitalize ${POTENCIAL_STYLE[loc.potencial]}`}>
            <TrendingUp className="w-3 h-3 mr-1" />
            Potencial {loc.potencial}
          </Badge>
        )}
        {loc.categorias.slice(0, 3).map((c) => (
          <span key={c.nombre} className="text-[10px] text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">
            {c.nombre.replace("Fútbol ", "").replace(" (Mixto)", "")} ({c.n})
          </span>
        ))}
      </div>
    </div>
  );
}
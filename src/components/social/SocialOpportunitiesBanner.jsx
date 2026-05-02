import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Sparkles, ChevronRight, Loader2, AlertCircle } from "lucide-react";

const PRIORITY_STYLES = {
  urgent: { gradient: "from-red-500 to-rose-600", label: "🔥 URGENTE", pulse: true },
  high: { gradient: "from-orange-500 to-amber-600", label: "⚡ Importante", pulse: false },
  medium: { gradient: "from-blue-500 to-indigo-600", label: "💡 Sugerencia", pulse: false },
  low: { gradient: "from-slate-500 to-slate-600", label: "📌 Recordatorio", pulse: false },
};

export default function SocialOpportunitiesBanner({ onSelect }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["socialOpportunities"],
    queryFn: async () => {
      const { data: res } = await base44.functions.invoke("socialOpportunityDetector", {});
      return res;
    },
    staleTime: 5 * 60 * 1000, // 5 min
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 border border-purple-500/30 rounded-2xl p-4 flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-purple-300" />
        <p className="text-purple-100 text-sm">Detectando oportunidades de difusión...</p>
      </div>
    );
  }

  if (error || !data?.opportunities?.length) {
    return null;
  }

  const opportunities = data.opportunities;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Sparkles className="w-5 h-5 text-yellow-400" />
        <h2 className="text-white font-black text-base">Oportunidades detectadas</h2>
        <span className="ml-auto text-xs bg-yellow-400/20 text-yellow-300 px-2 py-0.5 rounded-full font-bold">
          {opportunities.length}
        </span>
      </div>

      <div className="space-y-2">
        {opportunities.map((opp) => {
          const style = PRIORITY_STYLES[opp.priority] || PRIORITY_STYLES.medium;
          return (
            <button
              key={opp.id}
              onClick={() => onSelect(opp)}
              className={`w-full bg-gradient-to-r ${style.gradient} rounded-2xl p-4 text-left text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99] ${style.pulse ? "animate-pulse" : ""}`}
            >
              <div className="flex items-start gap-3">
                <div className="text-3xl flex-shrink-0">{opp.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-black bg-white/25 px-2 py-0.5 rounded-full">
                      {style.label}
                    </span>
                  </div>
                  <p className="font-bold text-sm leading-tight">{opp.title}</p>
                  <p className="text-white/80 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {opp.reason}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 flex-shrink-0 opacity-80" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
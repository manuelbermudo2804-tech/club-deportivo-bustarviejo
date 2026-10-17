import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Sparkles, ChevronRight, Loader2, AlertCircle } from "lucide-react";

const PRIORITY_STYLES = {
  urgent: { accent: "border-red-300 bg-red-50 text-red-800", label: "🔥 URGENTE", pulse: true },
  high: { accent: "border-orange-300 bg-orange-50 text-orange-800", label: "⚡ Importante", pulse: false },
  medium: { accent: "border-slate-200 bg-white text-slate-800", label: "💡 Sugerencia", pulse: false },
  low: { accent: "border-slate-200 bg-slate-50 text-slate-700", label: "📌 Recordatorio", pulse: false },
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
      <div className="flex items-center gap-3 rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-orange-600" />
        <p className="text-sm text-slate-700">Detectando oportunidades de difusión...</p>
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
        <Sparkles className="h-5 w-5 text-orange-600" />
        <h2 className="text-base font-black text-slate-900">Oportunidades detectadas</h2>
        <span className="ml-auto rounded-full bg-orange-50 px-2 py-0.5 text-xs font-bold text-orange-800">
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
              className={`w-full rounded-2xl border p-4 text-left shadow-sm transition-colors hover:shadow-md ${style.accent} ${style.pulse ? "animate-pulse" : ""}`}
            >
              <div className="flex items-start gap-3">
                <div className="text-3xl flex-shrink-0">{opp.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black">
                      {style.label}
                    </span>
                  </div>
                  <p className="font-bold text-sm leading-tight">{opp.title}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs opacity-80">
                    <AlertCircle className="w-3 h-3" />
                    {opp.reason}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 flex-shrink-0 opacity-70" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
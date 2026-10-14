import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { Users, Star } from "lucide-react";

function AttendanceLiveStats({ stats, onMarkAllPresent, onDefaultEvaluation }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-4">
      <span className="mr-1 text-sm font-bold text-slate-900">{stats.total} jugadores</span>
      {stats.presente > 0 && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✅ {stats.presente}</span>}
      {stats.ausente > 0 && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">❌ {stats.ausente}</span>}
      {stats.justificado > 0 && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">📝 {stats.justificado}</span>}
      {stats.tardanza > 0 && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">⏰ {stats.tardanza}</span>}
      {stats.sinMarcar > 0 && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">⬜ {stats.sinMarcar}</span>}
      <div className="flex-1" />
      {stats.sinMarcar > 0 && (
        <Button size="sm" variant="outline" onClick={onMarkAllPresent} className="h-9 rounded-xl border-emerald-200 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">
          <Users className="w-3 h-3 mr-1" />
          Todos ✅
        </Button>
      )}
      {stats.presente > 0 && (
        <Button size="sm" variant="outline" onClick={onDefaultEvaluation} className="h-9 rounded-xl border-amber-200 text-xs font-semibold text-amber-700 hover:bg-amber-50">
          <Star className="w-3 h-3 mr-1" />
          3/5
        </Button>
      )}
    </div>
  );
}

export default memo(AttendanceLiveStats);
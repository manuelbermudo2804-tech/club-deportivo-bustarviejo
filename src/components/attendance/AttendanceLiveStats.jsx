import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { Users, Star } from "lucide-react";

function AttendanceLiveStats({ stats, onMarkAllPresent, onDefaultEvaluation }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 bg-white rounded-xl shadow-sm p-2.5 border">
      <span className="text-sm font-semibold text-slate-700 mr-1">{stats.total}:</span>
      {stats.presente > 0 && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✅ {stats.presente}</span>}
      {stats.ausente > 0 && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">❌ {stats.ausente}</span>}
      {stats.justificado > 0 && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">📝 {stats.justificado}</span>}
      {stats.tardanza > 0 && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">⏰ {stats.tardanza}</span>}
      {stats.sinMarcar > 0 && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">⬜ {stats.sinMarcar}</span>}
      <div className="flex-1" />
      {stats.sinMarcar > 0 && (
        <Button size="sm" variant="outline" onClick={onMarkAllPresent} className="h-7 text-xs border-green-300 text-green-700">
          <Users className="w-3 h-3 mr-1" />
          Todos ✅
        </Button>
      )}
      {stats.presente > 0 && (
        <Button size="sm" variant="outline" onClick={onDefaultEvaluation} className="h-7 text-xs border-yellow-300 text-yellow-700">
          <Star className="w-3 h-3 mr-1" />
          3/5
        </Button>
      )}
    </div>
  );
}

export default memo(AttendanceLiveStats);
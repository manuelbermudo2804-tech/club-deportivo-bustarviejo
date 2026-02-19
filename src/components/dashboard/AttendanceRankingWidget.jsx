import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Trophy } from "lucide-react";

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { startStr: start.toISOString().split("T")[0], endStr: end.toISOString().split("T")[0] };
}

const MEDALS = ["🥇", "🥈", "🥉"];
const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export default function AttendanceRankingWidget({ highlightCategories }) {
  const month = getMonthRange();

  const { data: attendances = [], isLoading } = useQuery({
    queryKey: ["attendanceRanking", month.startStr],
    queryFn: () => base44.entities.Attendance.filter({ fecha: { $gte: month.startStr, $lte: month.endStr } }),
    staleTime: 600000, // 10 min
  });

  // Agrupar por categoría
  const categoryStats = {};
  attendances.forEach((att) => {
    const cat = att.categoria;
    if (!cat) return;
    if (!categoryStats[cat]) categoryStats[cat] = { total: 0, attended: 0 };
    (att.asistencias || []).forEach((a) => {
      categoryStats[cat].total++;
      if (a.estado === "presente" || a.estado === "tardanza") categoryStats[cat].attended++;
    });
  });

  const ranking = Object.entries(categoryStats)
    .map(([cat, s]) => ({ cat, pct: s.total > 0 ? Math.round((s.attended / s.total) * 100) : 0, total: s.total }))
    .filter((r) => r.total >= 3) // al menos 3 registros
    .sort((a, b) => b.pct - a.pct);

  if (isLoading || ranking.length === 0) return null;

  const myPosition = highlightCategories?.length > 0
    ? ranking.findIndex((r) => highlightCategories.includes(r.cat)) + 1
    : 0;

  const currentMonth = MONTH_NAMES[new Date().getMonth()];

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-4 shadow-lg">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-5 h-5 text-yellow-400" />
        <h3 className="text-white font-bold text-sm">🔥 Ranking Asistencia - {currentMonth}</h3>
      </div>

      <div className="space-y-1.5">
        {ranking.slice(0, 5).map((item, i) => {
          const isHighlighted = highlightCategories?.includes(item.cat);
          return (
            <div
              key={item.cat}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${isHighlighted ? "bg-orange-600/20 border border-orange-500/40 ring-1 ring-orange-500/30" : "bg-slate-700/40"}`}
            >
              <span className="text-lg w-6 text-center">{i < 3 ? MEDALS[i] : `${i + 1}º`}</span>
              <span className={`flex-1 text-sm truncate ${isHighlighted ? "text-orange-300 font-bold" : "text-slate-300"}`}>
                {item.cat}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-2 bg-slate-600 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.pct >= 80 ? "bg-green-500" : item.pct >= 60 ? "bg-yellow-500" : "bg-red-500"}`}
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
                <span className={`text-xs font-bold w-10 text-right ${isHighlighted ? "text-orange-400" : "text-slate-400"}`}>
                  {item.pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {myPosition > 0 && myPosition > 5 && (
        <div className="mt-2 text-center">
          <p className="text-slate-400 text-xs">Tu equipo: <span className="text-orange-400 font-bold">{myPosition}ª posición</span></p>
        </div>
      )}

      {myPosition > 0 && myPosition <= 3 && (
        <div className="mt-2 text-center">
          <p className="text-yellow-400 text-xs font-bold">🎉 ¡Tu equipo está en el podio!</p>
        </div>
      )}
    </div>
  );
}
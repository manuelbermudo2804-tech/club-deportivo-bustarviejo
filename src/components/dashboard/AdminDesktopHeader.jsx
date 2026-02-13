import React from "react";
import { Users, CreditCard, FileSignature, Bell } from "lucide-react";

const CLUB_LOGO_URL = `https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg`;

function KPICard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-2xl p-5 flex items-center gap-4 hover:border-orange-500/50 transition-colors">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-slate-400">{label}</p>
        {sub && <p className="text-[10px] text-orange-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function AdminDesktopHeader({ user, stats, currentSeason }) {
  const now = new Date();
  const greeting = now.getHours() < 14 ? "Buenos días" : now.getHours() < 21 ? "Buenas tardes" : "Buenas noches";
  const dateStr = now.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="space-y-6">
      {/* Header con saludo */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src={CLUB_LOGO_URL} alt="CD Bustarviejo" className="w-14 h-14 rounded-2xl shadow-xl ring-2 ring-orange-500/40 object-cover" />
          <div>
            <h1 className="text-2xl font-bold text-white">
              {greeting}, {user?.full_name?.split(" ")[0] || "Admin"} 👋
            </h1>
            <p className="text-sm text-slate-400 capitalize">{dateStr}</p>
            <p className="text-xs text-orange-400 font-medium mt-0.5">Temporada {currentSeason}</p>
          </div>
        </div>
      </div>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard
          icon={Users}
          label="Jugadores activos"
          value={stats.activePlayers || 0}
          color="from-orange-600 to-orange-700"
        />
        <KPICard
          icon={CreditCard}
          label="Pagos en revisión"
          value={stats.reviewPayments || 0}
          color="from-green-600 to-green-700"
          sub={stats.reviewPayments > 0 ? "requieren atención" : null}
        />
        <KPICard
          icon={FileSignature}
          label="Firmas pendientes"
          value={stats.adminPendingSignatures || 0}
          color="from-yellow-600 to-orange-600"
          sub={stats.adminPendingSignatures > 0 ? "sin completar" : null}
        />
        <KPICard
          icon={Bell}
          label="Respuestas convocatorias"
          value={stats.pendingCallupResponses || 0}
          color="from-blue-600 to-blue-700"
          sub={stats.pendingCallupResponses > 0 ? "por confirmar" : null}
        />
      </div>
    </div>
  );
}
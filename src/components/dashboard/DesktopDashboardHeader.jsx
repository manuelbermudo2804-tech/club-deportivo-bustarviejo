import React from "react";

const CLUB_LOGO_URL = `https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg`;

const KPICard = React.memo(function KPICard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 flex items-center gap-4 hover:border-orange-500/40 transition-colors duration-200">
      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-md`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-extrabold text-white tracking-tight">{value}</p>
        <p className="text-[11px] text-slate-400 font-medium">{label}</p>
        {sub && <p className="text-[10px] text-orange-400/90 mt-0.5 font-medium">{sub}</p>}
      </div>
    </div>
  );
});

const DesktopDashboardHeader = React.memo(function DesktopDashboardHeader({ user, roleName, roleEmoji, kpis = [], subtitle }) {
  const now = new Date();
  const greeting = now.getHours() < 14 ? "Buenos días" : now.getHours() < 21 ? "Buenas tardes" : "Buenas noches";
  const dateStr = now.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="hidden lg:block space-y-6">
      {/* Header con saludo */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src={CLUB_LOGO_URL} alt="CD Bustarviejo" className="w-14 h-14 rounded-2xl shadow-lg ring-2 ring-orange-500/30 object-cover" loading="eager" />
          <div>
            <h1 className="text-2xl font-bold text-white">
              {greeting}, {user?.full_name?.split(" ")[0] || "Usuario"} 👋
            </h1>
            <p className="text-sm text-slate-400 capitalize">{dateStr}</p>
            <p className="text-xs text-orange-400 font-medium mt-0.5">{roleEmoji} {roleName}{subtitle ? ` • ${subtitle}` : ''}</p>
          </div>
        </div>
      </div>

      {/* KPIs rápidos */}
      {kpis.length > 0 && (
        <div className={`grid gap-4 ${kpis.length <= 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
          {kpis.map((kpi, i) => (
            <KPICard key={i} {...kpi} />
          ))}
        </div>
      )}
    </div>
  );
});

export default DesktopDashboardHeader;
export { KPICard };
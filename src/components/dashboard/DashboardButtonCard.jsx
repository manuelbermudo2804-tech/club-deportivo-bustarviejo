import React from "react";
import { Link } from "react-router-dom";

const DashboardButtonCard = React.memo(function DashboardButtonCard({ item, isExternal, extraBadge }) {
  const badge = extraBadge || (item.badge !== undefined && item.badge > 0 ? { value: item.badge, label: item.badgeLabel } : null);

  const content = (
    <div className="relative bg-slate-800 rounded-2xl lg:rounded-3xl overflow-hidden shadow-md lg:shadow-lg transition-all duration-200 active:scale-[0.97] border border-slate-700/70 hover:border-orange-500/50 group">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-700/30 to-black/60 opacity-50"></div>
      <div className={`absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl ${item.gradient} opacity-20 blur-xl`}></div>
      
      {/* Móvil: compacto */}
      <div className="relative z-10 p-2.5 flex flex-col items-center justify-center min-h-[96px] lg:hidden">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-1.5 shadow-md`}>
          <item.icon className="w-[18px] h-[18px] text-white" />
        </div>
        <h3 className="text-white font-semibold text-center text-[11px] leading-tight">{item.title}</h3>
        {badge && (
          <span className="bg-orange-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full mt-1">
            {badge.value} {badge.label}
          </span>
        )}
      </div>

      {/* Desktop */}
      <div className="relative z-10 p-4 hidden lg:flex items-center gap-4 min-h-[86px]">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-md flex-shrink-0 group-hover:scale-105 transition-transform duration-200`}>
          <item.icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-sm truncate">{item.title}</h3>
          {badge && (
            <p className="text-orange-400 text-xs font-medium mt-0.5">{badge.value} {badge.label}</p>
          )}
        </div>
      </div>
    </div>
  );

  if (isExternal) {
    return <a href={item.url} target="_blank" rel="noopener noreferrer">{content}</a>;
  }
  return <Link to={item.url}>{content}</Link>;
});

export default DashboardButtonCard;
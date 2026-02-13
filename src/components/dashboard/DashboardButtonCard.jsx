import React from "react";
import { Link } from "react-router-dom";

export default function DashboardButtonCard({ item, isExternal, extraBadge }) {
  const Wrapper = isExternal 
    ? ({ children }) => <a href={item.url} target="_blank" rel="noopener noreferrer" className="group">{children}</a>
    : ({ children }) => <Link to={item.url} className="group">{children}</Link>;

  const badge = extraBadge || (item.badge !== undefined && item.badge > 0 ? { value: item.badge, label: item.badgeLabel } : null);

  return (
    <Wrapper>
      <div className="relative bg-slate-800 rounded-2xl lg:rounded-3xl overflow-hidden shadow-lg lg:shadow-elegant-xl card-hover-glow transition-all duration-300 active:scale-[0.97] border border-slate-700/80 lg:border-2 hover:border-orange-500/60 btn-hover-shine">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-700/40 to-black/70 opacity-60"></div>
        <div className={`absolute bottom-0 right-0 w-28 h-28 lg:w-32 lg:h-32 bg-gradient-to-tl ${item.gradient} opacity-25 blur-2xl transition-opacity duration-300 group-hover:opacity-50`}></div>
        <div className={`absolute top-0 left-0 w-20 h-20 lg:w-24 lg:h-24 bg-gradient-to-br ${item.gradient} opacity-15 blur-xl transition-opacity duration-300 group-hover:opacity-40`}></div>
        
        {/* Móvil: compacto y refinado */}
        <div className="relative z-10 p-3 flex flex-col items-center justify-center min-h-[115px] lg:hidden">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-2 shadow-lg ring-1 ring-white/10`}>
            <item.icon className="w-5 h-5 text-white drop-shadow-sm" />
          </div>
          <h3 className="text-white font-semibold text-center text-[13px] leading-tight mb-1">{item.title}</h3>
          {badge && (
            <span className="bg-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md">
              {badge.value} {badge.label}
            </span>
          )}
        </div>

        {/* Desktop: compacto horizontal */}
        <div className="relative z-10 p-4 hidden lg:flex items-center gap-4 min-h-[90px]">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-lg flex-shrink-0 icon-hover-bounce`}>
            <item.icon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-sm truncate">{item.title}</h3>
            {badge && (
              <p className="text-orange-400 text-xs font-medium mt-0.5">{badge.value} {badge.label}</p>
            )}
          </div>
        </div>
      </div>
    </Wrapper>
  );
}
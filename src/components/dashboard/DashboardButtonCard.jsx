import React from "react";
import { Link } from "react-router-dom";

export default function DashboardButtonCard({ item, isExternal, extraBadge }) {
  const Wrapper = isExternal 
    ? ({ children }) => <a href={item.url} target="_blank" rel="noopener noreferrer" className="group">{children}</a>
    : ({ children }) => <Link to={item.url} className="group">{children}</Link>;

  const badge = extraBadge || (item.badge !== undefined && item.badge > 0 ? { value: item.badge, label: item.badgeLabel } : null);

  return (
    <Wrapper>
      <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-elegant-xl card-hover-glow transition-all duration-300 active:scale-95 border-2 border-slate-700 hover:border-orange-500 btn-hover-shine">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
        <div className={`absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl ${item.gradient} opacity-30 blur-2xl transition-opacity duration-300 group-hover:opacity-50`}></div>
        <div className={`absolute top-0 left-0 w-24 h-24 bg-gradient-to-br ${item.gradient} opacity-20 blur-xl transition-opacity duration-300 group-hover:opacity-40`}></div>
        
        {/* Móvil: centrado vertical */}
        <div className="relative z-10 p-4 flex flex-col items-center justify-center min-h-[140px] lg:hidden">
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-3 shadow-2xl icon-hover-bounce`}>
            <item.icon className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-white font-bold text-center text-sm mb-2">{item.title}</h3>
          {badge && (
            <div className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full badge-pulse">
              <p className="text-white text-[10px] font-semibold">{badge.value} {badge.label}</p>
            </div>
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
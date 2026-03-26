import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { MessageCircle, Smartphone, RotateCw, UserX, LogOut, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function MobileMenu({
  isAdmin, isAppInstalled, navigationItems, location,
  hasNewVersion, onClose, onShowDeleteAccount, onShowFeedback,
  onShowInstall, onLogout, BUILD_VERSION, user
}) {
  return (
    <div className="lg:hidden fixed inset-0 z-[100]" style={{ backgroundColor: 'rgba(15, 23, 42, 0.97)' }}>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-600 to-orange-700">
          <div className="text-white">
            <h2 className="font-bold text-lg">Menú</h2>
            <p className="text-xs text-orange-100">CD Bustarviejo</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onShowDeleteAccount} className="p-2 text-red-400 hover:bg-red-500/20 rounded-xl transition-colors" title="Eliminar cuenta">
              <UserX className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-2 text-white hover:bg-white/20 rounded-xl transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isAdmin ? (
            <Link to={createPageUrl("FeedbackManagement")} onClick={onClose}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg mb-4">
              <MessageCircle className="w-6 h-6 flex-shrink-0" />
              <span className="font-bold text-base flex-1">💬 Ver Feedback Usuarios</span>
            </Link>
          ) : (
            <button onClick={onShowFeedback}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg mb-4">
              <MessageCircle className="w-6 h-6 flex-shrink-0" />
              <span className="font-bold text-base flex-1">💬 Suggerencias y Bugs</span>
            </button>
          )}

          {!isAppInstalled && (
            <button onClick={onShowInstall}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg mb-4">
              <Smartphone className="w-6 h-6 flex-shrink-0" />
              <span className="font-bold text-base flex-1">📲 Ver cómo instalar la App</span>
            </button>
          )}

          {navigationItems.map((item) => {
            if (item.section) {
              return (
                <div key={item.title} className="px-2 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider">
                  {item.title}
                </div>
              );
            }
            return item.externalUrl ? (
              <a key={item.title} href={item.externalUrl} target="_blank" rel="noopener noreferrer" onClick={onClose}
                className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${
                  item.highlight ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg ring-2 ring-green-400 animate-pulse' : 'bg-white/10 text-white hover:bg-white/20'
                }`}>
                <item.icon className="w-6 h-6 flex-shrink-0" />
                <span className="font-semibold text-base flex-1">{item.title}</span>
              </a>
            ) : (
              <Link key={item.title} to={item.url} onClick={onClose}
                className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${
                  item.highlight ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg ring-2 ring-green-400 animate-pulse'
                    : location.pathname === item.url ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}>
                <item.icon className="w-6 h-6 flex-shrink-0" />
                <span className="font-semibold text-base flex-1">{item.title}</span>
                {item.badge && (
                  <Badge className={`${item.urgentBadge ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}>
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </div>
        <div className="p-4 bg-slate-900 border-t border-white/10 space-y-2">
          {!isAppInstalled && (
            <button onClick={onShowInstall} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-green-500/20 text-white hover:bg-green-500/30 transition-all">
              <Smartphone className="w-6 h-6" />
              <span className="font-semibold text-lg">📲 Ver cómo instalar</span>
            </button>
          )}
          <button onClick={() => { localStorage.setItem('app_build_version', BUILD_VERSION); window.location.reload(); }}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all mb-2 ${hasNewVersion ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg animate-pulse' : 'bg-blue-500/20 text-white hover:bg-blue-500/30'}`}>
            <RotateCw className="w-6 h-6" />
            <span className="font-semibold text-lg">{hasNewVersion ? '🆕 Nueva versión disponible' : 'Actualizar Datos'}</span>
          </button>
          <button onClick={onShowDeleteAccount} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-yellow-500/20 text-white hover:bg-yellow-500/30 transition-all">
            <UserX className="w-6 h-6" />
            <span className="font-semibold text-lg">Eliminar Cuenta</span>
          </button>
          <button onClick={onLogout} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-red-500/20 text-white hover:bg-red-500/30 transition-all">
            <LogOut className="w-6 h-6" />
            <span className="font-semibold text-lg">Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </div>
  );
}
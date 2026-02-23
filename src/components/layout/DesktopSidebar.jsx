import React, { Suspense } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { LogOut, Smartphone, RotateCw, MessageCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import NotificationCenter from "../NotificationCenter";
import ThemeToggle from "../ThemeToggle";
import LanguageSelector from "../LanguageSelector";

const GlobalSearch = React.lazy(() => import("../GlobalSearch"));

const CLUB_LOGO_URL = `https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg`;

export default function DesktopSidebar({
  user, isAdmin, isCoordinator, isTreasurer, isCoach, isPlayer, isAppInstalled,
  navigationItems, currentSeason, enginesReady, currentLang, onLanguageChange,
  onLogout, onShowInstall, onCheckUpdates, onShowFeedback, onShowDeleteAccount,
  playerName, hasNewVersion
}) {
  const location = useLocation();

  return (
    <nav className="hidden lg:block fixed left-0 top-0 bottom-0 w-72 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 shadow-2xl overflow-y-auto">
      <div className="p-6 border-b border-green-500/30">
        <div className="flex items-center gap-3 mb-6">
          <img src={CLUB_LOGO_URL} alt="CD Bustarviejo" className="w-14 h-14 rounded-xl shadow-xl ring-4 ring-green-500/50 object-cover" />
          <div className="text-white">
            <h2 className="font-bold text-xl">CD Bustarviejo</h2>
            <p className="text-xs text-green-400">
              {isAdmin ? "Panel Admin" : isCoordinator ? "Panel Coordinador" : isTreasurer ? "Panel Tesorero" : isCoach ? "Panel Entrenador" : isPlayer ? "Panel Jugador" : "Panel Familia"}
            </p>
          </div>
        </div>
        <div className="space-y-2">
          {user && (
            <div className="w-full">
              {enginesReady && (<Suspense fallback={null}><GlobalSearch isAdmin={isAdmin} isCoach={isCoach} /></Suspense>)}
            </div>
          )}
          <div className="flex items-center gap-1">
            {enginesReady && (<Suspense fallback={null}><NotificationCenter /></Suspense>)}
            <ThemeToggle />
            <Suspense fallback={null}><LanguageSelector currentLang={currentLang} onLanguageChange={onLanguageChange} /></Suspense>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-2">
        {isAdmin ? (
          <Link to={createPageUrl("FeedbackManagement")} className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600 transition-all shadow-md mb-2">
            <MessageCircle className="w-5 h-5" />
            <span className="font-bold text-sm">💬 Ver Feedback Usuarios</span>
          </Link>
        ) : (
          <button onClick={onShowFeedback} className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600 transition-all shadow-md mb-2">
            <MessageCircle className="w-5 h-5" />
            <span className="font-bold text-sm">💬 Sugerencias y Bugs</span>
          </button>
        )}

        {navigationItems.map((item) => {
          if (item.section) {
            return (
              <div key={item.title} className="px-2 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-t border-slate-700/50">
                {item.title}
              </div>
            );
          }
          return item.externalUrl ? (
            <a key={item.title} href={item.externalUrl} target="_blank" rel="noopener noreferrer"
              className={`flex items-center justify-center gap-4 p-4 rounded-2xl transition-all group ${item.highlight ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg shadow-green-600/50 ring-2 ring-green-400 animate-pulse' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}>
              <item.icon className="w-5 h-5" />
              <span className="font-semibold flex-1 text-center">{item.title}</span>
            </a>
          ) : (
            <Link key={item.title} to={item.url}
              className={`flex items-center justify-center gap-4 p-4 rounded-2xl transition-all group ${item.highlight ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg shadow-green-600/50 ring-2 ring-green-400 animate-pulse' : location.pathname === item.url ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg shadow-orange-600/50' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}>
              <item.icon className="w-5 h-5" />
              <span className="font-semibold flex-1 text-center">{item.title}</span>
              {item.badge && (
                <Badge className={`${item.urgentBadge ? 'bg-red-500 text-white animate-pulse ring-2 ring-green-400' : 'bg-green-500 text-white'}`}>
                  {item.urgentBadge && '🔴'} {item.badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </div>

      <div className="p-6 mt-auto border-t border-green-500/30">
        <div className="bg-gradient-to-r from-slate-800 to-black rounded-2xl p-4 mb-4 border-2 border-orange-500/50">
          <div className="flex items-start gap-2">
            <Mail className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-green-400 mb-1">Contacto</p>
              <a href="mailto:CDBUSTARVIEJO@GMAIL.COM" className="text-xs text-orange-400 hover:text-orange-300 break-all block">CDBUSTARVIEJO@GMAIL.COM</a>
            </div>
          </div>
        </div>
        {user && (
          <div className="text-center text-xs text-white mb-4">
            <p className="font-medium">{isPlayer && playerName ? playerName : user.email?.split('@')[0]}</p>
            <p className="text-green-400 text-xs">{user.email}</p>
            {isPlayer && <Badge className="mt-2 bg-orange-600 text-white text-xs">⚽ Jugador</Badge>}
            {isCoordinator && <Badge className="mt-2 bg-cyan-600 text-white text-xs">🎓 Coordinador Deportivo</Badge>}
            {isTreasurer && <Badge className="mt-2 bg-green-600 text-white text-xs">💰 Tesorero</Badge>}
            {user?.es_entrenador && !isAdmin && <Badge className="mt-2 bg-blue-600 text-white text-xs">🏃 Entrenador{user?.categorias_entrena?.length > 0 ? ` (${user.categorias_entrena.length})` : ''}</Badge>}
          </div>
        )}
        <Button onClick={onLogout} className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-3 rounded-xl shadow-lg">
          <LogOut className="w-4 h-4 mr-2" />
          Cerrar Sesión
        </Button>
        <Button onClick={onShowInstall} variant="outline" className="w-full mt-3 border-green-500 text-green-400 hover:bg-green-500/20 font-semibold py-3 rounded-xl">
          <Smartphone className="w-4 h-4 mr-2" />
          {isAppInstalled ? "✅ App instalada" : "📲 Ver cómo instalar"}
        </Button>
        <div className="text-center text-xs text-green-400 mt-4 pt-4 border-t border-green-500/30">
          <p className="font-medium">Temporada {currentSeason}</p>
          {hasNewVersion ? (
            <Button onClick={() => window.location.reload()} size="sm" className="w-full mt-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-xs h-9 animate-pulse font-bold shadow-lg">
              🆕 Nueva versión disponible
            </Button>
          ) : (
            <Button onClick={onCheckUpdates} variant="outline" size="sm" className="w-full mt-3 border-orange-500/50 text-orange-400 hover:bg-orange-500/10 hover:text-orange-300 text-xs h-8">
              <RotateCw className="w-3 h-3 mr-2" />
              Buscar Actualizaciones
            </Button>
          )}
          <p className="text-slate-500 mt-3 text-[10px]">© CD Bustarviejo (v1.0)</p>
          <p className="text-slate-500 text-[10px]">🔒 Tus datos están protegidos según RGPD</p>
        </div>
      </div>
    </nav>
  );
}
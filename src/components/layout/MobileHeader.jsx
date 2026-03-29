import React, { Suspense } from "react";
import { Menu, X, Smartphone } from "lucide-react";
import MobileBackButton from "../mobile/MobileBackButton";
import ThemeToggle from "../ThemeToggle";

const CLUB_LOGO_URL = `https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg?t=${Date.now()}`;

const NotificationCenter = React.lazy(() => import("../NotificationCenter"));
const GlobalSearch = React.lazy(() => import("../GlobalSearch"));

export default function MobileHeader({
  user, isAdmin, isCoordinator, isTreasurer, isCoach, isPlayer, playerName,
  chatMenuCounts, enginesReady,
  mobileMenuOpen, setMobileMenuOpen,
  onShowInstall,
}) {
  const roleLabel = isAdmin ? "Admin" : isCoordinator ? "Coordinador" : isTreasurer ? "Tesorero" : isCoach ? "Entrenador" : isPlayer ? (playerName || "Jugador") : user?.email?.split('@')[0] || "Familia";

  return (
    <>
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 shadow-lg safe-area-top" style={{ background: 'linear-gradient(to right, #ea580c, #c2410c)' }}>
        <div className="flex items-center justify-between p-2">
          <div className="flex items-center gap-2">
            <MobileBackButton />
            <img src={CLUB_LOGO_URL} alt="CD Bustarviejo" className="w-9 h-9 rounded-lg shadow-lg object-cover" />
            <div className="text-white">
              <h1 className="font-bold text-base leading-tight">CD Bustarviejo</h1>
              <p className="text-xs text-orange-100 truncate max-w-[140px]" title={user?.email}>
                {roleLabel}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!(window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true) && (
              <button
                onClick={onShowInstall}
                className="p-2 bg-green-500 text-white rounded-xl shadow-lg"
                title="Ver cómo instalar"
              >
                <Smartphone className="w-5 h-5" />
              </button>
            )}

            {/* Badges adicionales para chats en móvil */}
            {!isAdmin && chatMenuCounts.coordinatorForFamilyCount > 0 && (
              <div className="px-2 py-1 bg-cyan-500 text-white text-xs rounded-lg font-bold">
                💬 {chatMenuCounts.coordinatorForFamilyCount}
              </div>
            )}
            {!isAdmin && chatMenuCounts.coachForFamilyCount > 0 && (
              <div className="px-2 py-1 bg-blue-500 text-white text-xs rounded-lg font-bold">
                ⚽ {chatMenuCounts.coachForFamilyCount}
              </div>
            )}
            {!isAdmin && chatMenuCounts.systemMessagesCount > 0 && (
              <div className="px-2 py-1 bg-orange-500 text-white text-xs rounded-lg font-bold">
                🔔 {chatMenuCounts.systemMessagesCount}
              </div>
            )}
            {isCoordinator && chatMenuCounts.coordinatorCount > 0 && (
              <div className="px-2 py-1 bg-cyan-500 text-white text-xs rounded-lg font-bold">
                👨‍👩‍👧 {chatMenuCounts.coordinatorCount}
              </div>
            )}
            {isCoach && chatMenuCounts.coachCount > 0 && (
              <div className="px-2 py-1 bg-blue-500 text-white text-xs rounded-lg font-bold">
                ⚽ {chatMenuCounts.coachCount}
              </div>
            )}
            {(isCoordinator || isCoach || isAdmin) && chatMenuCounts.staffCount > 0 && (
              <div className="px-2 py-1 bg-purple-500 text-white text-xs rounded-lg font-bold">
                💼 {chatMenuCounts.staffCount}
              </div>
            )}

            {enginesReady && (<Suspense fallback={null}><NotificationCenter /></Suspense>)}
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-3 text-white hover:bg-white/20 rounded-xl transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center relative"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Search Bar */}
      <div className="lg:hidden fixed top-[52px] left-0 right-0 z-40 bg-white border-b shadow-sm p-2">
        {enginesReady && (<Suspense fallback={null}><GlobalSearch isAdmin={isAdmin} isCoach={isCoach} /></Suspense>)}
      </div>
    </>
  );
}
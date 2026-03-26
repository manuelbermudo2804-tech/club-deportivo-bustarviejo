import React, { useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Bell, CreditCard, MessageCircle, Users } from 'lucide-react';

// Persist last visited path + scroll per tab across renders
const tabState = {};

export default function MobileBottomBar({ location, chatBadges, isAdmin, isCoach, isCoordinator, isTreasurer, isPlayer, isMinor, currentPageName }) {
  const navigate = useNavigate();
  const currentTabRef = useRef(null);

  const chatPages = ['ParentCoachChat', 'CoachParentChat', 'ParentCoordinatorChat', 'CoordinatorChat', 'AdminCoordinatorChats', 'StaffChat', 'ParentSystemMessages', 'FamilyChatsHub', 'CoachChatsHub', 'CoordinatorChatsHub', 'AdminChatsHub'];
  const isInChat = chatPages.includes(currentPageName);

  const familyTotal = (chatBadges?.coachForFamilyCount || 0) + (chatBadges?.coordinatorForFamilyCount || 0) + (chatBadges?.systemMessagesCount || 0);

  let tabs = [];
  if (isMinor) {
    tabs = [
      { icon: Home, label: 'Inicio', url: createPageUrl('MinorDashboard'), key: 'home' },
      { icon: Bell, label: 'Convocatorias', url: createPageUrl('ParentCallups'), key: 'callups' },
      { icon: Users, label: 'Competición', url: createPageUrl('CentroCompeticion'), key: 'competition' },
    ];
  } else if (isAdmin) {
    const totalChatBadge = (chatBadges?.staffCount || 0) + (chatBadges?.coordinatorCount || 0);
    tabs = [
      { icon: Home, label: 'Inicio', url: createPageUrl('Home'), key: 'home' },
      { icon: Users, label: 'Jugadores', url: createPageUrl('Players'), key: 'players' },
      { icon: MessageCircle, label: 'Chat', url: createPageUrl('AdminChatsHub'), key: 'chat', badge: totalChatBadge },
      { icon: CreditCard, label: 'Pagos', url: createPageUrl('Payments'), key: 'payments' },
    ];
  } else if (isCoordinator) {
    const totalChatBadge = (chatBadges?.coordinatorCount || 0) + (chatBadges?.staffCount || 0) + (chatBadges?.coachCount || 0);
    tabs = [
      { icon: Home, label: 'Inicio', url: createPageUrl('CoordinatorDashboard'), key: 'home' },
      { icon: Bell, label: 'Convocatorias', url: createPageUrl('CoachCallups'), key: 'callups' },
      { icon: MessageCircle, label: 'Chat', url: createPageUrl('CoordinatorChatsHub'), key: 'chat', badge: totalChatBadge },
      { icon: Users, label: 'Plantillas', url: createPageUrl('TeamRosters'), key: 'rosters' },
    ];
  } else if (isCoach) {
    const totalChatBadge = (chatBadges?.coachCount || 0) + (chatBadges?.staffCount || 0);
    tabs = [
      { icon: Home, label: 'Inicio', url: createPageUrl('CoachDashboard'), key: 'home' },
      { icon: Bell, label: 'Convocatorias', url: createPageUrl('CoachCallups'), key: 'callups' },
      { icon: MessageCircle, label: 'Chat', url: createPageUrl('CoachChatsHub'), key: 'chat', badge: totalChatBadge },
      { icon: Users, label: 'Plantillas', url: createPageUrl('TeamRosters'), key: 'rosters' },
    ];
  } else if (isTreasurer) {
    const treasurerChatBadge = familyTotal + (chatBadges?.staffCount || 0);
    tabs = [
      { icon: Home, label: 'Inicio', url: createPageUrl('TreasurerDashboard'), key: 'home' },
      { icon: CreditCard, label: 'Pagos', url: createPageUrl('Payments'), key: 'payments' },
      { icon: MessageCircle, label: 'Chat', url: createPageUrl('FamilyChatsHub'), key: 'chat', badge: treasurerChatBadge },
      { icon: Users, label: 'Socios', url: createPageUrl('ClubMembersManagement'), key: 'members' },
    ];
  } else if (isPlayer) {
    const totalChatBadge = familyTotal;
    tabs = [
      { icon: Home, label: 'Inicio', url: createPageUrl('PlayerDashboard'), key: 'home' },
      { icon: Bell, label: 'Convocatorias', url: createPageUrl('ParentCallups'), key: 'callups' },
      { icon: CreditCard, label: 'Pagos', url: createPageUrl('ParentPayments'), key: 'payments' },
      { icon: MessageCircle, label: 'Chat', url: createPageUrl('FamilyChatsHub'), key: 'chat', badge: totalChatBadge },
    ];
  } else {
    const totalChatBadge = familyTotal;
    tabs = [
      { icon: Home, label: 'Inicio', url: createPageUrl('ParentDashboard'), key: 'home' },
      { icon: Bell, label: 'Convocatorias', url: createPageUrl('ParentCallups'), key: 'callups' },
      { icon: CreditCard, label: 'Pagos', url: createPageUrl('ParentPayments'), key: 'payments' },
      { icon: MessageCircle, label: 'Chat', url: createPageUrl('FamilyChatsHub'), key: 'chat', badge: totalChatBadge },
    ];
  }

  // Determine which tab "owns" the current path
  const currentPath = location?.pathname || '';
  const getTabRootPath = (url) => {
    try { return new URL(url, window.location.origin).pathname; } catch { return url; }
  };
  const activeTabKey = tabs.find(t => currentPath === getTabRootPath(t.url))?.key
    // If exact match fails, check if we're on a page that was saved under a tab
    || tabs.find(t => tabState[t.key]?.path === currentPath)?.key
    || null;

  // Track the current page under its owning tab
  if (activeTabKey) {
    tabState[activeTabKey] = { path: currentPath, scroll: window.scrollY };
    currentTabRef.current = activeTabKey;
  }

  const handleTabClick = useCallback((tab) => {
    // Save current scroll before leaving
    if (currentTabRef.current && tabState[currentTabRef.current]) {
      tabState[currentTabRef.current].scroll = window.scrollY;
    }

    // Determine target: use saved path if exists (preserves navigation stack), else tab root
    const saved = tabState[tab.key];
    const targetUrl = saved?.path || getTabRootPath(tab.url);

    // If we're already on this tab's current page, scroll to top instead
    if (targetUrl === currentPath) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    currentTabRef.current = tab.key;
    navigate(targetUrl);

    // Restore scroll for target tab
    requestAnimationFrame(() => {
      const savedScroll = tabState[tab.key]?.scroll;
      window.scrollTo(0, savedScroll ?? 0);
    });
  }, [navigate, currentPath]);

  return (
    <div className={`lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] ${isInChat ? 'hidden' : ''}`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-stretch justify-around">
        {tabs.map(({ icon: Icon, label, url, key, badge }) => {
          const isActive = activeTabKey === key;
          return (
            <button
              key={key}
              onClick={() => handleTabClick({ key, url })}
              aria-label={label}
              className="flex-1 flex flex-col items-center justify-center py-2 pb-1 no-select active:opacity-70"
              style={{ minHeight: '56px', WebkitTapHighlightColor: 'transparent', WebkitAppearance: 'none' }}
            >
              {/* Active indicator pill */}
              {isActive && (
                <div className="absolute top-0 w-8 h-[3px] bg-orange-500 rounded-full" style={{ left: '50%', transform: 'translateX(-50%)' }} />
              )}
              <div className="relative" style={{ transform: isActive ? 'scale(1.1) translateY(-2px)' : 'none' }}>
                <Icon className={`w-6 h-6 ${isActive ? 'text-orange-600' : 'text-slate-400'}`} />
                {badge > 0 && (
                  <div className="absolute -top-1.5 -right-2 bg-red-500 text-white rounded-full font-bold px-1 shadow-sm flex items-center justify-center" style={{ fontSize: '10px', minWidth: '18px', height: '18px' }}>
                    {badge > 99 ? '99+' : badge}
                  </div>
                )}
              </div>
              <span className={`mt-0.5 leading-tight ${isActive ? 'text-orange-600 font-bold' : 'text-slate-400'}`} style={{ fontSize: '10px' }}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
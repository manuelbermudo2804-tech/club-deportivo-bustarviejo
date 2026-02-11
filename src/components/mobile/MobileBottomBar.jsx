import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Bell, CreditCard, MessageCircle, Users } from 'lucide-react';

export default function MobileBottomBar({ location, chatBadges, isAdmin, isCoach, isCoordinator, isTreasurer, isPlayer, currentPageName }) {
  // Ocultar visualmente en páginas de chat pero mantener en DOM para badges
  const chatPages = ['ParentCoachChat', 'CoachParentChat', 'ParentCoordinatorChat', 'CoordinatorChat', 'AdminCoordinatorChats', 'StaffChat', 'ParentSystemMessages', 'FamilyChatsHub'];
  const isInChat = chatPages.includes(currentPageName);
  // Botones dinámicos según el rol
  let tabs = [];

  if (isAdmin) {
    tabs = [
      { icon: Home, label: 'Inicio', url: createPageUrl('Home'), key: 'home' },
      { icon: Users, label: 'Jugadores', url: createPageUrl('Players'), key: 'players' },
      { icon: MessageCircle, label: 'Chat', url: createPageUrl('StaffChat'), key: 'chat', badge: chatBadges?.staffCount },
      { icon: CreditCard, label: 'Pagos', url: createPageUrl('Payments'), key: 'payments' },
    ];
  } else if (isCoordinator) {
    tabs = [
      { icon: Home, label: 'Inicio', url: createPageUrl('CoordinatorDashboard'), key: 'home' },
      { icon: Bell, label: 'Convocatorias', url: createPageUrl('CoachCallups'), key: 'callups' },
      { icon: MessageCircle, label: 'Chat', url: createPageUrl('CoordinatorChat'), key: 'chat', badge: chatBadges?.coordinatorCount },
      { icon: Users, label: 'Plantillas', url: createPageUrl('TeamRosters'), key: 'rosters' },
    ];
  } else if (isCoach) {
    tabs = [
      { icon: Home, label: 'Inicio', url: createPageUrl('CoachDashboard'), key: 'home' },
      { icon: Bell, label: 'Convocatorias', url: createPageUrl('CoachCallups'), key: 'callups' },
      { icon: MessageCircle, label: 'Familias', url: createPageUrl('CoachParentChat'), key: 'chat', badge: chatBadges?.coachCount },
      { icon: Users, label: 'Plantillas', url: createPageUrl('TeamRosters'), key: 'rosters' },
    ];
  } else if (isTreasurer) {
    tabs = [
      { icon: Home, label: 'Inicio', url: createPageUrl('TreasurerDashboard'), key: 'home' },
      { icon: CreditCard, label: 'Pagos', url: createPageUrl('Payments'), key: 'payments' },
      { icon: MessageCircle, label: 'Chat', url: createPageUrl('StaffChat'), key: 'chat', badge: chatBadges?.staffCount },
      { icon: Users, label: 'Socios', url: createPageUrl('ClubMembersManagement'), key: 'members' },
    ];
  } else if (isPlayer) {
    tabs = [
      { icon: Home, label: 'Inicio', url: createPageUrl('PlayerDashboard'), key: 'home' },
      { icon: Bell, label: 'Convocatorias', url: createPageUrl('ParentCallups'), key: 'callups' },
      { icon: CreditCard, label: 'Pagos', url: createPageUrl('ParentPayments'), key: 'payments' },
      { icon: MessageCircle, label: 'Chat', url: createPageUrl('ParentCoachChat'), key: 'chat', badge: chatBadges?.coachForFamilyCount },
    ];
  } else {
    // Familia (padre)
    const totalChatBadge = (chatBadges?.coachForFamilyCount || 0) + 
                           (chatBadges?.coordinatorForFamilyCount || 0) + 
                           (chatBadges?.systemMessagesCount || 0);
    
    tabs = [
      { icon: Home, label: 'Inicio', url: createPageUrl('ParentDashboard'), key: 'home' },
      { icon: Bell, label: 'Convocatorias', url: createPageUrl('ParentCallups'), key: 'callups' },
      { icon: CreditCard, label: 'Pagos', url: createPageUrl('ParentPayments'), key: 'payments' },
      { icon: MessageCircle, label: 'Chat', url: createPageUrl('FamilyChatsHub'), key: 'chat', badge: totalChatBadge },
    ];
  }

  return (
    <div className={`lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 safe-area-bottom ${isInChat ? 'hidden' : ''}`}>
      <div className="flex items-center justify-around">
        {tabs.map(({ icon: Icon, label, url, key, badge }) => (
          <Link
            key={key}
            to={url}
            className="flex-1 flex flex-col items-center justify-center py-3 min-h-[60px] relative transition-colors hover:bg-slate-50"
          >
            <div className="relative">
              <Icon className="w-6 h-6 text-slate-600" />
              {badge > 0 && (
                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {badge}
                </div>
              )}
            </div>
            <span className="text-xs text-slate-600 mt-1">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
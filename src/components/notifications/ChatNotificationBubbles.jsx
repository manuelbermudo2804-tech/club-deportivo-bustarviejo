import React from 'react';
import { useChatNotificationBubbles } from './useChatNotificationBubbles';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

/**
 * BURBUJAS DE NOTIFICACIONES DE CHAT (parte superior)
 * 
 * Características:
 * - Lee del estado UNIFICADO global
 * - Se actualiza en tiempo real
 * - NO se limpia al entrar en otros chats
 * - SOLO se limpia cuando abres ESE chat específico
 */
export default function ChatNotificationBubbles({ user, isCoordinator, isCoach, isFamily, isAdmin }) {
  const bubbles = useChatNotificationBubbles(user);

  if (!user) return null;

  return (
    <div className="fixed top-[96px] lg:top-4 left-2 right-2 lg:left-auto lg:right-4 z-[60] flex gap-1 lg:gap-2 flex-wrap justify-start lg:justify-end pointer-events-none lg:flex-nowrap overflow-x-auto max-h-14">
      {/* STAFF (interno) */}
      {(isAdmin || isCoach || isCoordinator) && bubbles.staffBubble > 0 && (
        <Link to={createPageUrl('StaffChat')} className="pointer-events-auto">
          <div className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-purple-700 transition-all cursor-pointer">
            <span className="text-xs lg:text-sm font-semibold whitespace-nowrap">💼 Staff</span>
            <Badge className="bg-white text-purple-600 font-bold">{bubbles.staffBubble}</Badge>
          </div>
        </Link>
      )}

      {/* COORDINADOR -> FAMILIAS (para coordinadores) */}
      {isCoordinator && bubbles.coordinatorBubble > 0 && (
        <Link to={createPageUrl('CoordinatorChat')} className="pointer-events-auto">
          <div className="flex items-center gap-2 bg-cyan-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-cyan-700 transition-all cursor-pointer">
            <span className="text-xs lg:text-sm font-semibold whitespace-nowrap">🎓 Fam</span>
            <Badge className="bg-white text-cyan-600 font-bold">{bubbles.coordinatorBubble}</Badge>
          </div>
        </Link>
      )}

      {/* ENTRENADOR -> FAMILIAS (para entrenadores) */}
      {(isCoach || isCoordinator || isAdmin) && bubbles.coachBubble > 0 && (
        <Link to={createPageUrl('CoachParentChat')} className="pointer-events-auto ml-auto lg:ml-0">
          <div className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-green-700 transition-all cursor-pointer">
            <span className="text-xs lg:text-sm font-semibold whitespace-nowrap">⚽ Fam</span>
            <Badge className="bg-white text-green-600 font-bold">{bubbles.coachBubble}</Badge>
          </div>
        </Link>
      )}

      {/* COORDINADOR (para familias) */}
      {isFamily && bubbles.coordinatorForFamilyBubble > 0 && (
        <Link to={createPageUrl('ParentCoordinatorChat')} className="pointer-events-auto">
          <div className="flex items-center gap-2 bg-cyan-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-cyan-700 transition-all cursor-pointer">
            <span className="text-xs lg:text-sm font-semibold whitespace-nowrap">🎓 Coord</span>
            <Badge className="bg-white text-cyan-600 font-bold">{bubbles.coordinatorForFamilyBubble}</Badge>
          </div>
        </Link>
      )}

      {/* ENTRENADOR (para familias) */}
      {isFamily && bubbles.coachForFamilyBubble > 0 && (
        <Link to={createPageUrl('ParentCoachChat')} className="pointer-events-auto ml-auto lg:ml-0">
          <div className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-green-700 transition-all cursor-pointer">
            <span className="text-xs lg:text-sm font-semibold whitespace-nowrap">⚽ Eq</span>
            <Badge className="bg-white text-green-600 font-bold">{bubbles.coachForFamilyBubble}</Badge>
          </div>
        </Link>
      )}

      {/* MENSAJES PRIVADOS DEL CLUB (para familias) */}
      {isFamily && bubbles.systemMessagesBubble > 0 && (
        <Link to={createPageUrl('ParentSystemMessages')} className="pointer-events-auto">
          <div className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-orange-700 transition-all cursor-pointer animate-pulse">
            <span className="text-xs lg:text-sm font-semibold whitespace-nowrap">🔔 Club</span>
            <Badge className="bg-white text-orange-600 font-bold">{bubbles.systemMessagesBubble}</Badge>
          </div>
        </Link>
      )}

      {/* ADMIN - CHATS ESCALADOS (para admin) */}
      {isAdmin && bubbles.adminBubble > 0 && (
        <Link to={createPageUrl('AdminCoordinatorChats')} className="pointer-events-auto">
          <div className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-red-700 transition-all cursor-pointer animate-pulse">
            <span className="text-xs lg:text-sm font-semibold whitespace-nowrap">🚨 Admin</span>
            <Badge className="bg-white text-red-600 font-bold">{bubbles.adminBubble}</Badge>
          </div>
        </Link>
      )}
    </div>
  );
}
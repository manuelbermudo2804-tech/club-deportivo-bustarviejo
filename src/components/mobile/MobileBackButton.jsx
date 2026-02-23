import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function MobileBackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  // Rutas raíz donde NO mostrar back button
  const rootPages = [
    createPageUrl('Home'),
    createPageUrl('ParentDashboard'),
    createPageUrl('PlayerDashboard'),
    createPageUrl('CoachDashboard'),
    createPageUrl('CoordinatorDashboard'),
    createPageUrl('TreasurerDashboard'),
    createPageUrl('FamilyChatsHub'),
    createPageUrl('CoachChatsHub'),
    createPageUrl('CoordinatorChatsHub'),
    createPageUrl('AdminChatsHub'),
  ].map(url => url.toLowerCase());

  const isRootPage = rootPages.some(root => location.pathname.toLowerCase() === root);

  if (isRootPage) return null;

  // Detectar si estamos en un chat individual -> volver al hub correspondiente
  const chatPageToHub = {
    // Familia/Jugador
    [createPageUrl('ParentCoachChat').toLowerCase()]: createPageUrl('FamilyChatsHub'),
    [createPageUrl('ParentCoordinatorChat').toLowerCase()]: createPageUrl('FamilyChatsHub'),
    [createPageUrl('ParentSystemMessages').toLowerCase()]: createPageUrl('FamilyChatsHub'),
    // Coach
    [createPageUrl('CoachParentChat').toLowerCase()]: createPageUrl('CoachChatsHub'),
    // Coordinator
    [createPageUrl('CoordinatorChat').toLowerCase()]: createPageUrl('CoordinatorChatsHub'),
    // Admin/Staff/Coordinator
    [createPageUrl('StaffChat').toLowerCase()]: (path) => {
      // Detectar el rol para saber a qué hub volver
      const url = window.location.href.toLowerCase();
      if (url.includes('admin')) return createPageUrl('AdminChatsHub');
      if (url.includes('coordinator')) return createPageUrl('CoordinatorChatsHub');
      if (url.includes('coach')) return createPageUrl('CoachChatsHub');
      return null; // Fallback a navigate(-1)
    },
    [createPageUrl('AdminCoordinatorChats').toLowerCase()]: (path) => {
      const url = window.location.href.toLowerCase();
      if (url.includes('coordinator')) return createPageUrl('CoordinatorChatsHub');
      return createPageUrl('AdminChatsHub');
    },
  };

  const currentPath = location.pathname.toLowerCase();
  const hubUrl = chatPageToHub[currentPath];
  const shouldGoToHub = !!hubUrl;

  return (
    <button
      onClick={() => {
        if (shouldGoToHub) {
          const target = typeof hubUrl === 'function' ? hubUrl(currentPath) : hubUrl;
          if (target) {
            navigate(target);
          } else {
            navigate(-1);
          }
        } else {
          navigate(-1);
        }
      }}
      className="lg:hidden p-2 text-white rounded-lg no-select active:opacity-70"
      style={{ minWidth: '44px', minHeight: '44px', WebkitTapHighlightColor: 'transparent', WebkitAppearance: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      aria-label="Atrás"
    >
      <ChevronLeft className="w-6 h-6" />
    </button>
  );
}
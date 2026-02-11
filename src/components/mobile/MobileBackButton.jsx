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
  ].map(url => url.toLowerCase());

  const isRootPage = rootPages.some(root => location.pathname.toLowerCase() === root);

  if (isRootPage) return null;

  // Detectar si estamos en un chat individual (familia) -> volver a FamilyChatsHub
  const familyChatPages = [
    createPageUrl('ParentCoachChat'),
    createPageUrl('ParentCoordinatorChat'),
    createPageUrl('ParentSystemMessages'),
  ].map(url => url.toLowerCase());

  const isFamilyChat = familyChatPages.some(chat => location.pathname.toLowerCase() === chat);

  return (
    <button
      onClick={() => {
        if (isFamilyChat) {
          navigate(createPageUrl('FamilyChatsHub'));
        } else {
          navigate(-1);
        }
      }}
      className="lg:hidden p-2 text-white hover:bg-white/20 rounded-lg transition-colors no-select"
      title="Atrás"
    >
      <ChevronLeft className="w-6 h-6" />
    </button>
  );
}
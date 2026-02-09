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
  ].map(url => url.toLowerCase());

  const isRootPage = rootPages.some(root => location.pathname.toLowerCase() === root);

  if (isRootPage) return null;

  return (
    <button
      onClick={() => navigate(-1)}
      className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors no-select"
      title="Atrás"
    >
      <ChevronLeft className="w-6 h-6" />
    </button>
  );
}
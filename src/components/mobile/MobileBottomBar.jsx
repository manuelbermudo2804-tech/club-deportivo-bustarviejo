import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Bell, CreditCard, MessageCircle } from 'lucide-react';

export default function MobileBottomBar({ location, chatBadges }) {
  const tabs = [
    { icon: Home, label: 'Inicio', url: createPageUrl('Home'), key: 'home' },
    { icon: Bell, label: 'Convocatorias', url: createPageUrl('ParentCallups'), key: 'callups', badge: chatBadges?.callups },
    { icon: CreditCard, label: 'Pagos', url: createPageUrl('ParentPayments'), key: 'payments' },
    { icon: MessageCircle, label: 'Chat', url: createPageUrl('ParentCoachChat'), key: 'chat', badge: chatBadges?.chat },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 safe-area-bottom">
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
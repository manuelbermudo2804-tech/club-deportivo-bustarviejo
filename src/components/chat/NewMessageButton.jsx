import React from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Botón "Nuevo mensaje" tipo WhatsApp
 * Aparece cuando user sube en el scroll
 */
export default function NewMessageButton({ onClick, unreadCount = 0 }) {
  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10">
      <Button
        onClick={onClick}
        className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center gap-2 rounded-full px-4 py-2 animate-bounce"
      >
        {unreadCount > 0 && (
          <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        <span className="text-sm font-semibold">Nuevo mensaje</span>
        <ChevronDown className="w-4 h-4" />
      </Button>
    </div>
  );
}
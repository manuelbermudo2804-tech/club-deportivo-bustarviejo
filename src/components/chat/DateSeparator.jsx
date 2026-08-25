import React from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseChatDate } from '@/lib/chatDate';

/**
 * Separador de día tipo WhatsApp
 * Muestra "HOY", "AYER" o fecha formateada
 */
export default function DateSeparator({ date }) {
  let label;
  const d = parseChatDate(date);

  if (isToday(d)) {
    label = 'HOY';
  } else if (isYesterday(d)) {
    label = 'AYER';
  } else {
    label = format(d, 'd MMM yyyy', { locale: es }).toUpperCase();
  }
  
  return (
    <div className="flex items-center justify-center my-4">
      <div className="text-xs text-slate-500 bg-white px-3 py-1 rounded-full">
        {label}
      </div>
    </div>
  );
}
import React from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Separador de día tipo WhatsApp
 * Muestra "HOY", "AYER" o fecha formateada
 */
export default function DateSeparator({ date }) {
  let label;
  
  if (isToday(new Date(date))) {
    label = 'HOY';
  } else if (isYesterday(new Date(date))) {
    label = 'AYER';
  } else {
    label = format(new Date(date), 'd MMM yyyy', { locale: es }).toUpperCase();
  }
  
  return (
    <div className="flex items-center justify-center my-4">
      <div className="text-xs text-slate-500 bg-white px-3 py-1 rounded-full">
        {label}
      </div>
    </div>
  );
}
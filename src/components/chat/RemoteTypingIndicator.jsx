import React from "react";

/**
 * Indicador visual de "escribiendo..." como WhatsApp
 * Se muestra cuando el otro usuario está escribiendo
 */
export default function RemoteTypingIndicator({ userName = "Usuario" }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-white/80 rounded-full shadow-sm w-fit">
      <span className="text-xs text-slate-600 font-medium">{userName} está escribiendo</span>
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
      </div>
    </div>
  );
}
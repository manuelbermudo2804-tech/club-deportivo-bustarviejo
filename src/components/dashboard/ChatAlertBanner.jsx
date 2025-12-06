import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { MessageCircle, Lock } from "lucide-react";

export default function ChatAlertBanner({ 
  unreadGroupMessages = 0, 
  unreadPrivateMessages = 0,
  urgentMessages = 0 
}) {
  const totalUnread = unreadGroupMessages + unreadPrivateMessages;
  
  if (totalUnread === 0) return null;

  return (
    <Link to={createPageUrl("ParentChat")}>
      <div className={`rounded-2xl p-4 shadow-xl transition-all hover:scale-105 active:scale-95 border-2 ${
        urgentMessages > 0 
          ? 'bg-gradient-to-r from-red-600 to-red-700 border-red-500 animate-pulse' 
          : 'bg-gradient-to-r from-blue-600 to-blue-700 border-blue-500'
      }`}>
        <div className="flex items-start gap-3">
          <MessageCircle className="w-6 h-6 text-white flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-white font-bold text-base lg:text-lg">
              {urgentMessages > 0 ? '🚨 ¡Mensajes Urgentes!' : '💬 Mensajes Nuevos'}
            </p>
            
            <div className="flex flex-wrap gap-2 mt-2">
              {unreadGroupMessages > 0 && (
                <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <p className="text-white text-xs font-semibold">
                    📢 {unreadGroupMessages} {unreadGroupMessages === 1 ? 'anuncio' : 'anuncios'} del equipo
                  </p>
                </div>
              )}
              {unreadPrivateMessages > 0 && (
                <div className="bg-green-500/80 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-1">
                  <Lock className="w-3 h-3 text-white" />
                  <p className="text-white text-xs font-semibold">
                    {unreadPrivateMessages} {unreadPrivateMessages === 1 ? 'mensaje privado' : 'mensajes privados'}
                  </p>
                </div>
              )}
            </div>
            
            <p className="text-white text-xs mt-2 font-semibold">
              👉 Pulsa aquí para leer
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
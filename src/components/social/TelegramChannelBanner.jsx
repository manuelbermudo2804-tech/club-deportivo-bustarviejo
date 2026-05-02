import React, { useState, useEffect } from "react";
import { Send, X } from "lucide-react";

const STORAGE_KEY = "telegram_banner_dismissed_v1";
const TELEGRAM_URL = "https://t.me/cdbustarviejo";

export default function TelegramChannelBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) setVisible(true);
  }, []);

  const handleDismiss = (e) => {
    e.preventDefault();
    e.stopPropagation();
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <a
      href={TELEGRAM_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-gradient-to-r from-[#229ED9] to-[#0088cc] rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden"
    >
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white"
        aria-label="Cerrar"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-3 pr-8">
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <Send className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-black text-base leading-tight">
            ✈️ Únete a nuestro Canal de Telegram
          </p>
          <p className="text-white/90 text-xs mt-0.5">
            Resultados, partidos del finde, fotos y avisos importantes
          </p>
        </div>
      </div>
    </a>
  );
}
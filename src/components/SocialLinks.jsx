import React from "react";
import { Facebook, Instagram, Globe } from "lucide-react";

// Logo oficial de Telegram (avión de papel circular)
const TelegramIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

export default function SocialLinks() {
  const links = [
    { name: "Web", url: "https://www.cdbustarviejo.com", icon: Globe, color: "text-orange-600 hover:text-orange-700" },
    { name: "Facebook", url: "https://es-es.facebook.com/ilustrisimo.deportivobustarviejo", icon: Facebook, color: "text-blue-600 hover:text-blue-700" },
    { name: "Instagram", url: "https://www.instagram.com/cdbustarviejo", icon: Instagram, color: "text-pink-600 hover:text-pink-700" },
    { name: "Telegram", url: "https://t.me/cdbustarviejo", icon: TelegramIcon, color: "text-sky-500 hover:text-sky-600" }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-1 flex items-center justify-center gap-1">
      {links.map((link) => (
        <a
          key={link.name}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center ${link.color} transition-colors p-1 rounded hover:bg-slate-50`}
          title={link.name}
        >
          <link.icon className="w-4 h-4" />
        </a>
      ))}
    </div>
  );
}
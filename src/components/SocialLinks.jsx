import React from "react";
import { Facebook, Instagram, Globe, Smartphone } from "lucide-react";

export default function SocialLinks() {
  const links = [
    { name: "Web", url: "https://www.cdbustarviejo.com", icon: Globe, color: "text-orange-600 hover:text-orange-700" },
    { name: "Facebook", url: "https://www.facebook.com/cdbustarviejo", icon: Facebook, color: "text-blue-600 hover:text-blue-700" },
    { name: "Instagram", url: "https://www.instagram.com/cdbustarviejo", icon: Instagram, color: "text-pink-600 hover:text-pink-700" }
  ];

  const handleMatchAppClick = () => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    
    // Detectar iOS
    if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
      window.open("https://apps.apple.com/app/matchapp", "_blank");
    }
    // Detectar Android
    else if (/android/i.test(userAgent)) {
      window.open("https://play.google.com/store/apps/details?id=com.matchapp", "_blank");
    }
    // Fallback para otros dispositivos
    else {
      window.open("https://www.matchapp.com", "_blank");
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-2 flex items-center justify-center gap-4">
      {links.map((link) => (
        <a
          key={link.name}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-1 ${link.color} transition-colors`}
          title={link.name}
        >
          <link.icon className="w-4 h-4" />
          <span className="text-xs font-medium hidden sm:inline">{link.name}</span>
        </a>
      ))}
      
      {/* MatchApp Link - Visible en todos los dispositivos */}
      <button
        onClick={handleMatchAppClick}
        className="flex items-center gap-1 text-green-600 hover:text-green-700 transition-colors"
        title="MatchApp"
      >
        <Smartphone className="w-4 h-4" />
        <span className="text-xs font-medium hidden sm:inline">MatchApp</span>
      </button>
    </div>
  );
}
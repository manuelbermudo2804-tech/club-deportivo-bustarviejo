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
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
    const isAndroid = /android/i.test(userAgent);
    
    if (isIOS || isAndroid) {
      const deepLink = "matchapp://";
      const storeUrl = isIOS 
        ? "https://apps.apple.com/app/matchapp"
        : "https://play.google.com/store/apps/details?id=com.matchapp";
      
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = deepLink;
      document.body.appendChild(iframe);
      
      setTimeout(() => {
        document.body.removeChild(iframe);
        window.location.href = storeUrl;
      }, 1000);
    } else {
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
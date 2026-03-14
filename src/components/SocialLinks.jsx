import React from "react";
import { Facebook, Instagram, Globe } from "lucide-react";

export default function SocialLinks() {
  const links = [
    { name: "Web", url: "https://www.cdbustarviejo.com", icon: Globe, color: "text-orange-600 hover:text-orange-700" },
    { name: "Facebook", url: "https://www.facebook.com/cdbustarviejo", icon: Facebook, color: "text-blue-600 hover:text-blue-700" },
    { name: "Instagram", url: "https://www.instagram.com/cdbustarviejo", icon: Instagram, color: "text-pink-600 hover:text-pink-700" }
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
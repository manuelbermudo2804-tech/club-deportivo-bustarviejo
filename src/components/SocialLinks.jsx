import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Facebook, Instagram, Globe, Share2 } from "lucide-react";

export default function SocialLinks() {
  const socialLinks = [
    {
      name: "Web Oficial",
      url: "https://www.cdbustarviejo.com",
      icon: Globe,
      color: "bg-orange-600 hover:bg-orange-700",
      enabled: true
    },
    {
      name: "Facebook",
      url: "https://www.facebook.com/cdbustarviejo",
      icon: Facebook,
      color: "bg-blue-600 hover:bg-blue-700",
      enabled: true
    },
    {
      name: "Instagram",
      url: "https://www.instagram.com/cdbustarviejo",
      icon: Instagram,
      color: "bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700",
      enabled: true
    }
  ];

  const enabledLinks = socialLinks.filter(link => link.enabled);

  if (enabledLinks.length === 0) {
    return null;
  }

  return (
    <Card className="border-none shadow-lg bg-gradient-to-br from-slate-50 to-white">
      <CardHeader className="border-b border-slate-100">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Share2 className="w-5 h-5 text-orange-600" />
          Síguenos en Redes Sociales
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {enabledLinks.map((social) => (
            <a
              key={social.name}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Button
                className={`w-full h-20 flex flex-col items-center justify-center gap-2 text-white shadow-lg transition-transform hover:scale-105 ${social.color}`}
              >
                <social.icon className="w-6 h-6" />
                <span className="text-sm font-medium">{social.name}</span>
              </Button>
            </a>
          ))}
        </div>
        <p className="text-center text-sm text-slate-500 mt-4">
          🌟 Mantente al día con todas las novedades del club
        </p>
      </CardContent>
    </Card>
  );
}
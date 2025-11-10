import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Facebook, Instagram, Twitter, Youtube, Share2 } from "lucide-react";

export default function SocialLinks() {
  // URLs de redes sociales - Se pueden actualizar fácilmente
  const socialLinks = [
    {
      name: "Facebook",
      url: "#", // URL pendiente
      icon: Facebook,
      color: "bg-blue-600 hover:bg-blue-700",
      enabled: false // Cambiar a true cuando tengas el enlace
    },
    {
      name: "Instagram",
      url: "#", // URL pendiente
      icon: Instagram,
      color: "bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700",
      enabled: false // Cambiar a true cuando tengas el enlace
    },
    {
      name: "Twitter/X",
      url: "#", // URL pendiente
      icon: Twitter,
      color: "bg-slate-900 hover:bg-slate-800",
      enabled: false // Cambiar a true cuando tengas el enlace
    },
    {
      name: "YouTube",
      url: "#", // URL pendiente
      icon: Youtube,
      color: "bg-red-600 hover:bg-red-700",
      enabled: false // Cambiar a true cuando tengas el enlace
    }
  ];

  // Filtrar solo las redes sociales habilitadas
  const enabledLinks = socialLinks.filter(link => link.enabled);

  // Si no hay redes sociales habilitadas, no mostrar el componente
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          Mantente al día con todas las novedades del club
        </p>
      </CardContent>
    </Card>
  );
}
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Facebook, Instagram, Globe } from "lucide-react";

export default function SocialLinks() {
  const socialLinks = [
    {
      name: "Web",
      url: "https://www.cdbustarviejo.com",
      icon: Globe,
      color: "bg-orange-600 hover:bg-orange-700",
    },
    {
      name: "Facebook",
      url: "https://www.facebook.com/cdbustarviejo",
      icon: Facebook,
      color: "bg-blue-600 hover:bg-blue-700",
    },
    {
      name: "Instagram",
      url: "https://www.instagram.com/cdbustarviejo",
      icon: Instagram,
      color: "bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700",
    }
  ];

  return (
    <Card className="border-none shadow-md">
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-2">
          {socialLinks.map((social) => (
            <a
              key={social.name}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button
                className={`w-full h-10 flex items-center justify-center gap-2 text-white text-xs ${social.color}`}
              >
                <social.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{social.name}</span>
              </Button>
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
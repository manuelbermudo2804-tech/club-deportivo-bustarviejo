import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Facebook, Instagram, Twitter } from "lucide-react";

export default function SocialMediaFeed() {
  const [activeTab, setActiveTab] = useState("facebook");

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="bg-gradient-to-r from-orange-600 to-orange-700">
        <CardTitle className="text-white flex items-center gap-2">
          📱 Síguenos en Redes Sociales
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="facebook" className="flex items-center gap-2">
              <Facebook className="w-4 h-4" />
              Facebook
            </TabsTrigger>
            <TabsTrigger value="instagram" className="flex items-center gap-2">
              <Instagram className="w-4 h-4" />
              Instagram
            </TabsTrigger>
            <TabsTrigger value="twitter" className="flex items-center gap-2">
              <Twitter className="w-4 h-4" />
              Twitter
            </TabsTrigger>
          </TabsList>

          <TabsContent value="facebook" className="mt-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <iframe
                src="https://www.facebook.com/plugins/page.php?href=https%3A%2F%2Fwww.facebook.com%2Fcdbustarviejo&tabs=timeline&width=340&height=500&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true&appId"
                width="100%"
                height="500"
                style={{ border: 'none', overflow: 'hidden' }}
                scrolling="no"
                frameBorder="0"
                allowFullScreen={true}
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
              ></iframe>
            </div>
          </TabsContent>

          <TabsContent value="instagram" className="mt-4">
            <div className="bg-slate-50 rounded-lg p-4 text-center space-y-4">
              <p className="text-slate-600 text-sm">
                📸 Síguenos en Instagram para ver nuestras últimas fotos y vídeos
              </p>
              <a
                href="https://www.instagram.com/cdbustarviejo"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all"
              >
                <Instagram className="w-5 h-5" />
                Abrir Instagram
              </a>
              <div className="text-xs text-slate-500 mt-2">
                💡 Para ver el feed completo de Instagram, necesitarías una cuenta Business y configurar la API de Meta
              </div>
            </div>
          </TabsContent>

          <TabsContent value="twitter" className="mt-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <a
                className="twitter-timeline"
                data-height="500"
                data-theme="light"
                href="https://twitter.com/cdbustarviejo?ref_src=twsrc%5Etfw"
              >
                Tweets by cdbustarviejo
              </a>
              <script async src="https://platform.twitter.com/widgets.js" charSet="utf-8"></script>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-4 p-3 bg-blue-50 border-2 border-blue-300 rounded-lg">
          <p className="text-xs text-blue-800 text-center">
            💡 <strong>¿Quieres configurar tus redes sociales?</strong> Contacta con el administrador para actualizar los enlaces.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
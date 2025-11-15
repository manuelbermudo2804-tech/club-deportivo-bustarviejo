import React from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CLUB_LOGO_URL = "https://www.cdbustarviejo.com/uploads/2/4/0/4/2404974/logo-cd-bustarviejo-cuadrado-xpeq_orig.png";

const TEAMS = [
  {
    name: "C.D. BUSTARVIEJO",
    category: "SEGUNDA AFICIONADO",
    url: "https://www.rffm.es/", // Reemplazar con URL real
  },
  {
    name: "C.D. BUSTARVIEJO",
    category: "SEGUNDA JUVENIL",
    url: "https://www.rffm.es/", // Reemplazar con URL real
  },
  {
    name: "C.D. BUSTARVIEJO",
    category: "SEGUNDA CADETE",
    url: "https://www.rffm.es/", // Reemplazar con URL real
  },
  {
    name: "C.D. BUSTARVIEJO",
    category: "SEGUNDA INFANTIL",
    url: "https://www.rffm.es/", // Reemplazar con URL real
  },
  {
    name: "C.D. BUSTARVIEJO 'A'",
    category: "SEGUNDA ALEVIN F-7",
    url: "https://www.rffm.es/", // Reemplazar con URL real
  },
  {
    name: "C.D. BUSTARVIEJO",
    category: "PRIMERA BENJAMIN F7",
    url: "https://www.rffm.es/", // Reemplazar con URL real
  },
  {
    name: "C.D. BUSTARVIEJO",
    category: "JUVENIL F-7 FEMENINO",
    url: "https://www.rffm.es/", // Reemplazar con URL real
  },
];

export default function MatchApp() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-green-950 p-6">
      <div className="max-w-6xl mx-auto">
        <Card className="border-none shadow-2xl bg-white/95 backdrop-blur-sm mb-6">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <img 
                src={CLUB_LOGO_URL} 
                alt="CD Bustarviejo"
                className="w-24 h-24 object-contain drop-shadow-2xl"
              />
            </div>
            <CardTitle className="text-4xl font-bold text-slate-900">
              🏟️ Match Center RFFM
            </CardTitle>
            <p className="text-slate-600 mt-2">
              Resultados, clasificaciones y próximos partidos de nuestros equipos
            </p>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {TEAMS.map((team, index) => (
            <Card key={index} className="border-2 border-slate-700 hover:border-orange-500 transition-all hover:shadow-xl bg-white/95 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="text-center">
                    <h3 className="font-bold text-lg text-slate-900">
                      {team.name}
                    </h3>
                    <p className="text-orange-600 font-semibold mt-1">
                      {team.category}
                    </p>
                  </div>
                  
                  <a 
                    href={team.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3 shadow-xl">
                      Ver en RFFM
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-none shadow-2xl bg-white/95 backdrop-blur-sm mt-6">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-slate-600 mb-3">
              ¿No encuentras tu equipo? Visita la página general del club
            </p>
            <a 
              href="https://www.rffm.es/fichaclub/4095" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="font-semibold">
                Página General CD Bustarviejo
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
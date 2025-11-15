import React from "react";
import { ExternalLink, Calendar, TrendingUp, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CLUB_LOGO_URL = "https://www.cdbustarviejo.com/uploads/2/4/0/4/2404974/logo-cd-bustarviejo-cuadrado-xpeq_orig.png";

const TEAMS = [
  {
    name: "C.D. BUSTARVIEJO",
    category: "SEGUNDA AFICIONADO",
    links: {
      calendario: "https://www.rffm.es/competicion/calendario?temporada=21&tipojuego=1&competicion=24762963&grupo=24762965",
      clasificacion: "https://www.rffm.es/",
      goleadores: "https://www.rffm.es/",
    }
  },
  {
    name: "C.D. BUSTARVIEJO",
    category: "SEGUNDA JUVENIL",
    links: {
      calendario: "https://www.rffm.es/",
      clasificacion: "https://www.rffm.es/",
      goleadores: "https://www.rffm.es/",
    }
  },
  {
    name: "C.D. BUSTARVIEJO",
    category: "SEGUNDA CADETE",
    links: {
      calendario: "https://www.rffm.es/",
      clasificacion: "https://www.rffm.es/",
      goleadores: "https://www.rffm.es/",
    }
  },
  {
    name: "C.D. BUSTARVIEJO",
    category: "SEGUNDA INFANTIL",
    links: {
      calendario: "https://www.rffm.es/",
      clasificacion: "https://www.rffm.es/",
      goleadores: "https://www.rffm.es/",
    }
  },
  {
    name: "C.D. BUSTARVIEJO 'A'",
    category: "SEGUNDA ALEVIN F-7",
    links: {
      calendario: "https://www.rffm.es/",
      clasificacion: "https://www.rffm.es/",
      goleadores: "https://www.rffm.es/",
    }
  },
  {
    name: "C.D. BUSTARVIEJO",
    category: "PRIMERA BENJAMIN F7",
    links: {
      calendario: "https://www.rffm.es/",
      clasificacion: "https://www.rffm.es/",
      goleadores: "https://www.rffm.es/",
    }
  },
  {
    name: "C.D. BUSTARVIEJO",
    category: "JUVENIL F-7 FEMENINO",
    links: {
      calendario: "https://www.rffm.es/",
      clasificacion: "https://www.rffm.es/",
      goleadores: "https://www.rffm.es/",
    }
  },
];

export default function MatchApp() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-green-950 p-6">
      <div className="max-w-7xl mx-auto">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {TEAMS.map((team, index) => (
            <Card key={index} className="border-2 border-slate-700 hover:border-orange-500 transition-all hover:shadow-xl bg-white/95 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <div className="text-center">
                  <h3 className="font-bold text-xl text-slate-900">
                    {team.name}
                  </h3>
                  <p className="text-orange-600 font-semibold text-lg mt-1">
                    {team.category}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <a 
                  href={team.links.calendario} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 shadow-lg">
                    <Calendar className="w-4 h-4 mr-2" />
                    Calendario - Resultados - Jornadas
                    <ExternalLink className="w-3 h-3 ml-auto" />
                  </Button>
                </a>

                <a 
                  href={team.links.clasificacion} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 shadow-lg">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Clasificación
                    <ExternalLink className="w-3 h-3 ml-auto" />
                  </Button>
                </a>

                <a 
                  href={team.links.goleadores} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 shadow-lg">
                    <Target className="w-4 h-4 mr-2" />
                    Goleadores
                    <ExternalLink className="w-3 h-3 ml-auto" />
                  </Button>
                </a>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-none shadow-2xl bg-white/95 backdrop-blur-sm mt-6">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-slate-600 mb-3">
              ¿No encuentras lo que buscas? Visita la página general del club
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
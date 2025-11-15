import React from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const CLUB_LOGO_URL = "https://www.cdbustarviejo.com/uploads/2/4/0/4/2404974/logo-cd-bustarviejo-cuadrado-xpeq_orig.png";

export default function MatchApp() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-green-950 flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full border-none shadow-2xl bg-white/95 backdrop-blur-sm">
        <CardContent className="p-12 text-center space-y-6">
          <div className="flex justify-center mb-6">
            <img 
              src={CLUB_LOGO_URL} 
              alt="CD Bustarviejo"
              className="w-32 h-32 object-contain drop-shadow-2xl"
            />
          </div>
          
          <h1 className="text-4xl font-bold text-slate-900">
            🏟️ Match Center
          </h1>
          
          <p className="text-xl text-slate-700">
            Consulta resultados, clasificaciones y próximos partidos en la web oficial de la RFFM
          </p>
          
          <div className="pt-6">
            <a 
              href="https://www.rffm.es/fichaclub/4095" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-6 text-lg shadow-xl">
                <span>Ir a RFFM Match Center</span>
                <ExternalLink className="w-5 h-5 ml-2" />
              </Button>
            </a>
          </div>
          
          <p className="text-sm text-slate-500 pt-4">
            Se abrirá en una nueva ventana
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
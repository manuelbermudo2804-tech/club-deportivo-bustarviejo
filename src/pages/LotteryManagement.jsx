import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import LoteriaCampanaAdmin from "@/components/loteria/LoteriaCampanaAdmin";

export default function LotteryManagement() {
  const publicUrl = "https://app.cdbustarviejo.com/loteria";

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-red-800 to-green-800 text-white rounded-3xl p-6 shadow-xl">
        <h1 className="text-2xl lg:text-3xl font-black">🍀 Lotería de Navidad</h1>
        <p className="text-white/85 mt-1 text-sm">
          Configura la campaña y los comercios donde se venden los décimos. Todo se publica en la página pública.
        </p>
      </div>

      <Card className="rounded-2xl border-2 border-green-200">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <p className="font-bold text-slate-900">Página pública</p>
            <p className="text-sm text-slate-600 break-all">{publicUrl}</p>
          </div>
          <a href="/loteria" target="_blank" rel="noopener noreferrer">
            <Button className="bg-green-700 hover:bg-green-800">
              <ExternalLink className="w-4 h-4 mr-2" /> Ver página
            </Button>
          </a>
        </CardContent>
      </Card>

      <LoteriaCampanaAdmin />
    </div>
  );
}
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import LoteriaCampanaAdmin from "@/components/loteria/LoteriaCampanaAdmin";

export default function LotteryManagement() {
  const publicUrl = "https://app.cdbustarviejo.com/loteria";

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 p-3 sm:p-5 lg:p-6">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-md sm:p-6">
        <h1 className="flex items-center gap-3 text-2xl font-black tracking-tight sm:text-3xl"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">🍀</span>Lotería de Navidad</h1>
        <p className="text-white/85 mt-1 text-sm">
          Configura la campaña y los comercios donde se venden los décimos. Todo se publica en la página pública.
        </p>
      </div>

      <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <p className="font-bold text-slate-900">Página pública</p>
            <p className="text-sm text-slate-600 break-all">{publicUrl}</p>
          </div>
          <a href="/loteria" target="_blank" rel="noopener noreferrer">
            <Button className="bg-orange-600 font-semibold hover:bg-orange-700">
              <ExternalLink className="w-4 h-4 mr-2" /> Ver página
            </Button>
          </a>
        </CardContent>
      </Card>

      <LoteriaCampanaAdmin />
    </div>
  );
}
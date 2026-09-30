import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History, FileText } from "lucide-react";
import { sameSeason } from "@/lib/sameSeason";

// Pagos "En revisión" de temporadas anteriores: siempre visibles para el admin, sin depender del filtro
export default function DeudaAnteriorRevisionPanel({ payments, currentSeason, onVer, onAprobar, onRechazar }) {
  const lista = (payments || []).filter(p =>
    p.estado === "En revisión" && p.temporada && !sameSeason(p.temporada, currentSeason)
  );
  if (lista.length === 0) return null;

  return (
    <Card className="border-2 border-amber-400 bg-amber-50">
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-amber-700" />
          <h3 className="font-bold text-amber-900">Deuda anterior: {lista.length} pago(s) en revisión</h3>
        </div>
        {lista.map(p => (
          <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-2 bg-white rounded border border-amber-200">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900">{p.jugador_nombre} · {p.mes} · {p.cantidad}€</p>
              <Badge className="bg-amber-100 text-amber-800 text-[10px]">Deuda anterior · {p.temporada}</Badge>
            </div>
            <div className="flex gap-1">
              {p.justificante_url && (
                <Button size="sm" variant="ghost" className="h-7 px-2 text-orange-600" onClick={() => onVer(p.justificante_url)}>
                  <FileText className="w-4 h-4" />
                </Button>
              )}
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-red-400 text-red-600" onClick={() => onRechazar(p)}>✗ Rechazar</Button>
              <Button size="sm" className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700" onClick={() => onAprobar(p)}>✓ Pagado</Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
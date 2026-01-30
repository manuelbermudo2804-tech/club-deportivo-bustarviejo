import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function OpportunityCard({ opp, count, onSignup }) {
  const disponible = opp.estado === 'abierta' && (count < (opp.necesitados || 999));
  return (
    <Card className="bg-white/90">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{opp.titulo}</span>
          <Badge className={disponible?"bg-green-600":"bg-slate-400"}>{disponible?"Abierta":"Cerrada"}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {opp.descripcion && <p className="text-slate-700">{opp.descripcion}</p>}
        <div className="flex gap-3 flex-wrap text-slate-600">
          {opp.fecha && <span>📅 {opp.fecha}{opp.hora?` · ${opp.hora}`:''}</span>}
          {opp.ubicacion && <span>📍 {opp.ubicacion}</span>}
          <span>🧑‍🤝‍🧑 {count}/{opp.necesitados||1}</span>
        </div>
        <div className="pt-2">
          <Button disabled={!disponible} onClick={onSignup}>Apuntarme</Button>
        </div>
      </CardContent>
    </Card>
  );
}
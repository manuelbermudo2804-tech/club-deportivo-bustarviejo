import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function OpportunityCard({ item, onSignupClick, onManage }) {
  const remaining = typeof item.cupo === 'number' && item.cupo > 0 && Array.isArray(item.inscritos) ? Math.max(0, item.cupo - item.inscritos.length) : null;

  return (
    <Card className="bg-white/90">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg font-bold">{item.titulo}</CardTitle>
          <div className="mt-1 text-sm text-slate-600">{item.descripcion}</div>
        </div>
        <div className="flex gap-2 items-center">
          <Badge className={item.categoria === 'evento' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}>
            {item.categoria === 'evento' ? 'Evento' : 'Día a día'}
          </Badge>
          {remaining !== null && (
            <Badge variant="outline">Quedan {remaining}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <div className="text-sm text-slate-600">
          {item.fecha && <span className="mr-3">📅 {item.fecha}</span>}
          {item.hora && <span className="mr-3">⏰ {item.hora}</span>}
          {item.ubicacion && <span>📍 {item.ubicacion}</span>}
        </div>
        {onSignupClick && (
          <Button onClick={() => onSignupClick(item)} className="bg-green-600 hover:bg-green-700">Apuntarme</Button>
        )}
        {onManage && (
          <Button variant="outline" onClick={() => onManage(item)}>Gestionar</Button>
        )}
      </CardContent>
    </Card>
  );
}
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, CheckCircle2 } from "lucide-react";

export default function OpportunityCard({ opp, count, alreadySignedUp, isCreator, isStaff, onSignup, onEdit, onDelete }) {
  const item = opp;
  const catLabels = { evento: 'Evento', dia_a_dia: 'Día a día', logistica: 'Logística', comunicacion: 'Comunicación', otro: 'Otro' };

  return (
    <Card className="bg-white/90">
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <CardTitle className="text-lg font-bold">{item.titulo}</CardTitle>
          {item.descripcion && <div className="mt-1 text-sm text-slate-600">{item.descripcion}</div>}
        </div>
        <div className="flex gap-2 items-center flex-shrink-0 flex-wrap justify-end">
          <Badge className={item.categoria === 'evento' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}>
            {catLabels[item.categoria] || item.categoria}
          </Badge>
          {count > 0 && (
            <Badge variant="outline">👥 {count} apuntados</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm text-slate-600 flex flex-wrap gap-3">
          {item.fecha && <span>📅 {item.fecha}</span>}
          {item.hora && <span>⏰ {item.hora}</span>}
          {item.ubicacion && <span>📍 {item.ubicacion}</span>}
          {item.necesitados > 0 && <span>🎯 {item.necesitados} necesarios</span>}
        </div>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex gap-2">
            {(isCreator || isStaff) && onEdit && (
              <Button size="sm" variant="outline" onClick={onEdit}>
                <Pencil className="w-4 h-4 mr-1" /> Editar
              </Button>
            )}
            {(isCreator || isStaff) && onDelete && (
              <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={onDelete}>
                <Trash2 className="w-4 h-4 mr-1" /> Eliminar
              </Button>
            )}
          </div>
          <div>
            {alreadySignedUp ? (
              <Badge className="bg-green-100 text-green-700 py-1.5 px-3">
                <CheckCircle2 className="w-4 h-4 mr-1" /> Ya estás apuntado
              </Badge>
            ) : onSignup ? (
              <Button onClick={onSignup} className="bg-green-600 hover:bg-green-700">Apuntarme</Button>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
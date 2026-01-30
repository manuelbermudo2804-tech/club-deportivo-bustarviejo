import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ListingCard({ item, onReserve, onEdit }) {
  const isFree = item.tipo === 'donacion' || Number(item.precio) === 0;
  return (
    <Card className="bg-white/90">
      <CardHeader className="flex items-start justify-between">
        <div>
          <CardTitle className="text-lg font-bold">{item.titulo}</CardTitle>
          <div className="text-sm text-slate-600 mt-1">{item.descripcion}</div>
          <div className="text-xs text-slate-500 mt-1">Vendedor: {item.vendedor_nombre || item.vendedor_email} · {item.vendedor_telefono || ''}</div>
        </div>
        <div className="text-right">
          <Badge className="mb-1">{item.categoria}</Badge>
          <div className={`text-xl font-extrabold ${isFree ? 'text-green-600' : 'text-slate-900'}`}>
            {isFree ? 'GRATIS' : `${Number(item.precio).toFixed(2)} €`}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <div className="flex gap-2 overflow-x-auto">
          {(item.imagenes || []).map((url, i) => (
            <img key={i} src={url} alt="foto" className="w-24 h-24 object-cover rounded" />
          ))}
        </div>
        <div className="flex gap-2">
          {onEdit && (
            <Button variant="outline" onClick={() => onEdit(item)}>Editar</Button>
          )}
          {onReserve && (
            <Button onClick={() => onReserve(item)} className="bg-green-600 hover:bg-green-700">Reservar</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
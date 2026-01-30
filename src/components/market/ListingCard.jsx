import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ListingCard({ item, onReserve, onEdit }) {
  const isNew = (() => {
    try {
      const d = new Date(item.created_date);
      return Date.now() - d.getTime() < 7 * 24 * 60 * 60 * 1000; // 7 días
    } catch { return false; }
  })();
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
          <div className="flex items-center gap-2 justify-end mb-1">
            <Badge className="mb-0">{item.categoria}</Badge>
            {isNew && <Badge className="bg-red-500 text-white border-none">Nuevo</Badge>}
          </div>
          <div className={`text-xl font-extrabold ${isFree ? 'text-green-600' : 'text-slate-900'}`}>
            {isFree ? 'GRATIS' : `${Number(item.precio).toFixed(2)} €`}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <div className="flex gap-2 overflow-x-auto">
          {(item.imagenes || []).map((url, i) => (
            <img key={i} src={url} alt="foto" className="w-24 h-24 object-cover rounded" />
          ))}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            {onEdit && (
              <Button variant="outline" onClick={() => onEdit(item)}>Editar</Button>
            )}
            {onReserve && (
              <Button onClick={() => onReserve(item)} className="bg-green-600 hover:bg-green-700">Reservar</Button>
            )}
          </div>
          <div className="text-[11px] text-slate-500 text-right">
            Al reservar, el vendedor recibe un email automático con tus datos para contactarte.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
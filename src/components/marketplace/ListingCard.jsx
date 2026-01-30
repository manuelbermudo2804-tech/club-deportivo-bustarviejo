import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function ListingCard({ item, onReserve, isOwner }) {
  const cover = (item.imagenes||[])[0];
  return (
    <Card className="bg-white/90">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{item.titulo}</span>
          <div className="flex gap-2">
            {item.donacion ? (
              <Badge className="bg-green-600">Donación</Badge>
            ) : (
              <Badge className="bg-slate-800">{Number(item.precio||0).toFixed(2)} €</Badge>
            )}
            <Badge className={item.estado==='activo'?"bg-blue-600":"bg-slate-400"}>{item.estado}</Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {cover && <img src={cover} alt="img" className="w-full h-48 object-cover rounded-lg" />}
        {item.descripcion && <p className="text-slate-700">{item.descripcion}</p>}
        <div className="text-slate-600">Vendedor: {item.seller_email}{item.seller_telefono?` · ${item.seller_telefono}`:''}</div>
        {!isOwner && item.estado==='activo' && (
          <Button onClick={onReserve}>Reservar</Button>
        )}
      </CardContent>
    </Card>
  );
}
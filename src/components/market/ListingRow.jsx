import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ListingRow({ item, onReserve, onEdit }) {
  const isFree = item.tipo === 'donacion' || Number(item.precio) === 0;
  const img = (item.imagenes || [])[0];
  return (
    <div className="flex items-center gap-3 p-3 hover:bg-slate-50">
      <div className="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
        {img ? (
          <img src={img} alt={item.titulo} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full grid place-items-center text-slate-400 text-xs">Sin foto</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium truncate">{item.titulo}</p>
            {item.descripcion && (
              <p className="text-xs text-slate-500 truncate">{item.descripcion}</p>
            )}
            <div className="mt-1 flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">{item.categoria}</Badge>
              {item.vendedor_nombre && (
                <span className="text-[11px] text-slate-500 truncate">Vendedor: {item.vendedor_nombre}</span>
              )}
            </div>
          </div>
          <div className={`text-right font-bold ${isFree ? 'text-green-600' : 'text-slate-900'}`}>
            {isFree ? 'GRATIS' : `${Number(item.precio||0).toFixed(2)} €`}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onEdit && (
          <Button variant="outline" size="sm" onClick={() => onEdit(item)}>Editar</Button>
        )}
        {onReserve && (
          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => onReserve(item)}>Reservar</Button>
        )}
      </div>
    </div>
  );
}
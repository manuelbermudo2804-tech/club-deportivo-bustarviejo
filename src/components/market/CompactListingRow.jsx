import React from "react";
import { Button } from "@/components/ui/button";

export default function CompactListingRow({ item, user, onReserve, onEdit }) {
  const firstImg = Array.isArray(item.imagenes) && item.imagenes[0] ? item.imagenes[0] : null;
  const isNew = (() => {
    try { return (Date.now() - new Date(item.created_date).getTime()) < 7*24*60*60*1000; } catch { return false; }
  })();
  const price = item.tipo === 'donacion' || Number(item.precio||0) === 0 ? 'GRATIS' : `${Number(item.precio||0).toFixed(2)} €`;

  return (
    <div className="flex items-center gap-3 p-3">
      <div className="h-20 w-20 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100">
        {firstImg ? (
          <img src={firstImg} alt={item.titulo} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full grid place-items-center text-slate-400">📦</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold truncate max-w-[60vw] md:max-w-[500px]">{item.titulo}</span>
          {isNew && (
            <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 border border-green-200">Nuevo</span>
          )}
        </div>
        <div className="text-xs text-slate-500 truncate">
          {item.categoria} · {item.tipo === 'donacion' ? 'Donación' : 'Venta'}
        </div>
        {item.descripcion && (
          <div className="text-xs text-slate-600 line-clamp-2 mt-0.5">{item.descripcion}</div>
        )}
      </div>
      <div className="flex flex-col items-end gap-2">
        <div className="font-bold text-slate-900">{price}</div>
        <div className="flex gap-2">
          {user && (item.created_by === user.email) && (
            <Button variant="outline" size="sm" onClick={() => onEdit && onEdit(item)}>Editar</Button>
          )}
          <Button size="sm" className="bg-orange-600 hover:bg-orange-700" onClick={() => onReserve && onReserve(item)}>Reservar</Button>
        </div>
      </div>
    </div>
  );
}
import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { esVendido } from "./marketActions";

export default function MarketListingCard({ item, user, isAdmin, onEdit, onReserve, onSold, onRelease, onCancel, onCancelMyReservation }) {
  const firstImg = Array.isArray(item.imagenes) && item.imagenes[0] ? item.imagenes[0] : null;
  const isNew = (() => { try { return (Date.now() - new Date(item.created_date).getTime()) < 7 * 24 * 60 * 60 * 1000; } catch { return false; } })();
  const price = item.tipo === 'donacion' || Number(item.precio || 0) === 0 ? 'GRATIS' : `${Number(item.precio || 0).toFixed(0)} €`;
  const isMine = user && (item.created_by === user.email || item.vendedor_email === user.email);
  const isReserved = item.estado === 'reservado';
  const sold = esVendido(item);
  const puedeVerComprador = isMine || isAdmin;
  const esMiReserva = user && isReserved && item.reservado_por_email === user.email;

  return (
    <Card className={`overflow-hidden transition-all hover:shadow-lg group ${isReserved ? 'ring-2 ring-yellow-300' : ''}`}>
      <Link to={createPageUrl(`MarketListingDetail?id=${item.id}`)}>
        <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
          {firstImg ? (
            <img src={firstImg} alt={item.titulo} className={`h-full w-full object-cover transition-transform duration-300 ${sold ? 'grayscale' : 'group-hover:scale-105'}`} />
          ) : (
            <div className="h-full w-full grid place-items-center text-5xl text-slate-300">📦</div>
          )}

          {sold && (
            <div className="absolute inset-0 bg-black/45 grid place-items-center">
              <span className="text-white text-xl sm:text-2xl font-black tracking-widest border-4 border-white px-3 py-1 -rotate-12 drop-shadow-lg">
                {item.estado === 'entregado' ? 'ENTREGADO' : 'VENDIDO'}
              </span>
            </div>
          )}

          <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
            {item.tipo === 'donacion' && <Badge className="bg-green-500 text-white border-none text-[10px] px-1.5 py-0">🎁 Gratis</Badge>}
            {isNew && !sold && <Badge className="bg-blue-500 text-white border-none text-[10px] px-1.5 py-0">Nuevo</Badge>}
            {isReserved && <Badge className="bg-yellow-500 text-white border-none text-[10px] px-1.5 py-0">Reservado</Badge>}
            {item.estado === 'pendiente' && <Badge className="bg-slate-600 text-white border-none text-[10px] px-1.5 py-0">Pendiente de revisión</Badge>}
          </div>

          {!sold && (
            <div className="absolute bottom-2 right-2">
              <span className={`text-sm font-black px-2.5 py-1 rounded-full shadow-lg ${price === 'GRATIS' ? 'bg-green-500 text-white' : 'bg-white/95 text-slate-900'}`}>{price}</span>
            </div>
          )}
        </div>
      </Link>

      <CardContent className="p-3 space-y-2">
        <Link to={createPageUrl(`MarketListingDetail?id=${item.id}`)} className="block">
          <h3 className="font-bold text-sm truncate hover:text-orange-600 transition-colors">{item.titulo}</h3>
        </Link>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <span className="bg-slate-100 px-1.5 py-0.5 rounded">{item.categoria}</span>
          <span>·</span>
          <span className="truncate">{item.vendedor_nombre || 'Anónimo'}</span>
        </div>

        {isReserved && puedeVerComprador && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-[11px] text-yellow-900 space-y-0.5">
            <p className="font-bold">🛍️ Reservado por {item.reservado_por_nombre || item.reservado_por_email}</p>
            {item.reservado_por_telefono && <p>📞 {item.reservado_por_telefono}</p>}
            {item.reservado_por_email && <p className="truncate">✉️ {item.reservado_por_email}</p>}
            {item.reservado_fecha && <p className="text-yellow-700">{new Date(item.reservado_fecha).toLocaleString('es-ES')}</p>}
            {isMine && <p className="pt-1 font-semibold">Cuando se lo entregues, pulsa «Vendido».</p>}
          </div>
        )}

        {sold && puedeVerComprador && item.comprador_final_nombre && (
          <p className="text-[11px] text-slate-500">
            {item.estado === 'entregado' ? 'Entregado a' : 'Vendido a'} <span className="font-semibold">{item.comprador_final_nombre}</span>
          </p>
        )}

        {!sold && (
          <div className="flex gap-1.5 pt-1">
            {isMine || isAdmin ? (
              <>
                <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={() => onEdit(item)}>Editar</Button>
                <Button size="sm" className={`flex-1 text-xs h-8 ${item.tipo === 'donacion' ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-900 hover:bg-slate-800'}`} onClick={() => onSold(item)}>
                  {item.tipo === 'donacion' ? 'Entregado' : 'Vendido'}
                </Button>
                {isReserved && (
                  <Button variant="outline" size="sm" className="text-xs h-8 border-blue-400 text-blue-600" onClick={() => onRelease(item)}>Liberar</Button>
                )}
                {isAdmin && onCancel && (
                  <Button variant="outline" size="sm" className="text-xs h-8 border-red-300 text-red-600" onClick={() => onCancel(item)}>Retirar</Button>
                )}
              </>
            ) : esMiReserva ? (
              <Button variant="outline" size="sm" className="w-full text-xs h-8 border-red-300 text-red-600" onClick={() => onCancelMyReservation(item)}>
                ↩️ Anular mi reserva
              </Button>
            ) : (
              <Button size="sm" className="w-full bg-orange-600 hover:bg-orange-700 text-xs h-8 disabled:opacity-50" disabled={isReserved} onClick={() => onReserve(item)}>
                {isReserved ? '🔒 Reservado' : '🛒 Reservar'}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
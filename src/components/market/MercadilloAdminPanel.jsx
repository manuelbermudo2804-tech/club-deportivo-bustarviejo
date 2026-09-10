import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { marcarVendido, liberarReserva } from "./marketActions";

const ESTADOS = [
  { v: 'pendiente', l: 'Pendiente de revisión' },
  { v: 'activo', l: 'Publicado' },
  { v: 'reservado', l: 'Reservado' },
  { v: 'vendido', l: 'Vendido' },
  { v: 'entregado', l: 'Entregado' },
  { v: 'cancelado', l: 'Cancelado' },
];

const COLORS = {
  pendiente: 'bg-slate-200 text-slate-700',
  activo: 'bg-green-100 text-green-700',
  reservado: 'bg-yellow-100 text-yellow-800',
  vendido: 'bg-blue-100 text-blue-700',
  entregado: 'bg-blue-100 text-blue-700',
  cancelado: 'bg-red-100 text-red-700',
};

export default function MercadilloAdminPanel({ listings, user, onEdit, onChanged }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(null);

  const cambiarEstado = async (item, estado) => {
    setBusy(item.id);
    try {
      if (estado === 'vendido' || estado === 'entregado') {
        await marcarVendido(item, user?.email);
      } else if (estado === 'activo' && item.estado === 'reservado') {
        await liberarReserva(item);
      } else {
        await base44.entities.MarketListing.update(item.id, {
          estado,
          ...(estado === 'cancelado' ? { cancelado_por: user?.email } : {}),
        });
      }
      toast.success('Estado actualizado');
      await onChanged?.();
    } finally {
      setBusy(null);
    }
  };

  const eliminar = async (item) => {
    if (!window.confirm(`¿Eliminar definitivamente "${item.titulo}"?`)) return;
    await base44.entities.MarketListing.delete(item.id);
    toast.success('Anuncio eliminado');
    await onChanged?.();
  };

  const pendientes = listings.filter(l => l.estado === 'pendiente').length;

  return (
    <Card className="border-purple-200 bg-purple-50/40">
      <CardHeader className="pb-3">
        <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full text-left">
          <CardTitle className="text-base flex items-center gap-2 text-purple-900">
            <ShieldCheck className="w-4 h-4" />
            Gestión del Mercadillo ({listings.length})
            {pendientes > 0 && <Badge className="bg-orange-600 text-white">{pendientes} por revisar</Badge>}
          </CardTitle>
          {open ? <ChevronUp className="w-4 h-4 text-purple-700" /> : <ChevronDown className="w-4 h-4 text-purple-700" />}
        </button>
      </CardHeader>
      {open && (
        <CardContent className="space-y-2">
          {listings.length === 0 && <p className="text-sm text-slate-500">No hay anuncios.</p>}
          {listings.map(item => (
            <div key={item.id} className="bg-white rounded-lg border p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{item.titulo}</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {item.vendedor_nombre || item.vendedor_email} · {item.vendedor_telefono || 'sin teléfono'}
                    {(!item.imagenes || item.imagenes.length === 0) && <span className="text-red-600 font-semibold"> · ⚠️ sin foto</span>}
                  </p>
                  {item.reservado_por_email && (
                    <p className="text-[11px] text-yellow-800 truncate">
                      Reservado por {item.reservado_por_nombre || item.reservado_por_email} ({item.reservado_por_telefono || 'sin tel.'})
                      {item.reservado_fecha ? ` · ${new Date(item.reservado_fecha).toLocaleString('es-ES')}` : ''}
                    </p>
                  )}
                </div>
                <Badge className={`${COLORS[item.estado] || 'bg-slate-100'} border-none flex-shrink-0`}>{item.estado}</Badge>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <Select value={item.estado} onValueChange={(v) => cambiarEstado(item, v)} disabled={busy === item.id}>
                  <SelectTrigger className="h-8 text-xs w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ESTADOS.map(e => <SelectItem key={e.v} value={e.v}>{e.l}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => onEdit(item)}>Modificar</Button>
                <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => eliminar(item)}>Eliminar</Button>
              </div>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
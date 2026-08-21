import React from "react";
import { MapPin, Clock, Phone, Store } from "lucide-react";

export default function ComercioCard({ comercio }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex gap-4 items-center">
      <div className="w-16 h-16 shrink-0 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden">
        {comercio.logo_url ? (
          <img src={comercio.logo_url} alt={comercio.nombre} className="w-full h-full object-contain p-1" />
        ) : (
          <Store className="w-7 h-7 text-slate-400" />
        )}
      </div>
      <div className="min-w-0">
        <p className="font-bold text-slate-900 leading-tight">{comercio.nombre}</p>
        {comercio.direccion && (
          <p className="text-sm text-slate-600 flex items-center gap-1 mt-1">
            <MapPin className="w-3.5 h-3.5 shrink-0" /> {comercio.direccion}
          </p>
        )}
        {comercio.horario && (
          <p className="text-sm text-slate-600 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 shrink-0" /> {comercio.horario}
          </p>
        )}
        {comercio.telefono && (
          <p className="text-sm text-slate-600 flex items-center gap-1">
            <Phone className="w-3.5 h-3.5 shrink-0" /> {comercio.telefono}
          </p>
        )}
      </div>
    </div>
  );
}
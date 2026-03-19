import React from "react";
import { Car, Users, Phone, MapPin, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function WhatsAppButton({ telefono, nombre }) {
  if (!telefono) return null;
  const cleanPhone = telefono.replace(/\s+/g, '').replace(/^(\+)?/, '+');
  const phone34 = cleanPhone.startsWith('+') ? cleanPhone.slice(1) : `34${cleanPhone}`;
  return (
    <a
      href={`https://wa.me/${phone34}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg transition-colors"
    >
      <MessageCircle className="w-3.5 h-3.5" />
      WhatsApp
    </a>
  );
}

export default function TransportePanel({ callup, currentUserEmail }) {
  const jugadores = callup.jugadores_convocados || [];
  
  const ofertas = jugadores.filter(j => 
    j.confirmacion === "asistire" && j.transporte?.tipo === "ofrezco_plazas"
  );
  const necesitan = jugadores.filter(j => 
    j.confirmacion === "asistire" && j.transporte?.tipo === "necesito_transporte"
  );

  const totalPlazasOfrecidas = ofertas.reduce((sum, j) => sum + (j.transporte?.plazas || 0), 0);
  const totalPlazasNecesitadas = necesitan.reduce((sum, j) => sum + (j.transporte?.plazas || 0), 0);

  if (ofertas.length === 0 && necesitan.length === 0) return null;

  const cubierto = totalPlazasOfrecidas >= totalPlazasNecesitadas;

  return (
    <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <Car className="w-4.5 h-4.5 text-white" />
          </div>
          <h3 className="font-bold text-blue-900">🚗 Compartir Coche</h3>
        </div>
        <Badge className={cubierto 
          ? "bg-green-100 text-green-800 border border-green-300" 
          : "bg-amber-100 text-amber-800 border border-amber-300"
        }>
          {cubierto ? "✅ Plazas cubiertas" : `⚠️ Faltan ${totalPlazasNecesitadas - totalPlazasOfrecidas} plazas`}
        </Badge>
      </div>

      {/* Resumen rápido */}
      <div className="flex gap-3">
        <div className="flex-1 bg-green-50 border border-green-200 rounded-lg p-2.5 text-center">
          <div className="text-lg font-bold text-green-700">{totalPlazasOfrecidas}</div>
          <p className="text-[10px] text-green-600 uppercase font-semibold">Plazas ofrecidas</p>
        </div>
        <div className="flex-1 bg-orange-50 border border-orange-200 rounded-lg p-2.5 text-center">
          <div className="text-lg font-bold text-orange-700">{totalPlazasNecesitadas}</div>
          <p className="text-[10px] text-orange-600 uppercase font-semibold">Plazas necesitadas</p>
        </div>
      </div>

      {/* Ofrecen plazas */}
      {ofertas.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-green-700 uppercase tracking-wide">🚗 Ofrecen plazas</p>
          {ofertas.map((j) => (
            <div key={j.jugador_id} className="bg-white rounded-lg p-3 border border-green-200 flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-slate-900 truncate">
                    {j.transporte?.nombre_contacto || `Padre/madre de ${j.jugador_nombre}`}
                  </span>
                  <Badge className="bg-green-100 text-green-700 text-[10px]">
                    {j.transporte?.plazas || 0} {(j.transporte?.plazas || 0) === 1 ? 'plaza' : 'plazas'}
                  </Badge>
                </div>
                {j.transporte?.punto_salida && (
                  <div className="flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span className="text-xs text-slate-500">Desde {j.transporte.punto_salida}</span>
                  </div>
                )}
                {j.transporte?.telefono_contacto && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span className="text-xs text-slate-500">{j.transporte.telefono_contacto}</span>
                  </div>
                )}
              </div>
              <WhatsAppButton telefono={j.transporte?.telefono_contacto} nombre={j.transporte?.nombre_contacto} />
            </div>
          ))}
        </div>
      )}

      {/* Necesitan transporte */}
      {necesitan.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-orange-700 uppercase tracking-wide">🙋 Necesitan transporte</p>
          {necesitan.map((j) => (
            <div key={j.jugador_id} className="bg-white rounded-lg p-3 border border-orange-200 flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-slate-900 truncate">
                    {j.transporte?.nombre_contacto || `Padre/madre de ${j.jugador_nombre}`}
                  </span>
                  <Badge className="bg-orange-100 text-orange-700 text-[10px]">
                    {j.transporte?.plazas || 0} {(j.transporte?.plazas || 0) === 1 ? 'plaza' : 'plazas'}
                  </Badge>
                </div>
                {j.transporte?.telefono_contacto && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span className="text-xs text-slate-500">{j.transporte.telefono_contacto}</span>
                  </div>
                )}
              </div>
              <WhatsAppButton telefono={j.transporte?.telefono_contacto} nombre={j.transporte?.nombre_contacto} />
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-blue-600 text-center italic">
        Contacta directamente por WhatsApp para coordinar el viaje
      </p>
    </div>
  );
}
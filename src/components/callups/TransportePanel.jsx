import React, { useState } from "react";
import { Car, Users, Phone, MapPin, MessageCircle, ChevronDown, ChevronUp } from "lucide-react";
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
  const [expanded, setExpanded] = useState(false);
  const jugadores = callup.jugadores_convocados || [];
  
  const ofertas = jugadores.filter(j => 
    j.confirmacion === "asistire" && j.transporte?.tipo === "ofrezco_plazas"
  );
  const necesitan = jugadores.filter(j => 
    j.confirmacion === "asistire" && j.transporte?.tipo === "necesito_transporte"
  );

  const totalPlazasOfrecidas = ofertas.reduce((sum, j) => sum + (j.transporte?.plazas || 0), 0);
  const totalPlazasNecesitadas = necesitan.reduce((sum, j) => sum + (j.transporte?.plazas || 0), 0);

  // Si no hay nadie usándolo todavía, mostrar invitación mínima
  if (ofertas.length === 0 && necesitan.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Car className="w-4 h-4 text-white" />
        </div>
        <p className="text-xs text-blue-800 flex-1">
          💡 ¿Vas en coche? Pulsa <strong>🚗 Transporte</strong> en tu hijo/a para ofrecer o pedir plazas.
        </p>
      </div>
    );
  }

  const cubierto = totalPlazasOfrecidas >= totalPlazasNecesitadas;

  return (
    <div className="bg-blue-50 border-2 border-blue-200 rounded-xl overflow-hidden">
      {/* Cabecera plegable */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center justify-between gap-2 hover:bg-blue-100 transition-colors"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Car className="w-4 h-4 text-white" />
          </div>
          <div className="text-left flex-1 min-w-0">
            <h3 className="font-bold text-blue-900 text-sm">🚗 Compartir Coche</h3>
            <p className="text-[11px] text-blue-700">
              {ofertas.length > 0 && `${ofertas.length} ${ofertas.length === 1 ? 'ofrece' : 'ofrecen'} plazas`}
              {ofertas.length > 0 && necesitan.length > 0 && ' · '}
              {necesitan.length > 0 && `${necesitan.length} ${necesitan.length === 1 ? 'busca' : 'buscan'}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge className={cubierto 
            ? "bg-green-100 text-green-800 border border-green-300 text-[10px]" 
            : "bg-amber-100 text-amber-800 border border-amber-300 text-[10px]"
          }>
            {cubierto ? "✅" : `Faltan ${totalPlazasNecesitadas - totalPlazasOfrecidas}`}
          </Badge>
          {expanded ? <ChevronUp className="w-4 h-4 text-blue-700" /> : <ChevronDown className="w-4 h-4 text-blue-700" />}
        </div>
      </button>

      {!expanded && null}

      {expanded && (
      <div className="p-4 pt-0 space-y-3">

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
      )}
    </div>
  );
}
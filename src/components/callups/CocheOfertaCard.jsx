import React from "react";
import { MapPin, Phone, UserPlus, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import WhatsAppButton from "./WhatsAppButton";

/**
 * Tarjeta de un coche que ofrece plazas.
 * Muestra plazas libres reales (ofrecidas - pasajeros) y permite apuntarse/salirse.
 */
export default function CocheOfertaCard({ oferta, misJugadoresDisponibles = [], misPasajeros = [], onJoin, onLeave, isSaving }) {
  const t = oferta.transporte || {};
  const pasajeros = t.pasajeros || [];
  const plazasLibres = Math.max(0, (t.plazas || 0) - pasajeros.length);

  return (
    <div className="bg-white rounded-lg p-3 border border-green-200 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-slate-900 truncate">
              {t.nombre_contacto || `Familia de ${oferta.jugador_nombre}`}
            </span>
            <Badge className={plazasLibres > 0 ? "bg-green-100 text-green-700 text-[10px]" : "bg-slate-200 text-slate-600 text-[10px]"}>
              {plazasLibres > 0 ? `${plazasLibres} ${plazasLibres === 1 ? 'plaza libre' : 'plazas libres'}` : 'Coche completo'}
            </Badge>
          </div>
          {t.punto_salida && (
            <div className="flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3 text-slate-400" />
              <span className="text-xs text-slate-500">Desde {t.punto_salida}</span>
            </div>
          )}
          {t.telefono_contacto && (
            <div className="flex items-center gap-1 mt-0.5">
              <Phone className="w-3 h-3 text-slate-400" />
              <span className="text-xs text-slate-500">{t.telefono_contacto}</span>
            </div>
          )}
        </div>
        <WhatsAppButton telefono={t.telefono_contacto} />
      </div>

      {pasajeros.length > 0 && (
        <div className="bg-green-50 rounded-lg px-2.5 py-2">
          <p className="text-[10px] font-bold text-green-700 uppercase mb-1">Van en este coche</p>
          <div className="flex flex-wrap gap-1.5">
            {pasajeros.map(p => (
              <Badge key={p.jugador_id} className="bg-white border border-green-300 text-green-800 text-[10px]">
                {p.jugador_nombre}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Acciones de la familia que está viendo */}
      {misPasajeros.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {misPasajeros.map(p => (
            <Button
              key={p.jugador_id}
              size="sm"
              variant="outline"
              disabled={isSaving}
              onClick={() => onLeave(oferta, p.jugador_id)}
              className="border-red-300 text-red-700 hover:bg-red-50 text-xs"
            >
              <LogOut className="w-3.5 h-3.5 mr-1" />
              Bajar a {p.jugador_nombre.split(' ')[0]}
            </Button>
          ))}
        </div>
      )}

      {plazasLibres > 0 && misJugadoresDisponibles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {misJugadoresDisponibles.map(j => (
            <Button
              key={j.jugador_id}
              size="sm"
              disabled={isSaving}
              onClick={() => onJoin(oferta, j)}
              className="bg-green-600 hover:bg-green-700 text-white text-xs"
            >
              <UserPlus className="w-3.5 h-3.5 mr-1" />
              Apuntar a {j.jugador_nombre.split(' ')[0]}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
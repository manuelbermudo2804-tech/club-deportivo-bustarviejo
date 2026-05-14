import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

/**
 * Lista de becas concedidas (estado activa).
 * Permite revocar una beca (devuelve el importe al fondo y elimina el ajuste de cuota).
 */
export default function BecasList({ becas = [], onChange }) {
  const [revokingId, setRevokingId] = useState(null);

  const activas = becas.filter((b) => b.estado === "activa");

  const handleRevoke = async (beca) => {
    if (!window.confirm(`¿Revocar la beca de ${beca.importe.toFixed(2)}€ a ${beca.jugador_nombre}? Se devolverá el importe al fondo y se eliminará el descuento.`)) {
      return;
    }

    setRevokingId(beca.id);
    try {
      const me = await base44.auth.me();

      // 1) Marcar beca como revocada
      await base44.entities.Beca.update(beca.id, {
        estado: "revocada",
        revocada_por: me?.email || "",
        fecha_revocacion: new Date().toISOString(),
        motivo_revocacion: "Revocada manualmente",
      });

      // 2) Restaurar la cuota del jugador (sumar importe)
      try {
        const player = await base44.entities.Player.get?.(beca.jugador_id);
        if (player) {
          const cuotaActual = Number(player?.ajuste_cuota?.cuota_ajustada) || 0;
          const cuotaOriginal = Number(player?.ajuste_cuota?.cuota_original) || 0;
          await base44.entities.Player.update(beca.jugador_id, {
            ajuste_cuota: {
              ...(player.ajuste_cuota || {}),
              cuota_original: cuotaOriginal,
              cuota_ajustada: cuotaActual + Number(beca.importe),
              motivo: "Beca revocada — cuota restaurada",
              motivo_tipo: "otro",
              ajustado_por: me?.email || "",
              fecha_ajuste: new Date().toISOString(),
            },
          });
        }
      } catch (e) {
        console.warn("No se pudo restaurar el ajuste de cuota:", e);
      }

      toast.success("Beca revocada correctamente");
      onChange?.();
    } catch (err) {
      console.error("Error revocando beca:", err);
      toast.error("Error al revocar la beca");
    } finally {
      setRevokingId(null);
    }
  };

  if (activas.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-slate-500">
        Aún no se ha concedido ninguna beca con este fondo.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activas.map((beca) => (
        <div
          key={beca.id}
          className="flex items-center justify-between gap-3 bg-white rounded-lg p-3 border border-green-200 shadow-sm"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <Heart className="w-4 h-4 text-green-700" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-slate-800 truncate">{beca.jugador_nombre}</p>
                {beca.categoria && (
                  <Badge variant="outline" className="text-xs">{beca.categoria}</Badge>
                )}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {beca.fecha_concesion && (
                  <span>{format(new Date(beca.fecha_concesion), "d MMM yyyy", { locale: es })}</span>
                )}
                {beca.motivo && <span className="ml-2">· {beca.motivo}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge className="bg-green-100 text-green-800 border border-green-300">
              −{Number(beca.importe).toFixed(2)}€
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRevoke(beca)}
              disabled={revokingId === beca.id}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              title="Revocar beca"
            >
              {revokingId === beca.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
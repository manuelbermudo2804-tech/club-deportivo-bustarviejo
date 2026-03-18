import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Gift, Info, ShieldOff } from "lucide-react";

export default function MerchSection({ merchUrl }) {
  return (
    <Card className="overflow-hidden border-2 border-green-200 shadow-lg">
      <CardContent className="p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 p-5 text-white">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Gift className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">🛒 Merchandising del Club</h2>
              <p className="text-green-100 text-sm">Gorras, tazas, llaveros y cientos de artículos exclusivos del club</p>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-5 space-y-4">
          {/* Invitación + aviso */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center mb-1">
            <p className="text-green-800 text-sm">
              💚 ¡Lleva los colores del <strong>CD Bustarviejo</strong> a todas partes! Artículos ideales para regalar o para el día a día.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900 text-sm">ℹ️ Tienda gestionada por un proveedor externo</p>
                <p className="text-blue-700 text-sm mt-1">
                  Los pedidos, envíos y devoluciones se gestionan directamente con la tienda online, no a través del club.
                </p>
              </div>
            </div>
          </div>

          {/* Detalles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-2.5">
              <ShieldOff className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-800 text-xs">No gestionamos devoluciones</p>
                <p className="text-slate-600 text-[11px] mt-0.5">Cualquier incidencia debe resolverse directamente con la tienda online.</p>
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-2.5">
              <Gift className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-800 text-xs">No gestionamos envíos</p>
                <p className="text-slate-600 text-[11px] mt-0.5">Los pedidos y entregas son responsabilidad exclusiva del proveedor.</p>
              </div>
            </div>
          </div>

          {/* Nota */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong>📌 Nota:</strong> Para cualquier consulta sobre pedidos, plazos de entrega o incidencias, contacta directamente con la tienda online.
            </p>
          </div>

          {/* Botón */}
          <div className="text-center pt-1">
            {merchUrl ? (
              <a href={merchUrl} target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="bg-green-600 hover:bg-green-700 gap-2 text-base px-8 shadow-lg shadow-green-600/30">
                  <ExternalLink className="w-5 h-5" />
                  Ir a la tienda de merchandising
                </Button>
              </a>
            ) : (
              <div className="bg-green-50 border-2 border-dashed border-green-300 rounded-xl p-4">
                <p className="text-green-700 font-semibold">🔜 Próximamente</p>
                <p className="text-green-600 text-sm mt-1">La tienda de merchandising se abrirá pronto.</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
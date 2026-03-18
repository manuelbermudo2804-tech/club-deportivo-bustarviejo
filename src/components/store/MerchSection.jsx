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
              <p className="text-green-100 text-sm">Bufandas, gorras, tazas, camisetas casuales y artículos exclusivos</p>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-5 space-y-4">
          {/* Aviso importante */}
          <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Info className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-blue-900 text-sm">ℹ️ Tienda gestionada por un proveedor externo</p>
                <p className="text-blue-800 text-sm mt-1">
                  Esta tienda es un servicio externo independiente del club. El CD Bustarviejo <strong>no gestiona pedidos, envíos, devoluciones ni incidencias</strong> de esta tienda.
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
              <strong>📌 Nota:</strong> El club no tiene responsabilidad alguna sobre los productos, plazos de entrega ni calidad de los artículos de merchandising. Para cualquier reclamación, contacta directamente con la tienda online.
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
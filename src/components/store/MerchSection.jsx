import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Gift, UserPlus } from "lucide-react";

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
              <p className="text-green-100 text-sm">Gorras, tazas, llaveros y cientos de artículos del club</p>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed text-center">
            💚 ¡Lleva los colores del <strong>CD Bustarviejo</strong> a todas partes! Ideal para regalar o para el día a día.
          </p>

          {/* Aviso pegado al botón: web externa + registro */}
          {merchUrl ? (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <UserPlus className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-900 text-sm">Tienda externa: necesitas registrarte</p>
                  <p className="text-amber-800 text-xs mt-1 leading-relaxed">
                    Al pulsar el botón se abrirá la <strong>tienda online del proveedor</strong> en una nueva ventana. <strong>Tendrás que crear una cuenta allí</strong> para hacer el pedido. Pedidos, envíos y devoluciones se gestionan con la tienda, no con el club.
                  </p>
                </div>
              </div>
              <a href={merchUrl} target="_blank" rel="noopener noreferrer" className="block">
                <Button size="lg" className="w-full bg-green-600 hover:bg-green-700 gap-2 text-base shadow-lg shadow-green-600/30">
                  <ExternalLink className="w-5 h-5" />
                  Ir a la tienda de merchandising
                </Button>
              </a>
            </div>
          ) : (
            <div className="bg-green-50 border-2 border-dashed border-green-300 rounded-xl p-4 text-center">
              <p className="text-green-700 font-semibold">🔜 Próximamente</p>
              <p className="text-green-600 text-sm mt-1">La tienda de merchandising se abrirá pronto.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
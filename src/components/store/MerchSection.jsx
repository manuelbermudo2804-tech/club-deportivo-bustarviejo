import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Gift, UserPlus } from "lucide-react";

export default function MerchSection({ merchUrl }) {
  return (
    <Card className="overflow-hidden border border-slate-200 shadow-sm rounded-2xl">
      <CardContent className="p-0">
        <div className="bg-slate-800 p-5 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <Gift className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Merchandising del club</h2>
              <p className="text-slate-200 text-sm">Gorras, tazas, llaveros y cientos de artículos del club</p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            Lleva los colores del <strong>CD Bustarviejo</strong> a todas partes. Ideal para regalar o para el día a día.
          </p>

          {merchUrl ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <UserPlus className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-900 text-sm">Tienda externa: necesitas registrarte</p>
                  <p className="text-slate-600 text-sm mt-1 leading-relaxed">
                    Al pulsar el botón se abrirá la <strong>tienda online del proveedor</strong> en una nueva ventana. <strong>Tendrás que crear una cuenta allí</strong> para hacer el pedido. Los pedidos, envíos y devoluciones se gestionan con la tienda, no con el club.
                  </p>
                </div>
              </div>
              <a href={merchUrl} target="_blank" rel="noopener noreferrer" className="block">
                <Button size="lg" className="w-full bg-orange-600 hover:bg-orange-700 gap-2 text-base font-semibold">
                  <ExternalLink className="w-5 h-5" />
                  Ir a la tienda de merchandising
                </Button>
              </a>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
              <p className="text-slate-800 font-semibold">Próximamente</p>
              <p className="text-slate-600 text-sm mt-1">La tienda de merchandising se abrirá pronto.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Star, Ruler, Package, Ban, UserPlus, AlertTriangle, Shirt } from "lucide-react";
import useEquipacionAccess from "@/hooks/useEquipacionAccess";
import EquipacionLocked from "./EquipacionLocked";

export default function EquipacionSection({ clothingUrl }) {
  const { loading, allowed } = useEquipacionAccess();

  if (loading) {
    return (
      <Card className="overflow-hidden border-2 border-orange-200 shadow-lg">
        <CardContent className="p-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-orange-600 border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  if (!allowed) {
    return <EquipacionLocked />;
  }

  return (
    <Card className="overflow-hidden border-2 border-orange-200 shadow-lg">
      <CardContent className="p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-5 text-white">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Star className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">⚽ Equipación Oficial</h2>
              <p className="text-orange-100 text-sm">Pack de entrenamiento obligatorio y prendas técnicas</p>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-5 space-y-4">
          {/* Pack obligatorio — única tarjeta importante arriba */}
          <div className="bg-slate-900 rounded-xl p-4 text-white">
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">👕</span>
              <div>
                <p className="font-bold text-sm">Pack de entrenamiento obligatorio</p>
                <p className="text-slate-300 text-sm mt-1 leading-relaxed">
                  Todos los jugadores necesitan el <strong className="text-orange-400">pack oficial</strong> para entrenamientos y partidos. Consulta el contenido en la tienda.
                </p>
              </div>
            </div>
          </div>

          {/* 3 puntos clave en una fila compacta */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-center">
              <Ruler className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <p className="font-bold text-blue-900 text-[10px] uppercase leading-tight">Tallaje en El Pinarejo</p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-2.5 text-center">
              <Package className="w-5 h-5 text-orange-600 mx-auto mb-1" />
              <p className="font-bold text-orange-900 text-[10px] uppercase leading-tight">Bajo pedido</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-center">
              <Ban className="w-5 h-5 text-red-600 mx-auto mb-1" />
              <p className="font-bold text-red-900 text-[10px] uppercase leading-tight">Sin devoluciones</p>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 text-center -mt-1">
            La equipación se fabrica personalizada · elige bien tu talla
          </p>

          {/* AVISO IMPORTANTE 1: tallaje femenino entallado */}
          <div className="bg-pink-50 border-2 border-pink-400 rounded-xl p-4 animate-pulse-strong">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-6 h-6 text-pink-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-pink-900 text-sm uppercase">⚠️ Camiseta femenina 1ª equipación</p>
                <p className="text-pink-900 text-sm mt-1 leading-relaxed">
                  La camiseta de la <strong>primera equipación femenina</strong> puede pedirse con <strong>corte entallado</strong>. Las opiniones son variadas (a unas personas les queda bien y a otras algo justa), pero en general <strong>talla un poquito menos</strong>. <strong>Ten en cuenta la talla que vas a pedir y, si dudas, elige una talla más grande.</strong>
                </p>
              </div>
            </div>
          </div>

          {/* AVISO IMPORTANTE 2: segunda equipación da menos talla */}
          <div className="bg-red-50 border-2 border-red-400 rounded-xl p-4 animate-pulse-strong">
            <div className="flex items-start gap-2.5">
              <Shirt className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-red-900 text-sm uppercase">⚠️ Segunda equipación: da menos talla</p>
                <p className="text-red-900 text-sm mt-1 leading-relaxed">
                  La camiseta de la <strong>segunda equipación talla más pequeña</strong> que la de la primera. Si pides la segunda equipación, <strong>considera pedir una talla más grande</strong> de la que usas normalmente.
                </p>
              </div>
            </div>
          </div>

          {/* Aviso pegado al botón: web externa + registro */}
          {clothingUrl ? (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <UserPlus className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-900 text-sm">Tienda externa: necesitas registrarte</p>
                  <p className="text-amber-800 text-xs mt-1 leading-relaxed">
                    Al pulsar el botón se abrirá la <strong>web del proveedor oficial</strong> en una nueva ventana. <strong>Tendrás que crear una cuenta allí</strong> (con tu email y contraseña) para poder hacer el pedido. El club no gestiona pedidos ni envíos.
                  </p>
                </div>
              </div>
              <a href={clothingUrl} target="_blank" rel="noopener noreferrer" className="block">
                <Button size="lg" className="w-full bg-orange-600 hover:bg-orange-700 gap-2 text-base shadow-lg shadow-orange-600/30">
                  <ExternalLink className="w-5 h-5" />
                  Ir a la tienda de equipación
                </Button>
              </a>
            </div>
          ) : (
            <div className="bg-orange-50 border-2 border-dashed border-orange-300 rounded-xl p-4 text-center">
              <p className="text-orange-700 font-semibold">🔜 Próximamente</p>
              <p className="text-orange-600 text-sm mt-1">La tienda de equipación se abrirá pronto. Te avisaremos.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Star, AlertTriangle, Ruler, Package, Ban } from "lucide-react";

export default function EquipacionSection({ clothingUrl }) {
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
              <p className="text-orange-100 text-sm">Packs de entrenamiento, térmicas, calcetines, pantalones técnicos y más</p>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-5 space-y-4">
          {/* Invitación */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
            <p className="text-orange-800 text-sm">
              🧡 ¡Equipa a tus jugadores con la mejor imagen! Ropa de entrenamiento de calidad con el escudo del <strong>CD Bustarviejo</strong>.
            </p>
          </div>

          {/* Pack obligatorio */}
          <div className="bg-slate-900 rounded-xl p-4 text-white">
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">👕</span>
              <div>
                <p className="font-bold text-sm">Pack de entrenamiento obligatorio</p>
                <p className="text-slate-300 text-sm mt-1">
                  Todos los jugadores del club necesitan el <strong className="text-orange-400">pack obligatorio oficial</strong> para participar en entrenamientos y partidos. Consulta el contenido del pack en la tienda. Nos ayuda a ir todos iguales y dar la mejor imagen del club.
                </p>
              </div>
            </div>
          </div>

          {/* Aviso importante */}
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900 text-sm">📋 Importante antes de hacer tu pedido</p>
                <p className="text-amber-800 text-sm mt-1">
                  Toda la equipación se <strong>fabrica bajo pedido</strong>. Los artículos con escudo del club y las camisetas sublimadas <strong>no admiten devolución ni cambio</strong>, así que es fundamental elegir bien la talla.
                </p>
              </div>
            </div>
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
              <Ruler className="w-6 h-6 text-blue-600 mx-auto mb-1.5" />
              <p className="font-bold text-blue-900 text-xs">TALLAJE EN EL CAMPO</p>
              <p className="text-blue-700 text-[11px] mt-1">
                Habrá jornadas de tallaje en el campo de fútbol El Pinarejo. ¡Imprescindible probarse!
              </p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
              <Package className="w-6 h-6 text-orange-600 mx-auto mb-1.5" />
              <p className="font-bold text-orange-900 text-xs">FABRICACIÓN BAJO PEDIDO</p>
              <p className="text-orange-700 text-[11px] mt-1">
                Cada prenda se fabrica expresamente para ti. Asegúrate de elegir bien tu talla.
              </p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
              <Ban className="w-6 h-6 text-red-600 mx-auto mb-1.5" />
              <p className="font-bold text-red-900 text-xs">SIN DEVOLUCIONES</p>
              <p className="text-red-700 text-[11px] mt-1">
                Los productos personalizados con escudo no se pueden devolver ni cambiar.
              </p>
            </div>
          </div>

          {/* Nota aclaratoria */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong>📌 Nota:</strong> La tienda de equipación está gestionada por nuestro proveedor oficial. El CD Bustarviejo facilita el acceso, pero la venta, fabricación y envío es responsabilidad del proveedor. Ante cualquier duda sobre tallas, acude a las jornadas de tallaje en El Pinarejo.
            </p>
          </div>

          {/* Botón */}
          <div className="text-center pt-1">
            {clothingUrl ? (
              <a href={clothingUrl} target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="bg-orange-600 hover:bg-orange-700 gap-2 text-base px-8 shadow-lg shadow-orange-600/30">
                  <ExternalLink className="w-5 h-5" />
                  Ir a la tienda de equipación
                </Button>
              </a>
            ) : (
              <div className="bg-orange-50 border-2 border-dashed border-orange-300 rounded-xl p-4">
                <p className="text-orange-700 font-semibold">🔜 Próximamente</p>
                <p className="text-orange-600 text-sm mt-1">La tienda de equipación se abrirá pronto. Te avisaremos.</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
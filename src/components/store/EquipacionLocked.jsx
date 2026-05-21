import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, UserPlus, Shirt } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function EquipacionLocked() {
  return (
    <Card className="overflow-hidden border-2 border-slate-200 shadow-lg">
      <CardContent className="p-0">
        <div className="bg-gradient-to-r from-slate-700 to-slate-900 p-5 text-white">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
              <Shirt className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Lock className="w-5 h-5" /> Tienda de Equipación
              </h2>
              <p className="text-slate-300 text-sm">Reservada para familias con jugadores inscritos</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-amber-900 font-semibold text-sm">
              🔒 Para acceder a la tienda de equipación oficial, primero necesitas tener al menos un jugador activo inscrito en el club.
            </p>
            <p className="text-amber-800 text-sm mt-2">
              La equipación es para uso de los jugadores del CD Bustarviejo en entrenamientos y partidos. Una vez completes la inscripción, podrás acceder y hacer tu pedido.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-sm text-slate-700">
              <strong>¿Ya estás inscrito y ves este mensaje?</strong> Puede que tu inscripción aún esté en revisión o que el email con el que iniciaste sesión no coincida con el registrado. Contacta con el club si necesitas ayuda.
            </p>
          </div>

          <div className="text-center pt-1">
            <Link to={createPageUrl("ParentPlayers")}>
              <Button size="lg" className="bg-orange-600 hover:bg-orange-700 gap-2 text-base px-8 shadow-lg shadow-orange-600/30">
                <UserPlus className="w-5 h-5" />
                Inscribir jugador
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
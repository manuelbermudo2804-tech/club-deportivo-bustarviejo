import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, UserPlus } from "lucide-react";
import SorteoCountdown from "./SorteoCountdown";

/**
 * Cabecera del programa "Trae un socio amigo": explica en dos líneas cómo
 * participar y recuerda que CUALQUIERA puede hacerse socio.
 */
export default function ReferralIntroCard({ precio = 25, premio, premioFoto, sorteoFecha, sorteoLugar, onQuieroSerSocio }) {
  return (
    <Card className="border-none shadow-lg overflow-hidden bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600">
      <CardContent className="p-5 text-white">
        <div className="flex items-start gap-4">
          {premioFoto ? (
            <img src={premioFoto} alt={premio || "Premio"} className="w-16 h-16 rounded-xl object-cover border-2 border-white/70 flex-shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Gift className="w-7 h-7 text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-black leading-tight">
              Trae un socio amigo{premio ? ` y gana ${premio}` : ""}
            </h2>
            <p className="text-white/90 text-sm mt-1">
              Por cada persona que se haga socia con tu invitación consigues una papeleta para el sorteo.
            </p>
            <p className="text-white/90 text-sm mt-2">
              <strong>Cualquiera puede ser socio</strong>: tu pareja, abuelos, tíos, vecinos o amigos. Solo {precio}€ por temporada.
            </p>
          </div>
        </div>

        <SorteoCountdown fecha={sorteoFecha} lugar={sorteoLugar} />

        {onQuieroSerSocio && (
          <Button
            onClick={onQuieroSerSocio}
            className="mt-4 w-full bg-white text-orange-700 hover:bg-amber-50 font-bold py-6"
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Quiero ser socio / apuntar a alguien
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
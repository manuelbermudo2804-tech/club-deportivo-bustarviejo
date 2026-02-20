import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import MinorAccessDialog from "./MinorAccessDialog";

const calcularEdad = (fechaNac) => {
  if (!fechaNac) return null;
  const hoy = new Date();
  const nacimiento = new Date(fechaNac);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return edad;
};

export default function MinorAccessBanner({ players, user }) {
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Filtrar jugadores elegibles: 13-17 años, sin acceso menor ya autorizado ni revocado
  const elegibles = (players || []).filter((p) => {
    const edad = calcularEdad(p.fecha_nacimiento);
    return (
      edad >= 13 &&
      edad < 18 &&
      !p.acceso_menor_autorizado &&
      !p.acceso_menor_revocado &&
      !p.es_mayor_edad &&
      p.activo !== false
    );
  });

  if (elegibles.length === 0) return null;

  return (
    <>
      <Card className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 border-2 border-green-300 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-green-900 text-base mb-1">
                ⚽ ¡Acceso Juvenil Disponible!
              </h3>
              <p className="text-sm text-green-800 mb-3">
                {elegibles.length === 1
                  ? `${elegibles[0].nombre?.split(" ")[0]} ya tiene ${calcularEdad(elegibles[0].fecha_nacimiento)} años y puede acceder a la app del club.`
                  : `${elegibles.length} de tus jugadores ya pueden acceder a la app del club.`}
              </p>
              <div className="flex flex-wrap gap-2">
                {elegibles.map((player) => (
                  <Button
                    key={player.id}
                    size="sm"
                    onClick={() => {
                      setSelectedPlayer(player);
                      setDialogOpen(true);
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs"
                  >
                    Activar para {player.nombre?.split(" ")[0]} ({calcularEdad(player.fecha_nacimiento)} años)
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedPlayer && (
        <MinorAccessDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setSelectedPlayer(null);
          }}
          player={selectedPlayer}
          parentUser={user}
        />
      )}
    </>
  );
}
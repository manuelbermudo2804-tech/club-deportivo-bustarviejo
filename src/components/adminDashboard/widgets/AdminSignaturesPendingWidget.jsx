import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSignature, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

function calcularEdad(fechaNac) {
  if (!fechaNac) return null;
  const hoy = new Date();
  const nacimiento = new Date(fechaNac);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return edad;
}

export default function AdminSignaturesPendingWidget() {
  const { data: players = [], isLoading } = useQuery({
    queryKey: ["adminSignaturesPendingWidget"],
    queryFn: async () => {
      const all = await base44.entities.Player.list("-updated_date", 1000);
      return all.filter(p => p.activo);
    },
    staleTime: 60000,
  });

  const pending = React.useMemo(() => {
    let count = 0;
    players.forEach(player => {
      const hasJugador = !!player.enlace_firma_jugador;
      const hasTutor = !!player.enlace_firma_tutor;
      const okJugador = player.firma_jugador_completada === true;
      const okTutor = player.firma_tutor_completada === true;
      const mayor = (calcularEdad(player.fecha_nacimiento) || 0) >= 18;
      if (hasJugador && !okJugador) count++;
      if (hasTutor && !okTutor && !mayor) count++;
    });
    return count;
  }, [players]);

  return (
    <Card className="bg-white/90 border-slate-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-600 to-orange-600 text-white flex items-center justify-center">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <p className="text-slate-900 font-bold">Firmas pendientes</p>
              <p className="text-slate-500 text-sm">Federación</p>
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900">{isLoading ? "…" : pending}</div>
        </div>
        <div className="mt-3 flex justify-end">
          <Link to={createPageUrl("FederationSignaturesAdmin")}>
            <Button variant="outline" className="gap-1">
              Abrir <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
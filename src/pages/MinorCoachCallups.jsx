import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, MapPin, Clock, ShieldAlert } from "lucide-react";
import { AVISO_PRACTICAS } from "@/components/practicas/permisosPracticas";

export default function MinorCoachCallups() {
  const [user, setUser] = useState(null);
  useEffect(() => { base44.auth.me().then(setUser); }, []);

  const { data: player } = useQuery({
    queryKey: ["practicasPlayer", user?.email],
    queryFn: async () => {
      const players = await base44.entities.Player.filter({ acceso_menor_email: user.email, activo: true });
      return players[0] || null;
    },
    enabled: !!user?.email,
  });

  const permisos = player?.entrenador_practicas || {};
  const categoria = permisos.categoria || player?.categoria_principal || player?.deporte;
  const puedeVer = permisos.activo === true && permisos.ver_convocatorias === true;
  const verNombres = permisos.ver_nombres_convocatoria === true;

  const { data: callups = [], isLoading } = useQuery({
    queryKey: ["practicasCallups", categoria],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const all = await base44.entities.Convocatoria.filter({ categoria }, "-fecha_partido", 30);
      return all.filter((c) => c.publicada && c.fecha_partido >= today).reverse();
    },
    enabled: puedeVer && !!categoria,
  });

  if (!user || (player === undefined)) {
    return <div className="p-8 text-center text-slate-400">Cargando…</div>;
  }

  if (!puedeVer) {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <Card className="border-none shadow-lg">
          <CardContent className="p-6 text-center">
            <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-semibold">No tienes acceso a esta sección</p>
            <p className="text-sm text-slate-500 mt-1">Habla con tu entrenador o con el club.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-3 pb-24">
      <div className="flex items-center gap-2">
        <ClipboardList className="w-6 h-6 text-green-600" />
        <h1 className="text-xl font-black text-slate-900">Convocatorias del equipo</h1>
      </div>
      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
        👀 Solo lectura · {AVISO_PRACTICAS}
      </p>

      {isLoading && <p className="text-sm text-slate-400">Cargando convocatorias…</p>}

      {!isLoading && callups.length === 0 && (
        <Card className="border-none shadow-lg">
          <CardContent className="p-6 text-center text-slate-500 text-sm">
            No hay convocatorias publicadas próximamente.
          </CardContent>
        </Card>
      )}

      {callups.map((c) => {
        const jugadores = c.jugadores_convocados || [];
        const asisten = jugadores.filter((j) => j.confirmacion === "asistire").length;
        const noAsisten = jugadores.filter((j) => j.confirmacion === "no_asistire").length;
        const pendientes = jugadores.length - asisten - noAsisten;
        return (
          <Card key={c.id} className="border-none shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-slate-900">{c.titulo}</h3>
                <Badge className="bg-slate-800 text-white border-none text-[10px] flex-shrink-0">
                  {new Date(c.fecha_partido).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {c.hora_partido}{c.hora_concentracion ? ` (cita ${c.hora_concentracion})` : ""}</span>
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {c.ubicacion}</span>
              </div>
              <div className="flex gap-2 mt-3">
                <Badge className="bg-green-100 text-green-800 border-none text-xs">✅ {asisten}</Badge>
                <Badge className="bg-red-100 text-red-800 border-none text-xs">❌ {noAsisten}</Badge>
                <Badge className="bg-slate-100 text-slate-700 border-none text-xs">⏳ {pendientes}</Badge>
              </div>

              {verNombres && jugadores.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                  {jugadores.map((j, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700 truncate">{j.jugador_nombre}</span>
                      <span className="text-xs flex-shrink-0">
                        {j.confirmacion === "asistire" ? "✅" : j.confirmacion === "no_asistire" ? "❌" : j.confirmacion === "duda" ? "❓" : "⏳"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
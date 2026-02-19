import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle, Calendar, CreditCard, FileSignature, ChevronRight } from "lucide-react";

function getWeekRange() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday, startStr: monday.toISOString().split("T")[0], endStr: sunday.toISOString().split("T")[0] };
}

export default function WeeklySummaryCard({ player, payments, callups, user }) {
  const week = getWeekRange();

  // Asistencia de esta semana para este jugador
  const { data: attendances = [] } = useQuery({
    queryKey: ["weeklyAttendance", player.id, week.startStr],
    queryFn: async () => {
      const cats = [player.categoria_principal, ...(player.categorias || [])].filter(Boolean);
      if (cats.length === 0) return [];
      const all = await base44.entities.Attendance.filter({ fecha: { $gte: week.startStr, $lte: week.endStr } });
      return all.filter(a => cats.includes(a.categoria));
    },
    staleTime: 300000,
    enabled: !!player.id,
  });

  // Calcular asistencia del jugador esta semana
  let totalSessions = 0;
  let attended = 0;
  attendances.forEach((att) => {
    const entry = att.asistencias?.find((a) => a.jugador_id === player.id);
    if (entry) {
      totalSessions++;
      if (entry.estado === "presente" || entry.estado === "tardanza") attended++;
    }
  });

  // Próximo partido (convocatoria publicada futura)
  const today = new Date().toISOString().split("T")[0];
  const nextCallup = callups
    ?.filter((c) => c.publicada && !c.cerrada && c.fecha_partido >= today && c.jugadores_convocados?.some((j) => j.jugador_id === player.id))
    .sort((a, b) => a.fecha_partido.localeCompare(b.fecha_partido))[0];

  const myCallupEntry = nextCallup?.jugadores_convocados?.find((j) => j.jugador_id === player.id);

  // Pagos pendientes de este jugador
  const pendingPayments = payments?.filter((p) => p.jugador_id === player.id && p.estado === "Pendiente" && p.is_deleted !== true).length || 0;

  // Firmas pendientes
  const calcEdad = (f) => { if (!f) return 0; const h = new Date(), n = new Date(f); let e = h.getFullYear() - n.getFullYear(); const m = h.getMonth() - n.getMonth(); if (m < 0 || (m === 0 && h.getDate() < n.getDate())) e--; return e; };
  let pendingSignatures = 0;
  if (player.enlace_firma_jugador && !player.firma_jugador_completada) pendingSignatures++;
  if (player.enlace_firma_tutor && !player.firma_tutor_completada && calcEdad(player.fecha_nacimiento) < 18) pendingSignatures++;

  const allGood = pendingPayments === 0 && pendingSignatures === 0 && (!myCallupEntry || myCallupEntry.confirmacion !== "pendiente");

  return (
    <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 overflow-hidden">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-3">
          {player.foto_url ? (
            <img src={player.foto_url} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-orange-500" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold text-sm">
              {player.nombre?.charAt(0)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm truncate">{player.nombre}</p>
            <p className="text-slate-400 text-xs truncate">{player.categoria_principal || player.deporte}</p>
          </div>
          {allGood && <span className="text-green-400 text-lg">✅</span>}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-2">
          {/* Asistencia semana */}
          <div className="bg-slate-700/50 rounded-lg p-2 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
              <span className="text-[10px] text-slate-400 uppercase">Asistencia</span>
            </div>
            {totalSessions > 0 ? (
              <p className="text-white font-bold text-lg">{attended}/{totalSessions}</p>
            ) : (
              <p className="text-slate-500 text-xs">Sin sesiones</p>
            )}
          </div>

          {/* Pagos */}
          <div className={`rounded-lg p-2 text-center ${pendingPayments > 0 ? "bg-red-900/30" : "bg-slate-700/50"}`}>
            <div className="flex items-center justify-center gap-1 mb-1">
              <CreditCard className="w-3.5 h-3.5 text-green-400" />
              <span className="text-[10px] text-slate-400 uppercase">Pagos</span>
            </div>
            {pendingPayments > 0 ? (
              <p className="text-red-400 font-bold text-sm">{pendingPayments} pendiente{pendingPayments > 1 ? "s" : ""}</p>
            ) : (
              <p className="text-green-400 font-bold text-sm">Al día ✓</p>
            )}
          </div>
        </div>

        {/* Próximo partido */}
        {nextCallup && (
          <Link to={createPageUrl("ParentCallups")} className="block">
            <div className={`rounded-lg p-2.5 flex items-center gap-2 ${myCallupEntry?.confirmacion === "pendiente" ? "bg-yellow-900/30 border border-yellow-600/50 animate-pulse" : "bg-blue-900/20 border border-blue-600/30"}`}>
              <Calendar className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">
                  {nextCallup.tipo === "Partido" ? `⚽ ${nextCallup.rival || "Partido"}` : nextCallup.titulo}
                </p>
                <p className="text-slate-400 text-[10px]">
                  {new Date(nextCallup.fecha_partido).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })}
                  {nextCallup.hora_partido ? ` · ${nextCallup.hora_partido}` : ""}
                </p>
              </div>
              {myCallupEntry?.confirmacion === "pendiente" ? (
                <span className="text-yellow-400 text-[10px] font-bold bg-yellow-900/50 px-2 py-0.5 rounded">CONFIRMAR</span>
              ) : myCallupEntry?.confirmacion === "asistire" ? (
                <span className="text-green-400 text-[10px]">✓ Confirmado</span>
              ) : null}
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            </div>
          </Link>
        )}

        {/* Firmas pendientes */}
        {pendingSignatures > 0 && (
          <Link to={createPageUrl("FederationSignatures")}>
            <div className="bg-orange-900/30 border border-orange-600/50 rounded-lg p-2.5 flex items-center gap-2">
              <FileSignature className="w-4 h-4 text-orange-400" />
              <p className="text-orange-300 text-xs font-medium flex-1">{pendingSignatures} firma{pendingSignatures > 1 ? "s" : ""} pendiente{pendingSignatures > 1 ? "s" : ""}</p>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            </div>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
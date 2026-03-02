import React, { useState, useCallback, useMemo } from "react";
import { CheckCircle2, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function PlayerTile({ player, status, horaCheckin, onTap }) {
  const initials = (player.nombre || "").split(" ").map(n => n[0]).join("").substring(0, 2);
  
  const bgColor = status === 'presente' 
    ? 'bg-green-100 border-green-400 ring-2 ring-green-500' 
    : status === 'tardanza' 
    ? 'bg-yellow-100 border-yellow-400 ring-2 ring-yellow-500' 
    : 'bg-white border-slate-200 hover:bg-slate-50 active:scale-95';

  const icon = status === 'presente' 
    ? <CheckCircle2 className="w-5 h-5 text-green-600" /> 
    : status === 'tardanza' 
    ? <Clock className="w-5 h-5 text-yellow-600" /> 
    : null;

  return (
    <button
      onClick={() => onTap(player)}
      className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all duration-150 ${bgColor} min-h-[130px]`}
    >
      {icon && (
        <div className="absolute top-2 right-2">{icon}</div>
      )}
      {player.foto_url ? (
        <img 
          src={player.foto_url} 
          alt={player.nombre} 
          className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md"
        />
      ) : (
        <div className="w-16 h-16 rounded-full bg-slate-300 flex items-center justify-center text-white font-bold text-lg shadow-md">
          {initials}
        </div>
      )}
      <span className="mt-2 text-xs font-semibold text-slate-800 text-center leading-tight line-clamp-2">
        {player.nombre}
      </span>
      {horaCheckin && (
        <span className="text-[10px] text-slate-500 mt-0.5">{horaCheckin}</span>
      )}
    </button>
  );
}

export default function CheckinGrid({ 
  players, 
  sessionData, 
  trainingStartTime,
  minutesTardanza = 10,
  onCheckin 
}) {
  const [lastCheckin, setLastCheckin] = useState(null);

  const handleTap = useCallback((player) => {
    const now = new Date();
    const horaCheckin = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    // Determinar si es tardanza
    let estado = 'presente';
    if (trainingStartTime) {
      const [h, m] = trainingStartTime.split(':').map(Number);
      const startDate = new Date();
      startDate.setHours(h, m + minutesTardanza, 0, 0);
      if (now > startDate) {
        estado = 'tardanza';
      }
    }

    // Si ya tiene check-in, quitarlo (toggle)
    const currentStatus = sessionData[player.id]?.asistencia;
    if (currentStatus === 'presente' || currentStatus === 'tardanza') {
      onCheckin(player.id, null, null); // Desmarcar
      setLastCheckin(null);
      return;
    }

    onCheckin(player.id, estado, horaCheckin);
    setLastCheckin({ nombre: player.nombre, estado, hora: horaCheckin });
    
    if (estado === 'tardanza') {
      toast(`⏰ ${player.nombre} — Tardanza (${horaCheckin})`);
    } else {
      toast.success(`✅ ${player.nombre} — Presente (${horaCheckin})`);
    }
  }, [sessionData, trainingStartTime, minutesTardanza, onCheckin]);

  const stats = useMemo(() => {
    let presente = 0, tardanza = 0, sinMarcar = 0;
    players.forEach(p => {
      const s = sessionData[p.id]?.asistencia;
      if (s === 'presente') presente++;
      else if (s === 'tardanza') tardanza++;
      else sinMarcar++;
    });
    return { presente, tardanza, sinMarcar, total: players.length };
  }, [players, sessionData]);

  return (
    <div className="space-y-3">
      {/* Banner informativo */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📲</span>
          <div>
            <p className="font-bold text-sm">Modo Check-in Activo</p>
            <p className="text-xs text-blue-100">Los jugadores tocan su foto al llegar</p>
          </div>
        </div>
        <div className="flex gap-3 text-xs">
          <div className="text-center">
            <div className="text-lg font-bold">{stats.presente}</div>
            <div className="text-blue-200">✅</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">{stats.tardanza}</div>
            <div className="text-blue-200">⏰</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">{stats.sinMarcar}</div>
            <div className="text-blue-200">⬜</div>
          </div>
        </div>
      </div>

      {/* Hora de entrenamiento */}
      {trainingStartTime && (
        <div className="text-center text-xs text-slate-500">
          Hora inicio: <strong>{trainingStartTime}</strong> · Tardanza después de <strong>{minutesTardanza} min</strong>
        </div>
      )}

      {/* Cuadrícula de fotos */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
        {players.map((player) => (
          <PlayerTile
            key={player.id}
            player={player}
            status={sessionData[player.id]?.asistencia}
            horaCheckin={sessionData[player.id]?.hora_checkin}
            onTap={handleTap}
          />
        ))}
      </div>

      {/* Último check-in */}
      {lastCheckin && (
        <div className={`text-center py-2 rounded-lg text-sm font-medium ${lastCheckin.estado === 'tardanza' ? 'bg-yellow-50 text-yellow-800' : 'bg-green-50 text-green-800'}`}>
          Último: {lastCheckin.nombre} — {lastCheckin.estado === 'tardanza' ? '⏰ Tardanza' : '✅ Presente'} ({lastCheckin.hora})
        </div>
      )}
    </div>
  );
}
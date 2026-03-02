import React, { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";

function PlayerTile({ player, status, horaCheckin, onTap }) {
  const initials = (player.nombre || "").split(" ").map(n => n[0]).join("").substring(0, 2);
  
  // Ya fichó → no se puede desmarcar
  const isChecked = status === 'presente' || status === 'tardanza';

  const bgColor = status === 'presente' 
    ? 'bg-green-100 border-green-400 ring-2 ring-green-500' 
    : status === 'tardanza' 
    ? 'bg-orange-100 border-orange-400 ring-2 ring-orange-500' 
    : 'bg-white border-slate-200 active:scale-95 active:bg-blue-50';

  const emoji = status === 'presente' 
    ? '😊' 
    : status === 'tardanza' 
    ? '😅' 
    : null;

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isChecked) {
      onTap(player);
    }
  };

  return (
    <div
      role="button"
      onClick={handleClick}
      className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all duration-150 ${bgColor} min-h-[140px] select-none ${isChecked ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
    >
      {emoji && (
        <div className="absolute top-1 right-1 text-2xl">{emoji}</div>
      )}
      {player.foto_url ? (
        <img 
          src={player.foto_url} 
          alt={player.nombre} 
          className={`w-18 h-18 rounded-full object-cover border-3 shadow-md ${isChecked ? 'border-green-400' : 'border-white'}`}
          style={{ width: 72, height: 72 }}
        />
      ) : (
        <div className="flex items-center justify-center rounded-full bg-slate-300 text-white font-bold text-xl shadow-md" style={{ width: 72, height: 72 }}>
          {initials}
        </div>
      )}
      <span className="mt-2 text-xs font-semibold text-slate-800 text-center leading-tight line-clamp-2">
        {player.nombre}
      </span>
      {horaCheckin && (
        <span className="text-[10px] text-slate-500 mt-0.5">{horaCheckin}</span>
      )}
    </div>
  );
}

export default function CheckinGrid({ 
  players, 
  sessionData, 
  trainingStartTime,
  minutesTardanza = 10,
  onCheckin,
  categoryName
}) {
  const [lastCheckin, setLastCheckin] = useState(null);

  const handleTap = useCallback((player) => {
    // No permitir desmarcar
    const currentStatus = sessionData[player.id]?.asistencia;
    if (currentStatus === 'presente' || currentStatus === 'tardanza') return;

    const now = new Date();
    const horaCheckin = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    let estado = 'presente';
    if (trainingStartTime) {
      const [h, m] = trainingStartTime.split(':').map(Number);
      const startDate = new Date();
      startDate.setHours(h, m + minutesTardanza, 0, 0);
      if (now > startDate) {
        estado = 'tardanza';
      }
    }

    onCheckin(player.id, estado, horaCheckin);
    setLastCheckin({ nombre: player.nombre, estado, hora: horaCheckin });
    
    if (estado === 'tardanza') {
      toast(`😅 ${player.nombre} — Tardanza (${horaCheckin})`);
    } else {
      toast.success(`😊 ${player.nombre} — ¡A tiempo! (${horaCheckin})`);
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
      {/* Banner info */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚽</span>
          <div>
            <p className="font-bold text-sm">{categoryName || 'Fichaje'}</p>
            <p className="text-xs text-blue-100">
              {trainingStartTime ? `Entreno: ${trainingStartTime}` : 'Toca tu foto al llegar'}
            </p>
          </div>
        </div>
        <div className="flex gap-4 text-sm">
          <div className="text-center">
            <div className="text-xl font-bold">{stats.presente}</div>
            <div className="text-blue-200">😊</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold">{stats.tardanza}</div>
            <div className="text-blue-200">😅</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold">{stats.sinMarcar}</div>
            <div className="text-blue-200">⬜</div>
          </div>
        </div>
      </div>

      {/* Grid de jugadores */}
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
        <div className={`text-center py-2 rounded-lg text-sm font-medium ${lastCheckin.estado === 'tardanza' ? 'bg-orange-50 text-orange-800' : 'bg-green-50 text-green-800'}`}>
          Último: {lastCheckin.nombre} — {lastCheckin.estado === 'tardanza' ? '😅 Tardanza' : '😊 ¡A tiempo!'} ({lastCheckin.hora})
        </div>
      )}
    </div>
  );
}
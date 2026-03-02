import React, { memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, Mail } from "lucide-react";

const ESTADOS = [
  { value: 'presente', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100', label: 'Presente' },
  { value: 'ausente', icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Ausente' },
  { value: 'justificado', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Justificado' },
  { value: 'tardanza', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-100', label: 'Tardanza' }
];

const ACTITUDES = [1, 2, 3, 4, 5];

// Componente LIGERO para foto con lazy loading
const PlayerPhoto = memo(({ nombre, foto_url, lesionado, sancionado }) => (
  <div className="relative flex-shrink-0">
    {foto_url ? (
      <img src={foto_url} className="w-11 h-11 rounded-full object-cover" alt="" loading="lazy" decoding="async" />
    ) : (
      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm">
        {nombre.charAt(0)}
      </div>
    )}
    {lesionado && <span className="absolute -top-1 -right-1 text-[10px]">🏥</span>}
    {sancionado && <span className="absolute -bottom-1 -right-1 text-[10px]">🟥</span>}
  </div>
));

// Historial mini con dots simples (sin emojis pesados en Android viejo)
const MiniHistory = memo(({ history }) => {
  if (!history?.length) return null;
  return (
    <div className="flex items-center gap-0.5 ml-1">
      {history.map((s, i) => (
        <span key={i} className={`w-2 h-2 rounded-full inline-block ${
          s.estado === 'presente' ? 'bg-green-500' : 
          s.estado === 'tardanza' ? 'bg-yellow-500' : 
          s.estado === 'justificado' ? 'bg-blue-500' : 'bg-red-500'
        }`} />
      ))}
    </div>
  );
});

// Botones de actitud simples (sin Select que es pesado)
const ActitudButtons = memo(({ value, onChange }) => (
  <div className="flex gap-1">
    {ACTITUDES.map(n => (
      <button
        key={n}
        onClick={() => onChange(n)}
        className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
          value === n 
            ? 'bg-yellow-400 text-yellow-900 ring-2 ring-yellow-500 ring-offset-1' 
            : 'bg-slate-100 text-slate-400 active:bg-slate-200'
        }`}
      >
        {n}
      </button>
    ))}
  </div>
));

function PlayerAttendanceRow({ player, data, history, onChange, onReport }) {
  const isPresent = data?.asistencia === 'presente' || data?.asistencia === 'tardanza';

  const handleEstado = useCallback((value) => {
    onChange(player.id, 'asistencia', value);
  }, [player.id, onChange]);

  const handleActitud = useCallback((value) => {
    onChange(player.id, 'actitud', value);
  }, [player.id, onChange]);

  const handleObs = useCallback((e) => {
    onChange(player.id, 'observaciones', e.target.value);
  }, [player.id, onChange]);

  const handleReport = useCallback(() => {
    onReport(player);
  }, [player, onReport]);

  return (
    <div className="bg-white rounded-xl shadow-sm p-3 space-y-2 border border-slate-100">
      {/* Header compacto */}
      <div className="flex items-center gap-2">
        <PlayerPhoto 
          nombre={player.nombre} 
          foto_url={player.foto_url} 
          lesionado={player.lesionado} 
          sancionado={player.sancionado} 
        />
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-sm block truncate">{player.nombre}</span>
          <div className="flex items-center gap-1 flex-wrap">
            {player.lesionado && <span className="text-[9px] bg-red-100 text-red-700 px-1 rounded">Lesión</span>}
            {player.sancionado && <span className="text-[9px] bg-yellow-100 text-yellow-700 px-1 rounded">Sanción</span>}
            <MiniHistory history={history} />
          </div>
        </div>
      </div>

      {/* Asistencia - botones grandes para táctil */}
      <div className="grid grid-cols-4 gap-1.5">
        {ESTADOS.map(({ value, icon: Icon, color, bg, label }) => {
          const isSelected = data?.asistencia === value;
          return (
            <button
              key={value}
              onClick={() => handleEstado(value)}
              className={`p-2.5 rounded-lg flex flex-col items-center gap-0.5 transition-colors ${
                isSelected ? `${bg} ${color} ring-2 ring-offset-1` : 'bg-slate-50 text-slate-400 active:bg-slate-100'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] font-medium leading-none">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Evaluación - solo si presente */}
      {isPresent && (
        <div className="flex items-center gap-3 pt-1">
          <span className="text-xs text-slate-500 whitespace-nowrap">Actitud:</span>
          <ActitudButtons value={data?.actitud} onChange={handleActitud} />
        </div>
      )}

      {/* Observaciones - solo si presente */}
      {isPresent && (
        <input
          type="text"
          value={data?.observaciones || ""}
          onChange={handleObs}
          placeholder="Notas..."
          className="w-full h-8 px-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      )}

      {/* Reporte - botón simple */}
      <button
        onClick={handleReport}
        className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-500 py-1.5 rounded-lg border border-slate-200 active:bg-slate-50"
      >
        <Mail className="w-3.5 h-3.5" />
        Enviar reporte privado
      </button>
    </div>
  );
}

export default memo(PlayerAttendanceRow);
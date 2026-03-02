import React, { useState, useEffect } from "react";

const CLUB_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

export default function TabletIdleScreen({ todaySchedules = [], nextSession }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeStr = time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const dateStr = time.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-8 select-none">
      {/* Logo y reloj */}
      <img src={CLUB_LOGO_URL} alt="Club" className="w-28 h-28 rounded-2xl shadow-2xl mb-6 object-cover" />
      <div className="text-8xl font-black text-white tracking-tight mb-2">{timeStr}</div>
      <div className="text-xl text-slate-400 capitalize mb-12">{dateStr}</div>

      {/* Próximos entrenamientos hoy */}
      {todaySchedules.length > 0 ? (
        <div className="w-full max-w-lg">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 text-center">
            Entrenamientos de hoy
          </h2>
          <div className="space-y-2">
            {todaySchedules.map((s, i) => {
              const isNext = nextSession && nextSession.categoria === s.categoria && nextSession.hora_inicio === s.hora_inicio;
              return (
                <div
                  key={i}
                  className={`flex items-center justify-between px-5 py-3 rounded-xl transition-all ${
                    isNext
                      ? 'bg-green-600/20 border-2 border-green-500 text-green-300'
                      : s._passed
                        ? 'bg-slate-800/50 text-slate-600'
                        : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  <span className="font-semibold">{s.categoria}</span>
                  <span className="text-sm font-mono">{s.hora_inicio} - {s.hora_fin}</span>
                </div>
              );
            })}
          </div>
          {nextSession && (
            <div className="text-center mt-6 text-green-400 text-sm animate-pulse">
              ⏳ Fichaje se abre automáticamente a las {nextSession._openTime}
            </div>
          )}
        </div>
      ) : (
        <div className="text-slate-600 text-lg">No hay entrenamientos programados hoy</div>
      )}
    </div>
  );
}
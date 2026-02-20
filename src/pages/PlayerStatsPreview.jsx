import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PlayerStatsPreview() {
  // Datos de ejemplo simulados para previsualizar cómo se ve el widget
  const exampleStatsCompact = [
    { icon: "⚽", label: "Goles", value: 7, color: "text-green-700 bg-green-50 border-green-200" },
    { icon: "🏟️", label: "Partidos", value: "12/14", color: "text-blue-700 bg-blue-50 border-blue-200" },
    { icon: "⭐", label: "Evaluación", value: "4.2/5", color: "text-yellow-700 bg-yellow-50 border-yellow-200" },
    { icon: "📋", label: "Entrenamientos", value: "38/42", color: "text-purple-700 bg-purple-50 border-purple-200" },
    { icon: "🔥", label: "Racha", value: "8 seguidos", color: "text-orange-700 bg-orange-50 border-orange-200" },
    { icon: "💳", label: "Pagos", value: "Al día ✅", color: "text-green-700 bg-green-50 border-green-200" },
    { icon: "🏅", label: "Antigüedad", value: "3 temp.", color: "text-slate-700 bg-slate-50 border-slate-200" },
    { icon: "🎂", label: "Cumpleaños", value: "En 12 días", color: "text-pink-700 bg-pink-50 border-pink-200" },
  ];

  const exampleStatsExpanded = [...exampleStatsCompact];

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-slate-900">📊 Preview: Panel de Estadísticas del Jugador</h1>
        <p className="text-slate-600 mt-2">Así se verá el nuevo widget con datos de ejemplo</p>
      </div>

      {/* ========== VERSIÓN COMPACTA (dentro de PlayerCard para padres) ========== */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-3">📱 Versión Compacta (Tarjeta de Padre)</h2>
        <p className="text-sm text-slate-500 mb-4">Se muestra dentro de la ficha de cada jugador en "Mis Jugadores"</p>
        
        <Card className="border-none shadow-lg bg-white/90 max-w-sm">
          <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl">⚽</div>
              <div>
                <h3 className="font-bold text-lg">Pablo García López</h3>
                <div className="flex gap-2 mt-1">
                  <Badge className="bg-white/20 text-white text-xs">Fútbol Cadete</Badge>
                  <Badge className="bg-green-500 text-white text-xs">Delantero</Badge>
                </div>
              </div>
            </div>
          </div>
          <CardContent className="p-4 space-y-3">
            {/* Widget compacto */}
            <div className="grid grid-cols-4 gap-1.5">
              {exampleStatsCompact.slice(0, 4).map((stat, i) => (
                <div key={i} className={`rounded-lg border p-1.5 text-center ${stat.color}`}>
                  <div className="text-base leading-none">{stat.icon}</div>
                  <div className="text-xs font-bold mt-0.5">{stat.value}</div>
                  <div className="text-[10px] opacity-70">{stat.label}</div>
                </div>
              ))}
              {exampleStatsCompact.slice(4).map((stat, i) => (
                <div key={i + 4} className={`rounded-lg border p-1.5 text-center ${stat.color}`}>
                  <div className="text-base leading-none">{stat.icon}</div>
                  <div className="text-xs font-bold mt-0.5">{stat.value}</div>
                  <div className="text-[10px] opacity-70">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Checklist simulado */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
              <span className="text-xs text-green-700 font-medium">✅ Ficha completa (4/4)</span>
            </div>

            {/* Próximo partido simulado */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs font-bold text-blue-900">🏆 Próximo partido</p>
              <p className="text-sm text-blue-800 font-medium mt-1">vs CD Miraflores — Sáb 22 Feb, 10:00</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ========== VERSIÓN EXPANDIDA (dentro de PlayerProfile para +18) ========== */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-3">🖥️ Versión Expandida (Perfil Jugador +18)</h2>
        <p className="text-sm text-slate-500 mb-4">Se muestra en la página de perfil personal del jugador adulto</p>

        <Card className="border-0 shadow-lg max-w-2xl">
          <CardContent className="p-6">
            <div className="space-y-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                📊 Estadísticas de la Temporada
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {exampleStatsExpanded.map((stat, i) => (
                  <div key={i} className={`rounded-xl border-2 p-3 text-center transition-all hover:scale-105 ${stat.color}`}>
                    <div className="text-2xl mb-1">{stat.icon}</div>
                    <div className="text-lg font-bold">{stat.value}</div>
                    <div className="text-xs opacity-70">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Logros */}
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-3">
                <p className="text-xs font-bold text-yellow-900 mb-2">🏅 Logros</p>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-green-100 text-green-800 text-xs">⚽ Goleador (7)</Badge>
                  <Badge className="bg-green-200 text-green-900 text-xs">🔥 Pichichi (+5 goles)</Badge>
                  <Badge className="bg-orange-100 text-orange-800 text-xs">🔥 Racha +5 entrenamientos</Badge>
                  <Badge className="bg-purple-100 text-purple-800 text-xs">📋 +20 entrenamientos</Badge>
                  <Badge className="bg-yellow-100 text-yellow-800 text-xs">⭐ Evaluación destacada</Badge>
                  <Badge className="bg-slate-200 text-slate-800 text-xs">🏅 Veterano (3 temp.)</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ========== LEYENDA ========== */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="p-4">
          <h3 className="font-bold text-slate-900 mb-3">📋 Datos que se muestran</h3>
          <div className="grid md:grid-cols-2 gap-2 text-sm text-slate-700">
            <div>⚽ <strong>Goles</strong> — de los resultados de partidos registrados</div>
            <div>🏟️ <strong>Partidos</strong> — convocados y asistidos</div>
            <div>⭐ <strong>Evaluación</strong> — media de las evaluaciones del entrenador (1-5)</div>
            <div>📋 <strong>Entrenamientos</strong> — asistencia registrada por el entrenador</div>
            <div>🔥 <strong>Racha</strong> — entrenamientos consecutivos asistidos</div>
            <div>💳 <strong>Pagos</strong> — estado de pagos de la temporada actual</div>
            <div>🏅 <strong>Antigüedad</strong> — temporadas en el club</div>
            <div>🎂 <strong>Cumpleaños</strong> — aparece solo si está próximo (30 días o menos)</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, MessageCircle, Smartphone, Bell } from "lucide-react";

/**
 * Panel "Tasa de respuesta de convocatorias" vs benchmarks del sector.
 * Solo se muestra a admin. Calcula sobre las convocatorias PUBLICADAS de la temporada.
 *
 * Benchmarks (fuente: casos públicos Spond, TeamSnap, Clupik):
 *  - WhatsApp clubs amateur:        40–55%
 *  - Spond / TeamSnap sin recordar: 70–75%
 *  - Spond con recordatorio escalado: 88–92%
 */
export default function CallupResponseRatePanel({ callups = [], visible = true }) {
  const stats = useMemo(() => {
    const publicadas = callups.filter(c => c.publicada === true);
    let convocados = 0;
    let respondidos = 0; // asistire o no_asistire
    let asistire = 0;
    for (const c of publicadas) {
      for (const j of (c.jugadores_convocados || [])) {
        convocados++;
        if (j.confirmacion === "asistire") { respondidos++; asistire++; }
        else if (j.confirmacion === "no_asistire") { respondidos++; }
      }
    }
    const tasaResp = convocados ? Math.round((respondidos / convocados) * 100) : 0;
    const tasaAsist = convocados ? Math.round((asistire / convocados) * 100) : 0;
    return { totalCallups: publicadas.length, convocados, respondidos, tasaResp, tasaAsist };
  }, [callups]);

  if (!visible) return null;
  if (stats.totalCallups === 0) return null;

  // Color del KPI según benchmark
  const colorTasa =
    stats.tasaResp >= 85 ? "text-green-600" :
    stats.tasaResp >= 70 ? "text-blue-600" :
    stats.tasaResp >= 55 ? "text-amber-600" :
                            "text-red-600";

  const veredicto =
    stats.tasaResp >= 88 ? "🏆 Nivel Spond con recordatorios" :
    stats.tasaResp >= 70 ? "✅ Nivel app profesional sin recordar" :
    stats.tasaResp >= 55 ? "📈 Mejor que WhatsApp medio" :
                            "⚠️ Por debajo de WhatsApp — toca activar recordatorios";

  return (
    <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-blue-50">
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base lg:text-lg font-bold text-slate-900 leading-tight">
              Tasa de respuesta vs el sector
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {stats.totalCallups} convocatorias publicadas · {stats.respondidos}/{stats.convocados} respuestas
            </p>
          </div>
        </div>

        {/* KPI principal */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white rounded-xl p-3 border border-slate-100 text-center shadow-sm">
            <p className="text-[11px] text-slate-500 uppercase font-semibold">Respuesta</p>
            <p className={`text-3xl font-black ${colorTasa}`}>{stats.tasaResp}%</p>
            <p className="text-[11px] text-slate-400 mt-0.5">han contestado</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-slate-100 text-center shadow-sm">
            <p className="text-[11px] text-slate-500 uppercase font-semibold">Confirmados</p>
            <p className="text-3xl font-black text-green-600">{stats.tasaAsist}%</p>
            <p className="text-[11px] text-slate-400 mt-0.5">dicen "voy"</p>
          </div>
        </div>

        {/* Benchmarks */}
        <div className="space-y-2">
          <BenchmarkRow
            icon={<MessageCircle className="w-3.5 h-3.5" />}
            label="WhatsApp clubs amateur"
            range="40–55%"
            color="bg-red-100 text-red-700"
            yours={stats.tasaResp}
            min={40} max={55}
          />
          <BenchmarkRow
            icon={<Smartphone className="w-3.5 h-3.5" />}
            label="Spond / TeamSnap (sin recordar)"
            range="70–75%"
            color="bg-blue-100 text-blue-700"
            yours={stats.tasaResp}
            min={70} max={75}
          />
          <BenchmarkRow
            icon={<Bell className="w-3.5 h-3.5" />}
            label="Spond con recordatorio escalado"
            range="88–92%"
            color="bg-green-100 text-green-700"
            yours={stats.tasaResp}
            min={88} max={92}
          />
        </div>

        <div className="mt-4 p-3 bg-white rounded-lg border border-indigo-100">
          <p className="text-sm font-semibold text-slate-800">{veredicto}</p>
          <p className="text-xs text-slate-500 mt-1">
            Fuente: datos públicos de Spond, TeamSnap y clubs Clupik. Tu app ya tiene push + recordatorios automáticos — la media sube con el uso continuado.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function BenchmarkRow({ icon, label, range, color, yours, min, max }) {
  const enRango = yours >= min && yours <= max;
  const superado = yours > max;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold ${color}`}>
        {icon}
        {range}
      </span>
      <span className="text-slate-700 flex-1 truncate">{label}</span>
      {enRango && <span className="text-xs font-semibold text-amber-600">tú aquí</span>}
      {superado && <span className="text-xs font-semibold text-green-600">superado ✓</span>}
    </div>
  );
}
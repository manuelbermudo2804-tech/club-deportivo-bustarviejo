import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, Trophy, Info } from "lucide-react";

// Pestaña "Mi Desglose": resumen arriba + detalle expandible por fase
export default function MiDesglosePuntos({ token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState({});

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      try {
        const res = await base44.functions.invoke('porraDesglosePuntos', { token });
        setData(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    if (token) cargar();
  }, [token]);

  const toggle = (k) => setExpandido(prev => ({ ...prev, [k]: !prev[k] }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-slate-600">No se pudo cargar el desglose</CardContent>
      </Card>
    );
  }

  const { resumen, grupos, mejores_terceros, eliminatorias, campeon, tercer_puesto, especiales } = data;

  const filas = [
    { k: 'grupos', label: '⚽ Fase de Grupos', pts: resumen.grupos, sub: `${grupos.aciertos}/${grupos.partidos_jugados} aciertos · ${grupos.puntos_por_acierto} pts/acierto` },
    { k: 'terceros', label: '🥉 Mejores Terceros', pts: resumen.terceros, sub: mejores_terceros.hay_datos ? `${mejores_terceros.num_aciertos}/8 aciertos · ${mejores_terceros.puntos_por_acierto} pts/acierto` : 'Aún sin resolver' },
    { k: 'elim_16', label: '⚔️ Clasificación a 16avos', pts: eliminatorias['16avos'].puntos_total, sub: eliminatorias['16avos'].hay_datos ? `${eliminatorias['16avos'].num_aciertos} equipos clasificados acertados · ${eliminatorias['16avos'].puntos_por_acierto} pts/equipo` : 'Aún sin jugar' },
    { k: 'elim_8', label: '⚔️ 8avos de final', pts: eliminatorias['8vos'].puntos_total, sub: eliminatorias['8vos'].hay_datos ? `${eliminatorias['8vos'].num_aciertos} aciertos · ${eliminatorias['8vos'].puntos_por_acierto} pts/equipo` : 'Aún sin jugar' },
    { k: 'elim_4', label: '⚔️ Cuartos de final', pts: eliminatorias['4tos'].puntos_total, sub: eliminatorias['4tos'].hay_datos ? `${eliminatorias['4tos'].num_aciertos} aciertos · ${eliminatorias['4tos'].puntos_por_acierto} pts/equipo` : 'Aún sin jugar' },
    { k: 'elim_semis', label: '⚔️ Semifinales', pts: eliminatorias['semis'].puntos_total, sub: eliminatorias['semis'].hay_datos ? `${eliminatorias['semis'].num_aciertos} aciertos · ${eliminatorias['semis'].puntos_por_acierto} pts/equipo` : 'Aún sin jugar' },
    { k: 'elim_final', label: '⚔️ Final', pts: eliminatorias['final'].puntos_total, sub: eliminatorias['final'].hay_datos ? `${eliminatorias['final'].num_aciertos} aciertos · ${eliminatorias['final'].puntos_por_acierto} pts/equipo` : 'Aún sin jugar' },
    { k: 'campeon', label: '🏆 Campeón', pts: resumen.campeon, sub: campeon.hay_datos ? (campeon.acierta ? `✅ Acertaste · ${campeon.puntos_por_acierto} pts` : '❌ Fallaste') : 'Aún sin resolver' },
    { k: 'tercero', label: '🥉 Tercer Puesto', pts: resumen.tercer_puesto, sub: tercer_puesto.hay_datos ? `${tercer_puesto.aciertos.length} aciertos` : 'Aún sin jugar' },
    { k: 'especiales', label: '⭐ Predicciones Especiales', pts: resumen.especiales, sub: `${especiales.filter(e => e.acierta).length}/4 aciertos · 10 pts/acierto` },
  ];

  return (
    <div className="space-y-3">
      {/* Total destacado */}
      <Card className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 text-white border-0 shadow-xl">
        <CardContent className="p-5 text-center">
          <Trophy className="w-10 h-10 mx-auto mb-2 text-yellow-200" />
          <p className="text-sm font-bold uppercase tracking-wider opacity-90">Tus puntos totales</p>
          <p className="text-5xl font-black my-1">{resumen.total}</p>
          <p className="text-xs opacity-80">pts acumulados</p>
        </CardContent>
      </Card>

      {/* Aviso de transparencia */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2 text-xs">
        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-blue-900">
          <strong>Total transparencia:</strong> pulsa cada fase para ver tus aciertos y fallos partido por partido. Si algo no cuadra, contacta con el club.
        </p>
      </div>

      {/* Resumen tabular con expansión */}
      <div className="space-y-2">
        {filas.map(f => (
          <FilaResumen
            key={f.k}
            fila={f}
            expandido={!!expandido[f.k]}
            onToggle={() => toggle(f.k)}
            data={data}
          />
        ))}
      </div>
    </div>
  );
}

function FilaResumen({ fila, expandido, onToggle, data }) {
  const tienePts = fila.pts > 0;
  return (
    <Card className={`overflow-hidden transition-all ${tienePts ? 'border-green-300' : 'border-slate-200'}`}>
      <button onClick={onToggle} className="w-full p-3 flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors text-left">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 text-sm">{fila.label}</p>
          <p className="text-xs text-slate-500 mt-0.5">{fila.sub}</p>
        </div>
        <div className="text-right">
          <div className={`font-black text-xl ${tienePts ? 'text-green-600' : 'text-slate-400'}`}>+{fila.pts}</div>
          <div className="text-[10px] text-slate-500">pts</div>
        </div>
        {expandido ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {expandido && (
        <div className="border-t bg-slate-50 p-3">
          <DetalleSeccion claveSeccion={fila.k} data={data} />
        </div>
      )}
    </Card>
  );
}

function DetalleSeccion({ claveSeccion, data }) {
  if (claveSeccion === 'grupos') return <DetalleGrupos grupos={data.grupos} />;
  if (claveSeccion === 'terceros') return <DetalleTerceros t={data.mejores_terceros} />;
  if (claveSeccion.startsWith('elim_')) {
    const map = { elim_16: '16avos', elim_8: '8vos', elim_4: '4tos', elim_semis: 'semis', elim_final: 'final' };
    return <DetalleEliminatoria fase={data.eliminatorias[map[claveSeccion]]} esClasificacion16={claveSeccion === 'elim_16'} />;
  }
  if (claveSeccion === 'campeon') return <DetalleCampeon c={data.campeon} />;
  if (claveSeccion === 'tercero') return <DetalleTercerPuesto t={data.tercer_puesto} />;
  if (claveSeccion === 'especiales') return <DetalleEspeciales especiales={data.especiales} />;
  return null;
}

function ResultadoLabel({ res }) {
  if (res === '1') return <span className="font-bold">Gana Local</span>;
  if (res === 'X') return <span className="font-bold">Empate</span>;
  if (res === '2') return <span className="font-bold">Gana Visitante</span>;
  return <span className="text-slate-400">—</span>;
}

function DetalleGrupos({ grupos }) {
  if (grupos.partidos_jugados === 0) {
    return <p className="text-sm text-slate-500 italic text-center py-3">Aún no se ha jugado ningún partido de grupos.</p>;
  }
  return (
    <div className="space-y-1.5 max-h-96 overflow-y-auto">
      {grupos.detalle.map(p => (
        <div key={p.id} className={`flex items-center gap-2 text-xs p-2 rounded-md ${p.acierta ? 'bg-green-100' : 'bg-red-50'}`}>
          {p.acierta ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
          <span className="font-mono text-[10px] bg-white px-1.5 py-0.5 rounded">{p.grupo}{p.numero}</span>
          <span className="flex-1 truncate"><span className="font-semibold">{p.local}</span> vs <span className="font-semibold">{p.visitante}</span></span>
          <span className="text-slate-600 hidden sm:inline">
            Tú: <ResultadoLabel res={p.prediccion} /> · Real: <ResultadoLabel res={p.resultado_real} />
          </span>
          <span className={`font-bold ${p.acierta ? 'text-green-700' : 'text-slate-400'}`}>+{p.puntos}</span>
        </div>
      ))}
    </div>
  );
}

function DetalleTerceros({ t }) {
  if (!t.hay_datos) {
    return <p className="text-sm text-slate-500 italic text-center py-3">Aún no se han confirmado los mejores terceros oficiales.</p>;
  }
  return (
    <div className="space-y-2 text-xs">
      <p className="text-green-900 bg-green-50 border border-green-200 rounded p-2 flex items-start gap-2">
        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
        <span>Los 8 mejores terceros ya son <strong>oficiales</strong>: estos puntos ya están calculados y son <strong>definitivos</strong>.</span>
      </p>
      <p className="text-slate-700"><strong>Reales:</strong> {t.reales.map(r => r.nombre).join(', ')}</p>
      <p className="font-bold text-slate-800 mt-2">Tus 8 predicciones:</p>
      <div className="grid grid-cols-2 gap-1.5">
        {t.tus_predicciones.map((p, i) => (
          <div key={i} className={`flex items-center gap-2 p-2 rounded ${p.acierta ? 'bg-green-100' : 'bg-red-50'}`}>
            {p.acierta ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : <XCircle className="w-3.5 h-3.5 text-red-500" />}
            <span className="truncate">{p.nombre}</span>
          </div>
        ))}
      </div>
      <p className="text-right font-bold text-green-700 mt-2">Total: +{t.puntos_total} pts</p>
    </div>
  );
}

function DetalleEliminatoria({ fase, esClasificacion16 }) {
  if (!fase.hay_datos) {
    return <p className="text-sm text-slate-500 italic text-center py-3 flex items-center justify-center gap-2"><Clock className="w-4 h-4" /> Aún no se ha jugado esta fase.</p>;
  }
  return (
    <div className="space-y-2 text-xs">
      {esClasificacion16 && (
        <p className="text-blue-900 bg-blue-50 border border-blue-200 rounded p-2">
          Estos puntos son por <strong>acertar qué equipos clasifican a la ronda de 16avos</strong> (según los resultados reales de la fase de grupos), no por ganar partidos de eliminatoria.
        </p>
      )}
      <p className="text-slate-700"><strong>Equipos reales en esta fase:</strong> {fase.equipos_reales.map(e => e.nombre).join(', ') || '—'}</p>
      <p className="font-bold text-slate-800 mt-2">Tus predicciones:</p>
      <div className="grid grid-cols-2 gap-1.5">
        {fase.equipos_predichos.map((p, i) => {
          const acierta = fase.aciertos.some(a => a.codigo === p.codigo);
          return (
            <div key={i} className={`flex items-center gap-2 p-2 rounded ${acierta ? 'bg-green-100' : 'bg-red-50'}`}>
              {acierta ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : <XCircle className="w-3.5 h-3.5 text-red-500" />}
              <span className="truncate">{p.nombre}</span>
            </div>
          );
        })}
      </div>
      <p className="text-right font-bold text-green-700 mt-2">{fase.num_aciertos} aciertos × {fase.puntos_por_acierto} pts = +{fase.puntos_total} pts</p>
    </div>
  );
}

function DetalleCampeon({ c }) {
  if (!c.hay_datos) {
    return <p className="text-sm text-slate-500 italic text-center py-3">Aún no se ha decidido el campeón oficial.</p>;
  }
  return (
    <div className="space-y-2 text-sm">
      <p><strong>Campeón real:</strong> {c.real.nombre}</p>
      <p><strong>Tu predicción:</strong> {c.tu_prediccion?.nombre || '(sin predicción)'}</p>
      <p className={`font-bold ${c.acierta ? 'text-green-600' : 'text-red-600'}`}>
        {c.acierta ? `✅ ¡Acertaste! +${c.puntos_por_acierto} pts` : '❌ Fallaste · 0 pts'}
      </p>
    </div>
  );
}

function DetalleTercerPuesto({ t }) {
  if (!t.hay_datos) {
    return <p className="text-sm text-slate-500 italic text-center py-3">Aún no se ha jugado el partido por el 3er puesto.</p>;
  }
  return (
    <div className="space-y-2 text-xs">
      <p><strong>Partido real:</strong> {t.real.equipo1} vs {t.real.equipo2} · Ganador: {t.real.ganador}</p>
      <p><strong>Tu predicción:</strong> {t.tu_prediccion.equipo1 || '—'} vs {t.tu_prediccion.equipo2 || '—'} · Ganador: {t.tu_prediccion.ganador || '—'}</p>
      {t.aciertos.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {t.aciertos.map((a, i) => (
            <li key={i} className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-3.5 h-3.5" /> Acertaste {a.tipo === 'ganador' ? `el ganador (${a.nombre})` : `que ${a.nombre} jugaría`} → +{a.puntos} pts
            </li>
          ))}
        </ul>
      ) : <p className="text-red-600">❌ Sin aciertos</p>}
    </div>
  );
}

function DetalleEspeciales({ especiales }) {
  return (
    <div className="space-y-1.5 text-xs">
      {especiales.map(e => (
        <div key={e.clave} className={`p-2 rounded ${e.acierta ? 'bg-green-100' : e.hay_datos ? 'bg-red-50' : 'bg-slate-100'}`}>
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold">{e.label}</span>
            <span className={`font-bold ${e.acierta ? 'text-green-700' : 'text-slate-400'}`}>+{e.puntos}</span>
          </div>
          <div className="text-slate-600 mt-1">
            Tú: <strong>{e.tu_prediccion || '—'}</strong>
            {e.hay_datos ? <> · Real: <strong>{e.real}</strong></> : <> · <em>Aún sin resolver</em></>}
          </div>
        </div>
      ))}
    </div>
  );
}
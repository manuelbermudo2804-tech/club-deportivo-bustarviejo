import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Trophy, Loader2, Lock, AlertCircle, CheckCircle2, Save, Clock, Home, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import usePorraEditor from "@/components/porra/editor/usePorraEditor";
import EditorGrupos from "@/components/porra/editor/EditorGrupos";
import EditorMejoresTerceros from "@/components/porra/editor/EditorMejoresTerceros";
import EditorBracket from "@/components/porra/editor/EditorBracket";
import EditorEspeciales from "@/components/porra/editor/EditorEspeciales";
import MiniLigasManager from "@/components/porra/ligas/MiniLigasManager";
import PorraCompletadaModal from "@/components/porra/PorraCompletadaModal";
import MiDesglosePuntos from "@/components/porra/desglose/MiDesglosePuntos";
import CompartirPorraButton from "@/components/porra/CompartirPorraButton";
import PorraInfoDuranteTorneo from "@/components/porra/PorraInfoDuranteTorneo";
import BracketReedicionBanner from "@/components/porra/editor/BracketReedicionBanner";
import { base44 } from "@/api/base44Client";

// Hub principal del editor de porra
// Lee ?token=XXX de la URL y muestra los 3 editores (grupos, bracket, especiales)
export default function PorraMiPorra() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  // Si llegamos desde la app interna autenticada, los botones de navegación
  // (Inicio, Ranking) se quedan dentro del entorno con layout en vez de salir
  // a la web pública.
  const fromApp = params.get('from') === 'app';
  const inicioUrl = fromApp ? '/MiPorra' : '/Porra';
  const rankingUrl = fromApp ? `/PorraRanking?token=${token}&from=app` : `/PorraRanking?token=${token}`;

  const {
    participante, config, equipos, partidos,
    loading, saving, error, isBlocked, isBracketBlocked,
    setResultadoGrupo, setClasificacionGrupo,
    setEliminatoriaGanador, setEspecial, setMejoresTerceros,
    confirmarBracket,
    refrescar, flushGuardado,
  } = usePorraEditor(token);

  // Pantalla de éxito al llegar al 100% por primera vez (en esta sesión)
  const [showCompletada, setShowCompletada] = useState(false);
  const [tabActiva, setTabActiva] = useState('grupos');
  const completadaMostradaRef = useRef(false);
  const ultimoPorcentajeRef = useRef(null);
  const [misLigas, setMisLigas] = useState([]);

  // Cargar mis mini-ligas para que el botón de compartir incluya el código si las hay
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await base44.functions.invoke('porraGetLigasByToken', { token });
        if (!cancelled && res?.data?.ligas) setMisLigas(res.data.ligas);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [token]);

  useEffect(() => {
    if (!participante) return;
    const pct = participante.porcentaje_completado || 0;
    const storageKey = token ? `porra_completada_vista_${token}` : null;

    // PRIMERA vez que recibimos al participante en esta sesión: solo registrar.
    if (ultimoPorcentajeRef.current === null) {
      ultimoPorcentajeRef.current = pct;
      // Si ya viene al 100% o ya se mostró antes (localStorage), marcar como vista
      // para que nunca se dispare al abrir una porra ya completada.
      const yaVistoAntes = storageKey && localStorage.getItem(storageKey) === '1';
      if (pct === 100 || yaVistoAntes) {
        completadaMostradaRef.current = true;
        if (pct === 100 && storageKey) {
          try { localStorage.setItem(storageKey, '1'); } catch {}
        }
      }
      return;
    }

    const prev = ultimoPorcentajeRef.current;
    // Solo disparar cuando el usuario cruza de <100% a 100% DENTRO de esta sesión
    if (pct === 100 && prev < 100 && !completadaMostradaRef.current) {
      setShowCompletada(true);
      completadaMostradaRef.current = true;
      if (storageKey) {
        try { localStorage.setItem(storageKey, '1'); } catch {}
      }
    }
    ultimoPorcentajeRef.current = pct;
  }, [participante, token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-600 to-orange-600">
        <Loader2 className="w-10 h-10 animate-spin text-white" />
      </div>
    );
  }

  if (error || !participante) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-4">
        <Card className="max-w-md bg-slate-800 border-slate-700">
          <CardContent className="p-6 text-center">
            <Lock className="w-12 h-12 mx-auto text-red-400 mb-3" />
            <h1 className="text-xl font-black mb-2">{error === 'Pago pendiente' ? 'Pago pendiente' : 'Acceso denegado'}</h1>
            <p className="text-white/70 text-sm mb-4">
              {error === 'Pago pendiente'
                ? 'Tu pago aún no se ha confirmado. Espera unos segundos y recarga.'
                : (error || 'No hemos podido cargar tu porra')}
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => window.location.reload()} variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                Recargar
              </Button>
              <Button onClick={() => navigate(inicioUrl)} variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                <Home className="w-4 h-4 mr-1" /> Inicio
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completado = participante.porcentaje_completado || 0;
  const fechaLimite = config?.fecha_limite_predicciones ? new Date(config.fecha_limite_predicciones) : null;

  // Bloqueo secuencial: Grupos → Terceros → Bracket → Especiales.
  // Desglose y Ligas siempre libres (son consulta/social).
  const ordenPrereq = {
    grupos: null,
    terceros: { campo: 'completado_grupos', nombre: 'Grupos' },
    bracket: { campo: 'completado_terceros', nombre: 'Terceros' },
    especiales: { campo: 'completado_bracket', nombre: 'Bracket' },
  };
  const intentarCambiarTab = (nuevaTab) => {
    const prereq = ordenPrereq[nuevaTab];
    if (prereq && !participante[prereq.campo]) {
      toast.error(`Antes completa "${prereq.nombre}" para desbloquear esta pestaña 🔒`);
      return;
    }
    flushGuardado && flushGuardado();
    setTabActiva(nuevaTab);
  };
  const estaBloqueada = (tab) => {
    const prereq = ordenPrereq[tab];
    return prereq ? !participante[prereq.campo] : false;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50">
      {/* Header sticky */}
      <div className="bg-gradient-to-r from-red-600 via-orange-600 to-yellow-500 text-white sticky top-0 z-20 shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Trophy className="w-7 h-7 text-yellow-300 flex-shrink-0" />
              <div className="min-w-0">
                <h1 className="text-base md:text-lg font-black truncate">{participante.alias_equipo}</h1>
                <p className="text-[10px] md:text-xs text-white/80 truncate">
                  {participante.nombre} · {participante.puntos_total || 0} pts
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {saving && (
                <span className="text-xs bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Guardando
                </span>
              )}
              {!saving && completado > 0 && (
                <span className="text-xs bg-green-500/30 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
                  <Save className="w-3 h-3" /> {completado}%
                </span>
              )}
            </div>
          </div>
          <div className="mt-2">
            <Progress value={completado} className="h-1.5 bg-white/20" />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-3 md:px-4 py-4 space-y-4">
        {/* Aviso bloqueo — distingue entre completada al 100% y plazo cerrado */}
        {isBlocked && (
          completado === 100 ? (
            <Card className="border-2 border-green-300 bg-green-50">
              <CardContent className="p-4 flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-green-900">✅ Porra completada y cerrada</p>
                  <p className="text-sm text-green-800 mt-0.5">
                    Has rellenado el 100% de las predicciones. Tu porra queda <strong>bloqueada</strong> para garantizar el juego limpio: ya no se puede modificar. Empezará a sumar puntos cuando comiencen los partidos. 🏆
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-2 border-red-300 bg-red-50">
              <CardContent className="p-4 flex items-start gap-3">
                <Lock className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-red-900">Porra bloqueada 🔒</p>
                  <p className="text-sm text-red-700 mt-0.5">
                    El plazo de predicciones ha cerrado. Tu porra está guardada y empezará a sumar puntos cuando comiencen los partidos.
                  </p>
                  {!participante.bracket_reeditado && (
                    <p className="text-sm text-amber-800 mt-2 bg-amber-100 border border-amber-300 rounded p-2">
                      🆕 <strong>Excepción:</strong> puedes <strong>re-editar el bracket UNA vez</strong> con los nuevos cruces oficiales FIFA 2026. Ve a la pestaña <strong>🏆 Bracket</strong>.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        )}

        {/* Fecha límite */}
        {fechaLimite && !isBlocked && (
          <Card className="border-2 border-yellow-300 bg-gradient-to-r from-yellow-50 to-orange-50">
            <CardContent className="p-3 flex items-center gap-3 text-sm">
              <Clock className="w-5 h-5 text-orange-600 flex-shrink-0" />
              <p className="text-yellow-900 flex-1">
                <strong>⏰ Cierre:</strong> {fechaLimite.toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Estado mini-resumen — CLICKABLE con bloqueo secuencial */}
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 text-center">Estado de tu porra — sigue el orden 👇</p>
          <div className="grid grid-cols-4 gap-2">
            <StatusCard ok={participante.completado_grupos} label="Grupos" icon="⚽" active={tabActiva === 'grupos'} locked={estaBloqueada('grupos')} onClick={() => intentarCambiarTab('grupos')} />
            <StatusCard ok={participante.completado_terceros} label="Terceros" icon="🥉" active={tabActiva === 'terceros'} locked={estaBloqueada('terceros')} onClick={() => intentarCambiarTab('terceros')} />
            <StatusCard ok={participante.completado_bracket} label="Bracket" icon="🏆" active={tabActiva === 'bracket'} locked={estaBloqueada('bracket')} onClick={() => intentarCambiarTab('bracket')} />
            <StatusCard ok={participante.completado_especiales} label="Especiales" icon="⭐" active={tabActiva === 'especiales'} locked={estaBloqueada('especiales')} onClick={() => intentarCambiarTab('especiales')} />
          </div>
        </div>

        {/* Acceso rápido al ranking */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => fromApp ? navigate(rankingUrl) : window.open(rankingUrl, '_blank')}
            variant="outline"
            className="border-2 border-orange-300 bg-white hover:bg-orange-50"
          >
            <Trophy className="w-4 h-4 mr-1 text-orange-600" /> Ranking global
          </Button>
          <Button
            onClick={() => fromApp ? navigate(inicioUrl) : window.open(inicioUrl, '_blank')}
            variant="outline"
            className="border-2 border-slate-300 bg-white hover:bg-slate-50"
          >
            <Home className="w-4 h-4 mr-1" /> Inicio
          </Button>
        </div>

        {/* Compartir por WhatsApp — retar a amigos */}
        <CompartirPorraButton participante={participante} miniLigas={misLigas} />

        {/* Info durante el torneo: aclara dudas típicas (bracket vs realidad, puntos, etc.) */}
        <PorraInfoDuranteTorneo variant="porra" />

        {/* Indicador visual de dónde se edita */}
        <div className="bg-gradient-to-r from-orange-100 to-red-100 border-2 border-orange-300 rounded-xl px-3 py-2 flex items-center gap-2 text-sm font-bold text-orange-900 shadow-sm">
          <Pencil className="w-4 h-4 text-orange-600" />
          <span>👇 Pulsa una pestaña para editar tus predicciones</span>
        </div>

        {/* Tabs editor — con bloqueo secuencial */}
        <Tabs value={tabActiva} onValueChange={intentarCambiarTab}>
          <TabsList className="grid w-full grid-cols-6 h-auto p-1.5 bg-gradient-to-r from-slate-800 to-slate-900 shadow-lg rounded-xl">
            <TabsTrigger value="grupos" className="py-2.5 text-[10px] md:text-sm font-bold text-white/70 data-[state=active]:bg-gradient-to-br data-[state=active]:from-orange-500 data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:shadow-md">⚽ Grupos</TabsTrigger>
            <TabsTrigger value="terceros" className="py-2.5 text-[10px] md:text-sm font-bold text-white/70 data-[state=active]:bg-gradient-to-br data-[state=active]:from-orange-500 data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:opacity-60">{estaBloqueada('terceros') ? '🔒' : '🥉'} Terceros</TabsTrigger>
            <TabsTrigger value="bracket" className="py-2.5 text-[10px] md:text-sm font-bold text-white/70 data-[state=active]:bg-gradient-to-br data-[state=active]:from-orange-500 data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:opacity-60">{estaBloqueada('bracket') ? '🔒' : '🏆'} Bracket</TabsTrigger>
            <TabsTrigger value="especiales" className="py-2.5 text-[10px] md:text-sm font-bold text-white/70 data-[state=active]:bg-gradient-to-br data-[state=active]:from-orange-500 data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:opacity-60">{estaBloqueada('especiales') ? '🔒' : '⭐'} Especiales</TabsTrigger>
            <TabsTrigger value="desglose" className="py-2.5 text-[10px] md:text-sm font-bold text-white/70 data-[state=active]:bg-gradient-to-br data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md">📊 Desglose</TabsTrigger>
            <TabsTrigger value="ligas" className="py-2.5 text-[10px] md:text-sm font-bold text-white/70 data-[state=active]:bg-gradient-to-br data-[state=active]:from-orange-500 data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:shadow-md">👥 Ligas</TabsTrigger>
          </TabsList>

          <TabsContent value="grupos" className="mt-4">
            <EditorGrupos
              participante={participante}
              partidos={partidos}
              equipos={equipos}
              isBlocked={isBlocked}
              onSetResultado={setResultadoGrupo}
              onSetClasificacion={setClasificacionGrupo}
            />
          </TabsContent>
          <TabsContent value="terceros" className="mt-4">
            <EditorMejoresTerceros
              participante={participante}
              equipos={equipos}
              isBlocked={isBlocked}
              onToggleTercero={setMejoresTerceros}
            />
          </TabsContent>
          <TabsContent value="bracket" className="mt-4">
            <BracketReedicionBanner
              participante={participante}
              onConfirmar={confirmarBracket}
              saving={saving}
            />
            <EditorBracket
              participante={participante}
              partidos={partidos}
              equipos={equipos}
              isBlocked={isBracketBlocked}
              onSetGanador={setEliminatoriaGanador}
              config={config}
            />
          </TabsContent>
          <TabsContent value="especiales" className="mt-4">
            <EditorEspeciales
              participante={participante}
              equipos={equipos}
              isBlocked={isBlocked}
              onSetEspecial={setEspecial}
              config={config}
            />
          </TabsContent>
          <TabsContent value="desglose" className="mt-4">
            <MiDesglosePuntos token={token} />
          </TabsContent>
          <TabsContent value="ligas" className="mt-4">
            <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 text-sm mb-3">
              <p className="font-bold text-orange-900 mb-1">👥 Compite con tus amigos</p>
              <p className="text-orange-800 text-xs">
                Crea una mini-liga privada y comparte el código por WhatsApp. Tendréis vuestro propio ranking aparte del global.
              </p>
            </div>
            <MiniLigasManager participante={participante} onUpdate={refrescar} />
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="text-center py-6 text-xs text-slate-500">
          💾 <strong>Auto-guardado activado.</strong> Tus cambios se guardan solos cada pocos segundos.
        </div>
      </div>

      {/* Modal de éxito al completar el 100% */}
      <PorraCompletadaModal
        open={showCompletada}
        onOpenChange={setShowCompletada}
        participante={participante}
        token={token}
        onIrAMiniLigas={() => setTabActiva('ligas')}
      />
    </div>
  );
}

function StatusCard({ ok, label, icon, active, locked, onClick }) {
  const baseColor = locked
    ? 'bg-slate-100 border-slate-300 opacity-70'
    : ok ? 'bg-green-50 border-green-400' : 'bg-white border-slate-200';
  const activeRing = active ? 'ring-2 ring-orange-500 ring-offset-1' : '';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative rounded-lg p-2 md:p-3 text-center border-2 transition-all hover:shadow-md hover:scale-[1.03] active:scale-95 cursor-pointer ${baseColor} ${activeRing}`}
    >
      {locked && (
        <div className="absolute top-1 right-1 text-xs">🔒</div>
      )}
      <div className="text-xl md:text-2xl">{icon}</div>
      <p className="text-[10px] md:text-xs font-bold text-slate-700 mt-0.5">{label}</p>
      <p className="text-[9px] md:text-[10px] text-slate-500">
        {locked ? 'Bloqueado' : ok ? '✅ Hecho' : 'Pendiente'}
      </p>
    </button>
  );
}
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  TestTube2, UserPlus, Zap, Trash2, ExternalLink, Copy, Mail, Lock,
  Calculator, Dice5, AlertTriangle, CheckCircle2, RefreshCw, FlaskConical, PlayCircle
} from "lucide-react";
import { calcularClasificacionGrupo } from "@/components/porra/editor/calcularClasificacion";

const GRUPOS_LETRAS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

// Panel completo de TESTING de la Porra Mundial
// Permite a un admin probar todo el flujo sin moverse de aquí
export default function PorraAdminTesting({ participantes = [], partidos = [], equipos = [], config, onUpdate }) {
  const [busy, setBusy] = useState(null);
  const [nombreTest, setNombreTest] = useState("Tester");
  const [cantidadTest, setCantidadTest] = useState(5);

  const setBusyOp = (op) => setBusy(op);
  const clearBusy = () => setBusy(null);

  // 1) Crear N participantes de prueba (pagados, con predicciones aleatorias)
  const crearParticipantesTest = async () => {
    if (!confirm(`¿Crear ${cantidadTest} participantes de prueba con porras aleatorias YA PAGADAS?`)) return;
    setBusyOp('crear');
    try {
      let creados = 0;
      for (let i = 1; i <= cantidadTest; i++) {
        // Predicciones aleatorias 1/X/2
        const predGrupos = {};
        const opciones = ['1', 'X', '2'];
        partidos.filter(p => p.fase === 'grupos').forEach(p => {
          predGrupos[p.id] = opciones[Math.floor(Math.random() * 3)];
        });

        // 🔥 Calcular clasificación automática de cada grupo (igual que hace el editor)
        const clasifGrupos = {};
        GRUPOS_LETRAS.forEach(g => {
          const ord = calcularClasificacionGrupo(g, partidos, equipos, predGrupos);
          if (ord.length === 4) clasifGrupos[g] = ord;
        });

        // 8 mejores terceros aleatorios
        const codigos = equipos.map(e => e.codigo);
        const tercerosShuffled = [...codigos].sort(() => Math.random() - 0.5).slice(0, 8);

        // Predicciones eliminatorias aleatorias
        const predElim = {};
        partidos.filter(p => p.fase !== 'grupos' && p.fase !== 'tercer_puesto').forEach(p => {
          predElim[p.id] = codigos[Math.floor(Math.random() * codigos.length)];
        });

        const token = `test_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 8)}`;
        const alias = `${nombreTest}-${i}`;

        await base44.entities.PorraParticipante.create({
          nombre: `${nombreTest} ${i}`,
          email: `test${i}.${Date.now()}@test.cdbustarviejo.com`,
          alias_equipo: alias,
          token_acceso: token,
          estado_pago: 'pagado',
          cantidad_pagada: config?.precio_entrada || 15,
          fecha_pago: new Date().toISOString(),
          predicciones_grupos: predGrupos,
          clasificacion_grupos: clasifGrupos,
          mejores_terceros: tercerosShuffled,
          predicciones_eliminatorias: predElim,
          completado_grupos: true,
          completado_terceros: true,
          completado_bracket: true,
          porcentaje_completado: 100,
          puntos_total: 0,
        });
        creados++;
      }
      toast.success(`✅ ${creados} participantes de prueba creados`);
      onUpdate?.();
    } catch (e) {
      console.error(e);
      toast.error(`Error: ${e.message}`);
    } finally { clearBusy(); }
  };

  // 1b) Recalcular la clasificación automática de los test ya existentes (parche para los antiguos)
  const recalcularClasifTest = async () => {
    const tests = participantes.filter(p => (p.email || '').includes('@test.cdbustarviejo.com'));
    if (tests.length === 0) return toast.info('No hay participantes de prueba');
    setBusyOp('recalcular_clasif');
    try {
      let arregladas = 0;
      for (const p of tests) {
        const clasifGrupos = {};
        GRUPOS_LETRAS.forEach(g => {
          const ord = calcularClasificacionGrupo(g, partidos, equipos, p.predicciones_grupos || {});
          if (ord.length === 4) clasifGrupos[g] = ord;
        });
        if (Object.keys(clasifGrupos).length > 0) {
          await base44.entities.PorraParticipante.update(p.id, { clasificacion_grupos: clasifGrupos });
          arregladas++;
        }
      }
      toast.success(`✅ ${arregladas} porras con clasificación recalculada`);
      onUpdate?.();
    } catch (e) {
      toast.error(`Error: ${e.message}`);
    } finally { clearBusy(); }
  };

  // 2) Borrar todos los participantes de prueba (los que tengan email @test.cdbustarviejo.com)
  const borrarParticipantesTest = async () => {
    const tests = participantes.filter(p => (p.email || '').includes('@test.cdbustarviejo.com'));
    if (tests.length === 0) return toast.info('No hay participantes de prueba');
    if (!confirm(`¿Borrar ${tests.length} participantes de prueba? Esto NO afectará a participantes reales.`)) return;
    setBusyOp('borrar');
    try {
      for (const p of tests) {
        await base44.entities.PorraParticipante.delete(p.id);
      }
      toast.success(`🗑️ ${tests.length} participantes de prueba borrados`);
      onUpdate?.();
    } catch (e) {
      toast.error(`Error: ${e.message}`);
    } finally { clearBusy(); }
  };

  // 3) Simular resultados reales aleatorios en partidos de GRUPOS
  const simularResultadosGrupos = async () => {
    if (!confirm('¿Llenar todos los partidos de GRUPOS con resultados 1/X/2 aleatorios? (Solo afecta a partidos sin resultado real)')) return;
    setBusyOp('simular_grupos');
    try {
      const grupales = partidos.filter(p => p.fase === 'grupos' && !p.resultado_real);
      const opciones = ['1', 'X', '2'];
      for (const p of grupales) {
        const r = opciones[Math.floor(Math.random() * 3)];
        const gl = Math.floor(Math.random() * 4);
        const gv = r === '1' ? gl + 1 + Math.floor(Math.random() * 2) : r === '2' ? Math.max(0, gl - 1 - Math.floor(Math.random() * 2)) : gl;
        await base44.entities.PorraPartido.update(p.id, {
          resultado_real: r,
          goles_local: gl,
          goles_visitante: gv,
          finalizado: true,
        });
      }
      toast.success(`✅ ${grupales.length} partidos de grupos simulados`);
      onUpdate?.();
    } catch (e) {
      toast.error(`Error: ${e.message}`);
    } finally { clearBusy(); }
  };

  // 4) Borrar TODOS los resultados reales (para volver a probar)
  const limpiarResultadosReales = async () => {
    if (!confirm('¿Borrar TODOS los resultados reales de TODOS los partidos? Los participantes se quedan, solo se limpian los resultados.')) return;
    setBusyOp('limpiar_resultados');
    try {
      const conResultado = partidos.filter(p => p.resultado_real || p.finalizado);
      for (const p of conResultado) {
        await base44.entities.PorraPartido.update(p.id, {
          resultado_real: '',
          goles_local: null,
          goles_visitante: null,
          finalizado: false,
          ganador_codigo: '',
        });
      }
      toast.success(`🧹 ${conResultado.length} partidos limpiados`);
      onUpdate?.();
    } catch (e) {
      toast.error(`Error: ${e.message}`);
    } finally { clearBusy(); }
  };

  // 5) Ejecutar cálculo de puntos manualmente
  const ejecutarRecalculo = async () => {
    setBusyOp('recalcular');
    try {
      const { data } = await base44.functions.invoke('porraCalcularPuntos', {});
      toast.success(`✅ Recálculo OK: ${data.actualizados || 0} participantes`);
      onUpdate?.();
    } catch (e) {
      toast.error(`Error: ${e.message}`);
    } finally { clearBusy(); }
  };

  // 6) Forzar envío de recordatorios (sin esperar al cron)
  const ejecutarRecordatorios = async () => {
    if (!confirm('Esto enviará EMAILS REALES a participantes con porra incompleta si quedan 7/3/1 día. ¿Continuar?')) return;
    setBusyOp('recordatorios');
    try {
      const { data } = await base44.functions.invoke('porraRecordatorios', {});
      if (data.skip) toast.info(`No se enviaron: ${data.reason}`);
      else toast.success(`📧 Enviados: ${data.enviados} (de ${data.incompletos} incompletos)`);
    } catch (e) {
      toast.error(`Error: ${e.message}`);
    } finally { clearBusy(); }
  };

  // 7) Forzar bloqueo manual de todas las porras
  const ejecutarBloqueo = async () => {
    if (!confirm('¿BLOQUEAR todas las porras ahora mismo? (solo si ya pasó la fecha límite)')) return;
    setBusyOp('bloquear');
    try {
      const { data } = await base44.functions.invoke('porraBloquear', {});
      if (data.skip) toast.info(`No se bloqueó: ${data.reason}`);
      else toast.success(`🔒 ${data.bloqueados} porras bloqueadas`);
      onUpdate?.();
    } catch (e) {
      toast.error(`Error: ${e.message}`);
    } finally { clearBusy(); }
  };

  // 8) Desbloquear todas las porras (para seguir testeando)
  const desbloquearTodas = async () => {
    const bloqueadas = participantes.filter(p => p.bloqueada);
    if (bloqueadas.length === 0) return toast.info('Ninguna porra está bloqueada');
    if (!confirm(`¿Desbloquear ${bloqueadas.length} porras?`)) return;
    setBusyOp('desbloquear');
    try {
      for (const p of bloqueadas) {
        await base44.entities.PorraParticipante.update(p.id, { bloqueada: false, fecha_bloqueo: null });
      }
      toast.success(`🔓 ${bloqueadas.length} porras desbloqueadas`);
      onUpdate?.();
    } catch (e) {
      toast.error(`Error: ${e.message}`);
    } finally { clearBusy(); }
  };

  const copiarEnlace = (token) => {
    const url = `${window.location.origin}/PorraMiPorra?token=${token}`;
    navigator.clipboard.writeText(url);
    toast.success('🔗 Enlace copiado');
  };

  const abrirComoUsuario = (token) => {
    window.open(`/PorraMiPorra?token=${token}`, '_blank');
  };

  const participantesTest = participantes.filter(p => (p.email || '').includes('@test.cdbustarviejo.com'));
  const reales = participantes.length - participantesTest.length;

  return (
    <div className="space-y-4">
      {/* Header explicativo */}
      <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <FlaskConical className="w-10 h-10 text-purple-600 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-black text-purple-900">🧪 Panel de Pruebas</h2>
              <p className="text-sm text-purple-800 mt-1">
                Prueba todo el flujo de la porra sin afectar datos reales. Los participantes "test" usan emails
                <code className="bg-purple-200 px-1 rounded mx-1 text-xs">@test.cdbustarviejo.com</code>
                y se pueden borrar de un click.
              </p>
              <div className="mt-2 flex gap-2">
                <Badge className="bg-green-600">{reales} participantes reales</Badge>
                <Badge className="bg-purple-600">{participantesTest.length} de prueba</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECCIÓN 1: Crear participantes test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="w-5 h-5 text-blue-600" /> 1️⃣ Crear participantes de prueba
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">
            Crea N participantes <strong>ya pagados</strong> con predicciones aleatorias. Útil para probar ranking, recálculos y bloqueos.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[140px]">
              <Label className="text-xs">Prefijo nombre</Label>
              <Input value={nombreTest} onChange={(e) => setNombreTest(e.target.value)} placeholder="Tester" />
            </div>
            <div className="w-24">
              <Label className="text-xs">Cantidad</Label>
              <Input type="number" min={1} max={50} value={cantidadTest} onChange={(e) => setCantidadTest(parseInt(e.target.value) || 1)} />
            </div>
            <Button onClick={crearParticipantesTest} disabled={busy === 'crear'} className="bg-blue-600 hover:bg-blue-700">
              {busy === 'crear' ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <Dice5 className="w-4 h-4 mr-1" />}
              Generar
            </Button>
            <Button onClick={borrarParticipantesTest} disabled={busy === 'borrar'} variant="destructive">
              <Trash2 className="w-4 h-4 mr-1" /> Borrar todos los de prueba ({participantesTest.length})
            </Button>
          </div>
          {participantesTest.length > 0 && (
            <div className="pt-2 border-t">
              <Button onClick={recalcularClasifTest} disabled={busy === 'recalcular_clasif'} variant="outline" size="sm" className="text-purple-700 border-purple-300">
                <RefreshCw className="w-4 h-4 mr-1" /> Arreglar clasificación de los test existentes
              </Button>
              <p className="text-xs text-slate-500 mt-1">Si ya creaste participantes test antes y les falta la clasificación automática de algún grupo, pulsa aquí.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECCIÓN 2: Simular resultados reales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PlayCircle className="w-5 h-5 text-green-600" /> 2️⃣ Simular resultados reales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">
            Rellena resultados ficticios en los partidos para poder ejecutar el recálculo de puntos y ver el ranking en acción.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={simularResultadosGrupos} disabled={busy === 'simular_grupos'} className="bg-green-600 hover:bg-green-700">
              <Dice5 className="w-4 h-4 mr-1" /> Simular partidos de grupos
            </Button>
            <Button onClick={limpiarResultadosReales} disabled={busy === 'limpiar_resultados'} variant="outline">
              <Trash2 className="w-4 h-4 mr-1" /> Limpiar todos los resultados
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SECCIÓN 3: Ejecutar funciones backend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="w-5 h-5 text-orange-600" /> 3️⃣ Lanzar funciones manualmente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-slate-600">
            Ejecuta los crons sin esperar al horario programado.
          </p>
          <div className="grid sm:grid-cols-3 gap-2">
            <Button onClick={ejecutarRecalculo} disabled={busy === 'recalcular'} variant="outline" className="justify-start">
              <Calculator className="w-4 h-4 mr-2 text-orange-600" />
              Recalcular puntos
            </Button>
            <Button onClick={ejecutarRecordatorios} disabled={busy === 'recordatorios'} variant="outline" className="justify-start">
              <Mail className="w-4 h-4 mr-2 text-blue-600" />
              Enviar recordatorios
            </Button>
            <Button onClick={ejecutarBloqueo} disabled={busy === 'bloquear'} variant="outline" className="justify-start">
              <Lock className="w-4 h-4 mr-2 text-red-600" />
              Bloquear al cierre
            </Button>
          </div>
          <Button onClick={desbloquearTodas} disabled={busy === 'desbloquear'} variant="ghost" size="sm" className="text-purple-700">
            <RefreshCw className="w-4 h-4 mr-1" /> Desbloquear todas (para seguir testeando)
          </Button>
        </CardContent>
      </Card>

      {/* SECCIÓN 4: Acceso rápido a porras test */}
      {participantesTest.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ExternalLink className="w-5 h-5 text-pink-600" /> 4️⃣ Abrir porras de prueba directamente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-3">
              Haz click en una porra para abrirla como si fueras ese usuario (token mágico):
            </p>
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {participantesTest.slice(0, 30).map(p => (
                <div key={p.id} className="flex flex-wrap items-center gap-2 p-3 bg-white border border-slate-200 rounded-lg text-sm hover:border-purple-300 hover:bg-purple-50/30">
                  <span className="flex-1 min-w-[120px] font-bold text-slate-800 truncate">{p.alias_equipo}</span>
                  <Badge variant="outline" className="text-xs">{p.porcentaje_completado || 0}%</Badge>
                  <Badge className="bg-purple-600 text-xs">{p.puntos_total || 0} pts</Badge>
                  {p.bloqueada && <Badge variant="destructive" className="text-xs"><Lock className="w-3 h-3 mr-1" />Bloqueada</Badge>}
                  <Button size="sm" variant="outline" onClick={() => copiarEnlace(p.token_acceso)} className="h-8">
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copiar enlace
                  </Button>
                  <Button size="sm" onClick={() => abrirComoUsuario(p.token_acceso)} className="h-8 bg-purple-600 hover:bg-purple-700">
                    <ExternalLink className="w-3.5 h-3.5 mr-1" /> Abrir porra
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* SECCIÓN 5: Flujo recomendado */}
      <Card className="border-2 border-amber-300 bg-amber-50">
        <CardContent className="p-5 text-sm">
          <h3 className="font-black text-amber-900 mb-2 flex items-center gap-1">
            <CheckCircle2 className="w-5 h-5" /> Flujo recomendado para una prueba completa
          </h3>
          <ol className="list-decimal pl-5 space-y-1 text-amber-900">
            <li>Genera <strong>10 participantes</strong> de prueba (sección 1)</li>
            <li>Abre uno o dos como si fueras el usuario (sección 4) y verifica el editor</li>
            <li>Ve a <strong>"Ver landing"</strong> y comprueba el contador y la landing</li>
            <li>Simula resultados de grupos (sección 2)</li>
            <li>Marca los <strong>"mejores terceros reales"</strong> en la pestaña Partidos</li>
            <li>Pulsa <strong>"Recalcular puntos"</strong> (sección 3)</li>
            <li>Ve a <strong>/PorraRanking</strong> para ver el resultado</li>
            <li>Cuando termines: <strong>borra todos los de prueba</strong> y <strong>limpia resultados</strong></li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
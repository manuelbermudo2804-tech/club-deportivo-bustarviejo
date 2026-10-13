import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trophy, Settings, Users, Save, RefreshCw, Eye, AlertCircle, Copy, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import PorraAdminConfig from "@/components/porra/admin/PorraAdminConfig";
import PorraAdminEquipos from "@/components/porra/admin/PorraAdminEquipos";
import PorraAdminPartidos from "@/components/porra/admin/PorraAdminPartidos";
import PorraAdminParticipantes from "@/components/porra/admin/PorraAdminParticipantes";
import PorraAdminRecalcular from "@/components/porra/admin/PorraAdminRecalcular";
import PorraAdminMejoresTercerosReales from "@/components/porra/admin/PorraAdminMejoresTercerosReales";
import PorraAdminResultadosFinales from "@/components/porra/admin/PorraAdminResultadosFinales";
import PorraAdminTesting from "@/components/porra/admin/PorraAdminTesting";
import PorraAdminCierre from "@/components/porra/admin/PorraAdminCierre";
import PorraAdminAvisoBracket from "@/components/porra/admin/PorraAdminAvisoBracket";
import PorraAdminEstadoBracket from "@/components/porra/admin/PorraAdminEstadoBracket";
import PorraAdminRanking from "@/components/porra/admin/PorraAdminRanking";

// Panel admin para gestionar la Porra Mundial 2026
export default function PorraAdmin() {
  const [config, setConfig] = useState(null);
  const [equipos, setEquipos] = useState([]);
  const [partidos, setPartidos] = useState([]);
  const [participantes, setParticipantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    cargarTodo();
  }, []);

  const cargarTodo = async () => {
    setLoading(true);
    try {
      const me = await base44.auth.me();
      setUser(me);
      if (me.role !== 'admin') {
        toast.error('Solo administradores');
        return;
      }
      const [cfgs, eqs, pts, parts] = await Promise.all([
        base44.entities.PorraConfig.list(),
        base44.entities.PorraEquipo.list('grupo', 100),
        base44.entities.PorraPartido.list('numero_partido', 200),
        base44.entities.PorraParticipante.list('-created_date', 500),
      ]);
      setConfig(cfgs[0] || null);
      setEquipos(eqs);
      setPartidos(pts);
      setParticipantes(parts);
    } catch (e) {
      console.error(e);
      toast.error('Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  const copiarUrlPublica = () => {
    const url = 'https://app.cdbustarviejo.com/porra';
    navigator.clipboard.writeText(url);
    toast.success('URL copiada al portapapeles');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-3" />
            <h2 className="text-xl font-bold">Acceso restringido</h2>
            <p className="text-slate-600 mt-2">Solo los administradores pueden acceder a este panel.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalPagados = participantes.filter(p => p.estado_pago === 'pagado').length;
  const recaudado = totalPagados * (config?.precio_entrada || 15);
  const comisionClub = recaudado * (config?.comision_club_porcentaje || 10) / 100;
  const bote = recaudado - comisionClub;

  return (
    <div className="min-h-screen w-full bg-slate-50 px-3 py-4 sm:px-5 lg:px-6">
      <div className="mx-auto w-full max-w-[1600px] space-y-5">
        {/* Cabecera común */}
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-lg sm:p-6 lg:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/15 ring-1 ring-orange-400/30">
                <Trophy className="h-6 w-6 text-orange-300" />
              </div>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Porra Mundial 2026</h1>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">Panel de gestión del torneo, participantes, resultados y premios.</p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
              <Button onClick={copiarUrlPublica} variant="secondary" className="w-full border border-white/20 bg-white/10 text-white hover:bg-white/20 sm:w-auto">
                <Copy className="mr-2 h-4 w-4" /> Copiar URL pública
              </Button>
              <Button onClick={() => window.open('/Porra', '_blank')} variant="secondary" className="w-full bg-orange-500 font-semibold text-white hover:bg-orange-400 sm:w-auto">
                <Eye className="mr-2 h-4 w-4" /> Ver landing
              </Button>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="text-xs text-slate-500 font-bold uppercase">Participantes</div>
              <div className="text-3xl font-black text-slate-900">{totalPagados}</div>
              <div className="text-xs text-slate-500">{participantes.length - totalPagados} pendientes</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="text-xs text-slate-500 font-bold uppercase">Recaudado</div>
              <div className="text-3xl font-black text-green-600">{recaudado.toFixed(0)}€</div>
              <div className="text-xs text-slate-500">{config?.precio_entrada || 15}€ x participante</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="text-xs text-slate-500 font-bold uppercase">Para el club</div>
              <div className="text-3xl font-black text-orange-600">{comisionClub.toFixed(0)}€</div>
              <div className="text-xs text-slate-500">{config?.comision_club_porcentaje || 10}% de comisión</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="text-xs text-slate-500 font-bold uppercase">Bote premios</div>
              <div className="text-3xl font-black text-purple-600">{bote.toFixed(0)}€</div>
              <div className="text-xs text-slate-500">60/25/15</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="ranking" className="space-y-4">
          {/* En móvil las pestañas se desplazan sin provocar desbordamiento de toda la página */}
          <div className="-mx-3 overflow-x-auto rounded-xl sm:mx-0">
            <TabsList className="flex h-auto w-max min-w-full gap-1 rounded-xl border border-slate-200 bg-white p-1.5 sm:w-full sm:flex-wrap sm:justify-start">
              <TabsTrigger value="ranking" className="flex-shrink-0 whitespace-nowrap data-[state=active]:bg-orange-100 data-[state=active]:text-orange-900"><Trophy className="w-4 h-4 mr-1" />Ranking</TabsTrigger>
              <TabsTrigger value="config" className="flex-shrink-0 whitespace-nowrap"><Settings className="w-4 h-4 mr-1" />Configuración</TabsTrigger>
              <TabsTrigger value="equipos" className="flex-shrink-0 whitespace-nowrap">🏳️ Equipos ({equipos.length})</TabsTrigger>
              <TabsTrigger value="partidos" className="flex-shrink-0 whitespace-nowrap">⚽ Partidos ({partidos.length})</TabsTrigger>
              <TabsTrigger value="resultados" className="flex-shrink-0 whitespace-nowrap data-[state=active]:bg-yellow-100 data-[state=active]:text-yellow-900"><Trophy className="w-4 h-4 mr-1" />🏆 Resultados</TabsTrigger>
              <TabsTrigger value="participantes" className="flex-shrink-0 whitespace-nowrap"><Users className="w-4 h-4 mr-1" />Participantes ({participantes.length})</TabsTrigger>
              <TabsTrigger value="estado" className="flex-shrink-0 whitespace-nowrap data-[state=active]:bg-blue-100 data-[state=active]:text-blue-900">📊 Estado Bracket</TabsTrigger>
              <TabsTrigger value="aviso" className="flex-shrink-0 whitespace-nowrap data-[state=active]:bg-amber-100 data-[state=active]:text-amber-900">📣 Aviso Bracket</TabsTrigger>
              <TabsTrigger value="cierre" className="flex-shrink-0 whitespace-nowrap data-[state=active]:bg-green-100 data-[state=active]:text-green-900">🏁 Cierre</TabsTrigger>
              <TabsTrigger value="testing" className="flex-shrink-0 whitespace-nowrap data-[state=active]:bg-purple-100 data-[state=active]:text-purple-900"><FlaskConical className="w-4 h-4 mr-1" />🧪 Pruebas</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="ranking">
            <PorraAdminRanking participantes={participantes} />
          </TabsContent>
          <TabsContent value="config">
            <PorraAdminConfig config={config} onUpdate={cargarTodo} />
          </TabsContent>
          <TabsContent value="equipos">
            <PorraAdminEquipos equipos={equipos} onUpdate={cargarTodo} />
          </TabsContent>
          <TabsContent value="partidos" className="space-y-4">
            <PorraAdminMejoresTercerosReales config={config} partidos={partidos} equipos={equipos} onUpdate={cargarTodo} />
            <PorraAdminPartidos partidos={partidos} equipos={equipos} todosLosEquipos={equipos} config={config} onUpdate={cargarTodo} />
          </TabsContent>
          <TabsContent value="resultados">
            <PorraAdminResultadosFinales config={config} equipos={equipos} onUpdate={cargarTodo} />
          </TabsContent>
          <TabsContent value="participantes" className="space-y-4">
            <PorraAdminRecalcular totalParticipantes={totalPagados} />
            <PorraAdminParticipantes participantes={participantes} config={config} onUpdate={cargarTodo} />
          </TabsContent>
          <TabsContent value="estado">
            <PorraAdminEstadoBracket participantes={participantes} />
          </TabsContent>
          <TabsContent value="aviso">
            <PorraAdminAvisoBracket participantes={participantes} onRefresh={cargarTodo} />
          </TabsContent>
          <TabsContent value="cierre">
            <PorraAdminCierre config={config} participantes={participantes} onUpdate={cargarTodo} />
          </TabsContent>
          <TabsContent value="testing">
            <PorraAdminTesting
              participantes={participantes}
              partidos={partidos}
              equipos={equipos}
              config={config}
              onUpdate={cargarTodo}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
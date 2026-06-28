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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-2xl p-6 shadow-xl">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2">
                <Trophy className="w-8 h-8 text-yellow-300" />
                Porra Mundial 2026 — Admin
              </h1>
              <p className="text-white/80 mt-1">Gestiona el torneo desde aquí</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={copiarUrlPublica} variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-white/30">
                <Copy className="w-4 h-4 mr-2" /> Copiar URL pública
              </Button>
              <Button onClick={() => window.open('/Porra', '_blank')} variant="secondary" className="bg-white text-red-700 hover:bg-yellow-100">
                <Eye className="w-4 h-4 mr-2" /> Ver landing
              </Button>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-white shadow">
            <CardContent className="p-4">
              <div className="text-xs text-slate-500 font-bold uppercase">Participantes</div>
              <div className="text-3xl font-black text-slate-900">{totalPagados}</div>
              <div className="text-xs text-slate-500">{participantes.length - totalPagados} pendientes</div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow">
            <CardContent className="p-4">
              <div className="text-xs text-slate-500 font-bold uppercase">Recaudado</div>
              <div className="text-3xl font-black text-green-600">{recaudado.toFixed(0)}€</div>
              <div className="text-xs text-slate-500">{config?.precio_entrada || 15}€ x participante</div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow">
            <CardContent className="p-4">
              <div className="text-xs text-slate-500 font-bold uppercase">Para el club</div>
              <div className="text-3xl font-black text-orange-600">{comisionClub.toFixed(0)}€</div>
              <div className="text-xs text-slate-500">{config?.comision_club_porcentaje || 10}% de comisión</div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow">
            <CardContent className="p-4">
              <div className="text-xs text-slate-500 font-bold uppercase">Bote premios</div>
              <div className="text-3xl font-black text-purple-600">{bote.toFixed(0)}€</div>
              <div className="text-xs text-slate-500">60/25/15</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="ranking">
          {/* En móvil: scroll horizontal con pestillas auto-ancho. En desktop (lg+): grid de 7 columnas */}
          <div className="-mx-4 md:mx-0 overflow-x-auto lg:overflow-visible scrollbar-thin">
            <TabsList className="flex w-max lg:w-full lg:grid lg:grid-cols-10 gap-1 px-4 lg:px-0">
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
            <PorraAdminPartidos partidos={partidos} equipos={equipos} config={config} onUpdate={cargarTodo} />
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
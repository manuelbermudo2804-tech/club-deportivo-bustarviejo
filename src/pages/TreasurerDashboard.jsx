import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import DashboardButtonSelector from "../components/dashboard/DashboardButtonSelector";
import { ALL_TREASURER_BUTTONS, DEFAULT_TREASURER_BUTTONS, MIN_BUTTONS, MAX_BUTTONS } from "../components/dashboard/TreasurerDashboardButtons";

import { 
  MessageCircle,
  Sparkles
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import ContactCard from "../components/ContactCard";
import AlertCenter from "../components/dashboard/AlertCenter";
import SocialLinks from "../components/SocialLinks";

export default function TreasurerDashboard() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [hasPlayers, setHasPlayers] = useState(false);
  const [myPlayers, setMyPlayers] = useState([]);
  const [loteriaVisible, setLoteriaVisible] = useState(false);

  const getCurrentSeason = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
  };

  const currentSeason = getCurrentSeason();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        
        // Verificar que sea tesorero
        if (currentUser.es_tesorero !== true) {
          console.error('❌ Usuario no es tesorero, redirigiendo...');
          window.location.href = createPageUrl('Home');
          return;
        }
        
        setUser(currentUser);
        
        const tienehijos = currentUser.tiene_hijos_jugando === true;
        setHasPlayers(tienehijos);
        
        // Si tiene hijos, cargar sus jugadores
        if (tienehijos) {
          const allPlayers = await base44.entities.Player.list();
          const myPlayersList = allPlayers.filter(p => 
            (p.email_padre === currentUser.email || p.email_tutor_2 === currentUser.email) && 
            p.activo === true
          );
          setMyPlayers(myPlayersList);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  // Fetch season config
  const { data: seasons = [] } = useQuery({
    queryKey: ['seasons'],
    queryFn: async () => {
      const configs = await base44.entities.SeasonConfig.list('-created_date');
      const activeConfig = configs.find(c => c.activa === true);
      setLoteriaVisible(activeConfig?.loteria_navidad_abierta === true);
      return configs;
    },
  });

  // Fetch payments
  const { data: payments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const allPayments = await base44.entities.Payment.list('-created_date');
      return allPayments.filter(p => p.is_deleted !== true);
    },
  });

  // Fetch button configuration
  const { data: buttonConfigs = [] } = useQuery({
    queryKey: ['dashboardButtonConfig', user?.email],
    queryFn: async () => {
      const configs = await base44.entities.DashboardButtonConfig.filter({ 
        user_email: user?.email,
        panel_type: "treasurer"
      });
      return configs;
    },
    staleTime: 600000,
    enabled: !!user,
  });

  const userButtonConfig = buttonConfigs[0];

  const saveButtonConfigMutation = useMutation({
    mutationFn: async (selectedButtonIds) => {
      if (userButtonConfig) {
        return await base44.entities.DashboardButtonConfig.update(userButtonConfig.id, {
          selected_buttons: selectedButtonIds
        });
      } else {
        return await base44.entities.DashboardButtonConfig.create({
          user_email: user?.email,
          panel_type: "treasurer",
          selected_buttons: selectedButtonIds
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardButtonConfig'] });
      toast.success("✅ Configuración guardada");
    },
  });



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
      <div className="px-4 lg:px-8 py-6 space-y-4 lg:space-y-6">
        <SocialLinks />
        
        {/* Header */}
        <div className="text-center lg:text-left">
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
            💰 Panel Tesorero
          </h1>
          <p className="text-slate-400 text-sm lg:text-base">
            {user?.full_name} - Gestión financiera del club
          </p>
        </div>

        {/* Banner de Mensajes - IDÉNTICO A OTROS DASHBOARDS */}
        <Card className="border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-purple-900">💬 Mensajes</h3>
                <p className="text-xs text-purple-700">Comunicación del club</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Link to={createPageUrl("Chatbot")} className="flex-1">
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg relative h-full flex flex-col justify-center">
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center animate-pulse">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                  <p className="text-sm font-bold text-center mb-1">🤖 Asistente</p>
                  <p className="text-xs text-indigo-100 text-center">Consulta IA</p>
                </div>
              </Link>

              {hasPlayers && (
                <>
                  <Link to={createPageUrl("ParentCoordinatorChat")} className="flex-1">
                    <div className="bg-gradient-to-br from-cyan-600 to-cyan-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg h-full flex flex-col justify-center">
                      <p className="text-sm font-bold text-center mb-1">💬 Coordinador</p>
                      <p className="text-xs text-cyan-100 text-center">Chat categoría</p>
                    </div>
                  </Link>

                  <Link to={createPageUrl("ParentCoachChat")} className="flex-1 col-span-2">
                    <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg h-full flex flex-col justify-center">
                      <p className="text-sm font-bold text-center mb-1">⚽ Entrenador</p>
                      <p className="text-xs text-blue-100 text-center">Chat equipo</p>
                    </div>
                  </Link>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* AlertCenter - Solo si tiene hijos */}
        {hasPlayers && myPlayers && myPlayers.length > 0 && payments && payments.length >= 0 && (() => {
          const normalizeSeason = (season) => {
            if (!season) return currentSeason;
            return season.replace(/-/g, '/');
          };
          
          const myPayments = payments.filter(p => 
            myPlayers.some(pl => pl.id === p.jugador_id) && 
            p.is_deleted !== true &&
            normalizeSeason(p.temporada) === normalizeSeason(currentSeason)
          );
          
          const pendientesCount = myPayments.filter(p => p.estado === "Pendiente").length;
          const revisionCount = myPayments.filter(p => p.estado === "En revisión").length;
          
          const now = new Date();
          let vencidosCount = 0;
          myPayments.forEach(payment => {
            if (payment.estado !== "Pagado") {
              const mes = payment.mes;
              const year = parseInt(currentSeason.split('/')[0]);
              let vencimiento;
              
              if (mes === "Junio") vencimiento = new Date(year, 5, 30);
              else if (mes === "Septiembre") vencimiento = new Date(year, 8, 15);
              else if (mes === "Diciembre") vencimiento = new Date(year, 11, 15);
              
              if (vencimiento && now >= vencimiento) vencidosCount++;
            }
          });
          
          const calcularEdad = (fechaNac) => {
            if (!fechaNac) return null;
            const hoy = new Date();
            const nacimiento = new Date(fechaNac);
            let edad = hoy.getFullYear() - nacimiento.getFullYear();
            const m = hoy.getMonth() - nacimiento.getMonth();
            if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
            return edad;
          };
          
          let firmasCount = 0;
          myPlayers.forEach(player => {
            if (player.enlace_firma_jugador && !player.firma_jugador_completada) firmasCount++;
            const esMayor = calcularEdad(player.fecha_nacimiento) >= 18;
            if (player.enlace_firma_tutor && !player.firma_tutor_completada && !esMayor) firmasCount++;
          });
          
          const userSports = [...new Set(myPlayers.map(p => p.deporte).filter(Boolean))];
          
          return (
            <AlertCenter 
              pendingCallups={0}
              pendingSignatures={firmasCount}
              pendingPayments={pendientesCount}
              paymentsInReview={revisionCount}
              overduePayments={vencidosCount}
              isParent={true}
              isTreasurer={true}
              userEmail={user?.email}
              userSports={userSports}
            />
          );
        })()}

        {/* Botón personalizar dashboard */}
        <div className="flex justify-end">
          <DashboardButtonSelector
            allButtons={ALL_TREASURER_BUTTONS.filter(b => !b.conditional || (b.conditionKey === "loteriaVisible" && loteriaVisible))}
            selectedButtonIds={userButtonConfig?.selected_buttons || DEFAULT_TREASURER_BUTTONS}
            onSave={(newConfig) => saveButtonConfigMutation.mutate(newConfig)}
            minButtons={MIN_BUTTONS}
            maxButtons={MAX_BUTTONS}
            defaultButtons={DEFAULT_TREASURER_BUTTONS}
            panelName="Panel Tesorero"
          />
        </div>

        {/* GRID DE BOTONES CENTRALES */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 stagger-animation">
          {(userButtonConfig?.selected_buttons || DEFAULT_TREASURER_BUTTONS)
            .map(id => ALL_TREASURER_BUTTONS.find(b => b.id === id))
            .filter(Boolean)
            .filter(b => !b.conditional || (b.conditionKey === "loteriaVisible" && loteriaVisible))
            .map((item, index) => (
            <Link key={index} to={item.url} className="group">
              <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-elegant-xl card-hover-glow transition-all duration-300 active:scale-95 border-2 border-slate-700 hover:border-orange-500 btn-hover-shine">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
                <div className={`absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl ${item.gradient} opacity-30 blur-2xl transition-opacity duration-300 group-hover:opacity-50`}></div>
                <div className={`absolute top-0 left-0 w-24 h-24 bg-gradient-to-br ${item.gradient} opacity-20 blur-xl transition-opacity duration-300 group-hover:opacity-40`}></div>
                <div className="relative z-10 p-4 lg:p-8 flex flex-col items-center justify-center min-h-[140px] lg:min-h-[200px]">
                  <div className={`w-12 h-12 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-3 lg:mb-4 shadow-2xl icon-hover-bounce transition-all duration-300`}>
                    <item.icon className="w-6 h-6 lg:w-10 lg:h-10 text-white transition-transform duration-300" />
                  </div>
                  <h3 className="text-white font-bold text-center text-sm lg:text-lg mb-2">{item.title}</h3>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <ContactCard />


          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* KPI: Tasa de Cobro */}
            <Card className="border-none shadow-2xl bg-gradient-to-br from-green-500 to-green-700">
              <CardContent className="pt-8 pb-8 text-center text-white">
                <Target className="w-12 h-12 mx-auto mb-3 opacity-90" />
                <p className="text-sm font-medium opacity-90 mb-2">Tasa de Cobro</p>
                <p className="text-5xl font-bold mb-1">
                  {stats.totalIngresos + stats.totalPendiente > 0 
                    ? ((stats.totalIngresos / (stats.totalIngresos + stats.totalPendiente)) * 100).toFixed(0) 
                    : 0}%
                </p>
                <p className="text-xs opacity-75">del total esperado</p>
              </CardContent>
            </Card>

            {/* KPI: Liquidez */}
            <Card className="border-none shadow-2xl bg-gradient-to-br from-blue-500 to-blue-700">
              <CardContent className="pt-8 pb-8 text-center text-white">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-90" />
                <p className="text-sm font-medium opacity-90 mb-2">Liquidez Actual</p>
                <p className="text-5xl font-bold mb-1">{liquidityStats.efectivoDisponible.toLocaleString()}€</p>
                <p className="text-xs opacity-75">efectivo disponible</p>
              </CardContent>
            </Card>

            {/* KPI: Crecimiento */}
            <Card className="border-none shadow-2xl bg-gradient-to-br from-purple-500 to-purple-700">
              <CardContent className="pt-8 pb-8 text-center text-white">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-90" />
                <p className="text-sm font-medium opacity-90 mb-2">Crecimiento</p>
                <p className="text-5xl font-bold mb-1">
                  {interannualComparison.length >= 2 
                    ? (((interannualComparison[0].cobrado - interannualComparison[1].cobrado) / interannualComparison[1].cobrado) * 100).toFixed(0)
                    : 0}%
                </p>
                <p className="text-xs opacity-75">vs temporada anterior</p>
              </CardContent>
            </Card>
          </div>

          {/* Resumen Visual */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-none shadow-lg">
              <CardContent className="pt-4 text-center">
                <ArrowUpRight className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-slate-600">Total Cobrado</p>
                <p className="text-2xl font-bold text-green-600">{stats.totalIngresos.toLocaleString()}€</p>
              </CardContent>
            </Card>
            
            <Card className="border-none shadow-lg">
              <CardContent className="pt-4 text-center">
                <ArrowDownRight className="w-8 h-8 text-red-600 mx-auto mb-2" />
                <p className="text-sm text-slate-600">Pendiente</p>
                <p className="text-2xl font-bold text-red-600">{stats.totalPendiente.toLocaleString()}€</p>
              </CardContent>
            </Card>
            
            <Card className="border-none shadow-lg">
              <CardContent className="pt-4 text-center">
                <Wallet className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-slate-600">Gastado</p>
                <p className="text-2xl font-bold text-blue-600">{liquidityStats.totalGastado.toLocaleString()}€</p>
              </CardContent>
            </Card>
            
            <Card className="border-none shadow-lg">
              <CardContent className="pt-4 text-center">
                <Building2 className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="text-sm text-slate-600">Patrocinios</p>
                <p className="text-2xl font-bold text-purple-600">{stats.patrocinios.toLocaleString()}€</p>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico Ingresos vs Gastos */}
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle>💰 Ingresos vs Gastos por Trimestre</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={quarterlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="trimestre" />
                  <YAxis />
                  <Tooltip formatter={(value) => `${value.toLocaleString()}€`} />
                  <Legend />
                  <Bar dataKey="ingresos" fill="#16a34a" name="Ingresos" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="gastos" fill="#dc2626" name="Gastos" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>


          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Wallet className="w-10 h-10 text-blue-600 mx-auto mb-3" />
                  <p className="text-sm text-blue-800 font-medium mb-1">Efectivo Disponible</p>
                  <p className="text-3xl font-bold text-blue-700">{liquidityStats.efectivoDisponible.toLocaleString()}€</p>
                  <p className="text-xs text-blue-600 mt-1">Cobrado - Gastado</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-green-100">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Clock className="w-10 h-10 text-green-600 mx-auto mb-3" />
                  <p className="text-sm text-green-800 font-medium mb-1">Esperado 7 días</p>
                  <p className="text-3xl font-bold text-green-700">{liquidityStats.proximos7dias.toLocaleString()}€</p>
                  <p className="text-xs text-green-600 mt-1">En revisión</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Calendar className="w-10 h-10 text-orange-600 mx-auto mb-3" />
                  <p className="text-sm text-orange-800 font-medium mb-1">Esperado 30 días</p>
                  <p className="text-3xl font-bold text-orange-700">{liquidityStats.proximos30dias.toLocaleString()}€</p>
                  <p className="text-xs text-orange-600 mt-1">Pendientes totales</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-gradient-to-br from-red-50 to-red-100">
              <CardContent className="pt-6">
                <div className="text-center">
                  <TrendingDown className="w-10 h-10 text-red-600 mx-auto mb-3" />
                  <p className="text-sm text-red-800 font-medium mb-1">Total Gastado</p>
                  <p className="text-3xl font-bold text-red-700">{liquidityStats.totalGastado.toLocaleString()}€</p>
                  <p className="text-xs text-red-600 mt-1">Gastos confirmados</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Flujo de Caja */}
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle>💧 Análisis de Flujo de Caja</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <span className="font-semibold">Efectivo Actual:</span>
                  <span className="text-2xl font-bold text-blue-700">{liquidityStats.efectivoDisponible.toLocaleString()}€</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <span className="font-semibold">+ Cobros Esperados (30 días):</span>
                  <span className="text-2xl font-bold text-green-700">+{liquidityStats.proximos30dias.toLocaleString()}€</span>
                </div>
                <div className="h-px bg-slate-300"></div>
                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                  <span className="font-semibold text-lg">Proyección Liquidez:</span>
                  <span className="text-3xl font-bold text-purple-700">{(liquidityStats.efectivoDisponible + liquidityStats.proximos30dias).toLocaleString()}€</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gastos por Categoría */}
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle>📊 Desglose de Gastos</CardTitle>
            </CardHeader>
            <CardContent>
              {expensesByCategory.length > 0 ? (
                <div className="space-y-3">
                  {expensesByCategory.map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{cat.name}</span>
                      <span className="text-lg font-bold text-red-600">{cat.value.toLocaleString()}€</span>
                    </div>
                  ))}
                  <div className="pt-3 border-t">
                    <div className="flex items-center justify-between">
                      <span className="font-bold">TOTAL GASTADO:</span>
                      <span className="text-2xl font-bold text-red-700">{liquidityStats.totalGastado.toLocaleString()}€</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-slate-500 py-8">No hay gastos registrados</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>


          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle>📈 Comparativa de Temporadas</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={interannualComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="temporada" />
                  <YAxis />
                  <Tooltip formatter={(value) => `${value.toLocaleString()}€`} />
                  <Legend />
                  <Bar dataKey="cobrado" fill="#16a34a" name="Cobrado" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pendiente" fill="#dc2626" name="Pendiente" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {interannualComparison.map((season, idx) => {
              const isCurrentSeason = season.temporada === currentSeason;
              const prevSeason = interannualComparison[idx + 1];
              const crecimiento = prevSeason ? (((season.cobrado - prevSeason.cobrado) / prevSeason.cobrado) * 100).toFixed(1) : null;
              
              return (
                <Card key={season.temporada} className={`border-2 ${isCurrentSeason ? 'border-green-300 bg-green-50' : 'border-slate-200'}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-bold text-slate-900">{season.temporada}</p>
                      {isCurrentSeason && <Badge className="bg-green-600">Actual</Badge>}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Cobrado:</span>
                        <span className="font-bold text-green-600">{season.cobrado.toLocaleString()}€</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Pendiente:</span>
                        <span className="font-bold text-red-600">{season.pendiente.toLocaleString()}€</span>
                      </div>
                      <div className="flex justify-between text-sm pt-2 border-t">
                        <span className="font-bold">Total:</span>
                        <span className="font-bold">{season.total.toLocaleString()}€</span>
                      </div>
                      {crecimiento !== null && (
                        <div className={`text-center text-sm font-bold ${parseFloat(crecimiento) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {parseFloat(crecimiento) >= 0 ? '↑' : '↓'} {Math.abs(crecimiento)}% vs anterior
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* TAB: RANKING */}
        <TabsContent value="ranking" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Pagadores */}
            <Card className="border-2 border-green-300">
              <CardHeader className="bg-green-50">
                <CardTitle className="flex items-center gap-2 text-green-900">
                  <Award className="w-6 h-6" />
                  🏆 Mejores Pagadores
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {topPayersStats.topPayers.length > 0 ? (
                  <div className="space-y-3">
                    {topPayersStats.topPayers.map((family, idx) => (
                      <div key={family.email} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                          idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-orange-600' : 'bg-green-600'
                        }`}>
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-slate-900">{family.nombre}</p>
                          <p className="text-xs text-slate-600">{family.jugadores.length} jugador(es)</p>
                        </div>
                        <p className="text-lg font-bold text-green-700">{family.totalPagado.toLocaleString()}€</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-slate-500 py-8">No hay datos</p>
                )}
              </CardContent>
            </Card>

            {/* Top Deudores */}
            <Card className="border-2 border-red-300">
              <CardHeader className="bg-red-50">
                <CardTitle className="flex items-center gap-2 text-red-900">
                  <AlertCircle className="w-6 h-6" />
                  ⚠️ Mayores Deudas
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {topPayersStats.topDebtors.length > 0 ? (
                  <div className="space-y-3">
                    {topPayersStats.topDebtors.map((family, idx) => (
                      <div key={family.email} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center font-bold text-white">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-slate-900">{family.nombre}</p>
                          <p className="text-xs text-slate-600">{family.jugadores.length} jugador(es)</p>
                        </div>
                        <p className="text-lg font-bold text-red-700">{family.totalPendiente.toLocaleString()}€</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                    <p className="text-green-700 font-semibold">¡No hay deudas!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>


          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart - Income by Concept */}
            <Card className="border-none shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg">Ingresos por Concepto</CardTitle>
              </CardHeader>
              <CardContent>
                {incomeByConceptData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={incomeByConceptData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value.toLocaleString()}€`}
                        outerRadius={90}
                        dataKey="value"
                      >
                        {incomeByConceptData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value.toLocaleString()}€`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-slate-500">
                    No hay datos de ingresos
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bar Chart - Monthly Income */}
            <Card className="border-none shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg">Cuotas por Mes</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={monthlyIncomeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${value.toLocaleString()}€`} />
                    <Bar dataKey="cuotas" fill={COLORS.cuotas} name="Cuotas" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Concept Breakdown */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-slate-900">Cuotas</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Cobrado:</span>
                    <span className="font-medium text-green-600">{stats.cuotas.pagadas.toLocaleString()}€</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Pendiente:</span>
                    <span className="font-medium text-red-600">{(stats.cuotas.pendientes + stats.cuotas.revision).toLocaleString()}€</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingBag className="w-5 h-5 text-orange-600" />
                  <span className="font-semibold text-slate-900">Ropa</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Cobrado:</span>
                    <span className="font-medium text-green-600">{stats.ropa.pagada.toLocaleString()}€</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Pendiente:</span>
                    <span className="font-medium text-red-600">{stats.ropa.pendiente.toLocaleString()}€</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clover className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-slate-900">Lotería</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Cobrado:</span>
                    <span className="font-medium text-green-600">{stats.loteria.pagada.toLocaleString()}€</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Pendiente:</span>
                    <span className="font-medium text-red-600">{stats.loteria.pendiente.toLocaleString()}€</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-5 h-5 text-purple-600" />
                  <span className="font-semibold text-slate-900">Patrocinios</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total:</span>
                    <span className="font-medium text-purple-600">{stats.patrocinios.toLocaleString()}€</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Activos:</span>
                    <span className="font-medium">{sponsors.filter(s => s.estado === "Activo").length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-pink-500">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-pink-600" />
                  <span className="font-semibold text-slate-900">Socios</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Cobrado:</span>
                    <span className="font-medium text-green-600">{(stats.socios?.pagados || 0).toLocaleString()}€</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Pendiente:</span>
                    <span className="font-medium text-red-600">{(stats.socios?.pendientes || 0).toLocaleString()}€</span>
                  </div>
                  {stats.socios?.revision > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">En revisión:</span>
                      <span className="font-medium text-yellow-600">{stats.socios.revision}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total socios:</span>
                    <span className="font-medium">{stats.socios?.total || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>


          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Wallet className="h-5 w-5 text-orange-600" />
                Gestión de Presupuestos - Temporada {currentSeason}
              </h2>
            </div>
            {(() => {
            const currentActiveBudget = budgets?.find(b => b.activo && b.temporada === currentSeason) || budgets?.[0];
            return !currentActiveBudget && (
              <Button 
                onClick={() => {
                  setNewBudgetData({ temporada: currentSeason, nombre: "Presupuesto Principal" });
                  setShowNewBudget(true);
                }}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear Presupuesto
              </Button>
            );
          })()}
          </div>

          {(() => {
            const currentActiveBudget = budgets?.find(b => b.activo && b.temporada === currentSeason) || budgets?.[0];
            return currentActiveBudget ? (
              <BudgetManager
                budget={currentActiveBudget}
                onUpdate={handleUpdateBudget}
                historicalTransactions={financialTransactions}
                historicalBudgets={budgets}
              />
            ) : (
              <Card className="border-dashed border-2">
                <CardContent className="p-12 text-center">
                  <Wallet className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    No hay presupuesto para esta temporada
                  </h3>
                  <p className="text-slate-600 mb-4">
                    Crea un presupuesto para gestionar ingresos y gastos del club
                  </p>
                  <Button 
                    onClick={() => {
                      setNewBudgetData({ temporada: currentSeason, nombre: "Presupuesto Principal" });
                      setShowNewBudget(true);
                    }}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Presupuesto
                  </Button>
                </CardContent>
              </Card>
            );
          })()}
        </TabsContent>


          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="h-5 w-5 text-green-600" />
              Movimientos Financieros - {currentSeason}
            </h2>
            <Button 
              onClick={() => setShowTransactionForm(!showTransactionForm)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Movimiento
            </Button>
          </div>

          {showTransactionForm ? (
            <TransactionForm
              partidas={(() => {
                const currentActiveBudget = budgets?.find(b => b.activo && b.temporada === currentSeason) || budgets?.[0];
                return currentActiveBudget?.partidas || [];
              })()}
              temporada={currentSeason}
              onSubmit={(data) => createTransactionMutation.mutate(data)}
              onCancel={() => setShowTransactionForm(false)}
              isSubmitting={createTransactionMutation.isPending}
            />
          ) : (
            <TransactionList
              transactions={financialTransactions.filter(t => t.temporada === currentSeason)}
              onDelete={(id) => deleteTransactionMutation.mutate(id)}
              onExport={handleExportFinancialTransactions}
            />
          )}

          {/* Documentos adjuntos */}
          {financialTransactions.filter(t => t.documento_url && t.temporada === currentSeason).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-orange-600" />
                  Documentos y Facturas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {financialTransactions
                    .filter(t => t.documento_url && t.temporada === currentSeason)
                    .slice(0, 8)
                    .map(t => (
                      <Card key={t.id} className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => window.open(t.documento_url, '_blank')}>
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-orange-600 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium text-xs truncate">{t.documento_nombre || "Documento"}</p>
                              <p className="text-[10px] text-slate-500 truncate">{t.concepto}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>


          <Card className="border-2 border-purple-300 bg-purple-50 mb-4">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 mb-4">
                <Upload className="w-8 h-8 text-purple-600" />
                <div className="flex-1">
                  <h3 className="font-bold text-purple-900">Importar Extracto Bancario</h3>
                  <p className="text-sm text-purple-700">Sube tu extracto en formato CSV para conciliar automáticamente</p>
                </div>
                <Button
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.csv';
                    input.onchange = (e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setUploadedBankStatement(file);
                        toast.success("Archivo cargado - funcionalidad próximamente");
                      }
                    };
                    input.click();
                  }}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Subir CSV
                </Button>
              </div>
              {uploadedBankStatement && (
                <div className="bg-white rounded-lg p-3 border-2 border-purple-300">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium">{uploadedBankStatement.name}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <AIReconciliation
            payments={payments}
            players={players}
            financialTransactions={financialTransactions}
            onReconcile={() => {
              queryClient.invalidateQueries({ queryKey: ['payments'] });
              queryClient.invalidateQueries({ queryKey: ['financialTransactions'] });
            }}
          />
        </TabsContent>


          <Card className="border-none shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                Jugadores con Pagos Pendientes ({pendingDebts.length})
              </CardTitle>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowCommunicationAssistant(true)}
                  className="border-purple-300 text-purple-700 hover:bg-purple-50"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Enviar Recordatorios IA
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportToCSV("deudas")}>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {pendingDebts.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
                  <p>¡No hay deudas pendientes!</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {pendingDebts.map((debt) => (
                    <div key={debt.jugador_id} className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">{debt.jugador_nombre}</p>
                          <p className="text-xs text-slate-600">{debt.deporte}</p>
                          {debt.email_padre && (
                            <p className="text-xs text-slate-500 mt-1">📧 {debt.email_padre}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-red-600">{debt.deuda_total.toLocaleString()}€</p>
                          <Badge variant="outline" className="text-red-600 border-red-300">
                            {debt.pagos_pendientes.length} pago(s)
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {debt.pagos_pendientes.map((p, idx) => (
                          <Badge key={idx} className="bg-red-100 text-red-700 text-xs">
                            {p.mes}: {p.cantidad}€
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>


          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Generar Informes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-2 border-dashed border-blue-300 hover:border-blue-500 transition-colors">
                  <CardContent className="pt-6 text-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <DollarSign className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-1">Resumen Financiero</h3>
                    <p className="text-xs text-slate-600 mb-3">Ingresos y pendientes por concepto</p>
                    <div className="flex gap-2">
                      <Button className="flex-1 bg-blue-600 hover:bg-blue-700" size="sm" onClick={() => exportToCSV("resumen")}>
                        <Download className="w-3 h-3 mr-1" />
                        CSV
                      </Button>
                      <Button className="flex-1 bg-blue-800 hover:bg-blue-900" size="sm" onClick={() => exportToPDF("resumen")}>
                        <FileText className="w-3 h-3 mr-1" />
                        PDF
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-dashed border-red-300 hover:border-red-500 transition-colors">
                  <CardContent className="pt-6 text-center">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <AlertCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-1">Listado de Deudas</h3>
                    <p className="text-xs text-slate-600 mb-3">Jugadores con pagos pendientes</p>
                    <div className="flex gap-2">
                      <Button className="flex-1 bg-red-600 hover:bg-red-700" size="sm" onClick={() => exportToCSV("deudas")}>
                        <Download className="w-3 h-3 mr-1" />
                        CSV
                      </Button>
                      <Button className="flex-1 bg-red-800 hover:bg-red-900" size="sm" onClick={() => exportToPDF("deudas")}>
                        <FileText className="w-3 h-3 mr-1" />
                        PDF
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-dashed border-green-300 hover:border-green-500 transition-colors">
                  <CardContent className="pt-6 text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Receipt className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-1">Transacciones</h3>
                    <p className="text-xs text-slate-600 mb-3">Historial de cobros recientes</p>
                    <div className="flex gap-2">
                      <Button className="flex-1 bg-green-600 hover:bg-green-700" size="sm" onClick={() => exportToCSV("transacciones")}>
                        <Download className="w-3 h-3 mr-1" />
                        CSV
                      </Button>
                      <Button className="flex-1 bg-green-800 hover:bg-green-900" size="sm" onClick={() => exportToPDF("transacciones")}>
                        <FileText className="w-3 h-3 mr-1" />
                        PDF
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900 mb-2">💡 Consejo:</p>
                <p>Los informes se generan con los datos de la temporada seleccionada ({selectedSeason === "all" ? "todas las temporadas" : selectedSeason}). Puedes cambiar el filtro en la parte superior de la página.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

    </div>
  );
}
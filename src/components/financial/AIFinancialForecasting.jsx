import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ReferenceLine, ComposedChart
} from "recharts";
import {
  Sparkles, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  Loader2, RefreshCw, Calendar, DollarSign, PiggyBank, Target,
  Lightbulb, ArrowUpRight, ArrowDownRight, Zap, Scale, Wallet,
  Users, CreditCard, Building2, ChevronRight, Info
} from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default function AIFinancialForecasting({ open, onClose }) {
  const [activeTab, setActiveTab] = useState("forecast");
  const [loading, setLoading] = useState(false);
  const [forecastData, setForecastData] = useState(null);
  const [cashFlowData, setCashFlowData] = useState(null);
  const [scenarioResults, setScenarioResults] = useState(null);
  const [insights, setInsights] = useState(null);
  const [forecastMonths, setForecastMonths] = useState(6);
  
  // Scenario parameters
  const [scenario, setScenario] = useState({
    type: "membership_increase",
    feeChangePercent: 10,
    newSponsorAmount: 5000,
    newMembersCount: 20,
    eventRevenue: 3000,
    costReductionPercent: 10
  });

  // Fetch historical data
  const { data: payments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list('-created_date'),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['financialTransactions'],
    queryFn: () => base44.entities.FinancialTransaction.list('-fecha'),
  });

  const { data: players = [] } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
  });

  const { data: sponsors = [] } = useQuery({
    queryKey: ['sponsors'],
    queryFn: () => base44.entities.Sponsor.list(),
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => base44.entities.Budget.list(),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list(),
  });

  // Calculate historical monthly data
  const historicalData = useMemo(() => {
    const monthlyData = {};
    
    // Process payments
    payments.filter(p => p.estado === "Pagado" && p.fecha_pago).forEach(p => {
      const date = new Date(p.fecha_pago);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[key]) {
        monthlyData[key] = { ingresos: 0, gastos: 0, cuotas: 0, ropa: 0, patrocinios: 0, otros: 0 };
      }
      monthlyData[key].ingresos += p.cantidad || 0;
      monthlyData[key].cuotas += p.cantidad || 0;
    });

    // Process transactions
    transactions.forEach(t => {
      if (!t.fecha) return;
      const date = new Date(t.fecha);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[key]) {
        monthlyData[key] = { ingresos: 0, gastos: 0, cuotas: 0, ropa: 0, patrocinios: 0, otros: 0 };
      }
      if (t.tipo === "Ingreso") {
        monthlyData[key].ingresos += t.cantidad || 0;
        if (t.categoria?.includes("Patrocinio")) {
          monthlyData[key].patrocinios += t.cantidad || 0;
        } else {
          monthlyData[key].otros += t.cantidad || 0;
        }
      } else {
        monthlyData[key].gastos += t.cantidad || 0;
      }
    });

    // Convert to array and sort
    return Object.entries(monthlyData)
      .map(([key, data]) => ({
        mes: key,
        label: MONTHS[parseInt(key.split('-')[1]) - 1] + " " + key.split('-')[0].slice(2),
        ...data,
        balance: data.ingresos - data.gastos
      }))
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .slice(-12); // Last 12 months
  }, [payments, transactions]);

  // Current financial summary
  const currentSummary = useMemo(() => {
    const activePlayers = players.filter(p => p.activo).length;
    const activeSponsors = sponsors.filter(s => s.estado === "Activo");
    const sponsorTotal = activeSponsors.reduce((sum, s) => sum + (s.monto || 0), 0);
    const pendingPayments = payments.filter(p => p.estado === "Pendiente").reduce((sum, p) => sum + (p.cantidad || 0), 0);
    const paidPayments = payments.filter(p => p.estado === "Pagado").reduce((sum, p) => sum + (p.cantidad || 0), 0);
    
    const lastMonthData = historicalData.slice(-3);
    const avgMonthlyIncome = lastMonthData.reduce((sum, d) => sum + d.ingresos, 0) / (lastMonthData.length || 1);
    const avgMonthlyExpense = lastMonthData.reduce((sum, d) => sum + d.gastos, 0) / (lastMonthData.length || 1);

    return {
      activePlayers,
      activeSponsors: activeSponsors.length,
      sponsorTotal,
      pendingPayments,
      paidPayments,
      avgMonthlyIncome,
      avgMonthlyExpense,
      avgMonthlyBalance: avgMonthlyIncome - avgMonthlyExpense
    };
  }, [players, sponsors, payments, historicalData]);

  // Generate AI Forecast
  const generateForecast = async () => {
    setLoading(true);
    try {
      const prompt = `Eres un analista financiero experto para un club deportivo (CD Bustarviejo).
Analiza los siguientes datos históricos y genera una previsión financiera para los próximos ${forecastMonths} meses.

DATOS HISTÓRICOS (últimos 12 meses):
${JSON.stringify(historicalData)}

SITUACIÓN ACTUAL:
- Jugadores activos: ${currentSummary.activePlayers}
- Patrocinadores activos: ${currentSummary.activeSponsors} (total: ${currentSummary.sponsorTotal}€)
- Pagos pendientes: ${currentSummary.pendingPayments}€
- Media mensual ingresos: ${currentSummary.avgMonthlyIncome.toFixed(0)}€
- Media mensual gastos: ${currentSummary.avgMonthlyExpense.toFixed(0)}€

EVENTOS PRÓXIMOS:
${JSON.stringify(events.filter(e => new Date(e.fecha) > new Date()).slice(0, 5).map(e => ({
  titulo: e.titulo,
  fecha: e.fecha,
  tipo: e.tipo
})))}

PRESUPUESTO ACTUAL:
${budgets[0] ? JSON.stringify({
  ingresos_presupuestados: budgets[0].total_presupuestado_ingresos,
  gastos_presupuestados: budgets[0].total_presupuestado_gastos,
  partidas: budgets[0].partidas?.slice(0, 10)
}) : "No hay presupuesto definido"}

Considera:
1. Estacionalidad (temporada deportiva Sep-Jun, inscripciones Jun-Jul, vacaciones Ago)
2. Patrones de pago (cuotas en Sep, Dic, Mar)
3. Eventos del club y su impacto económico
4. Tendencias de crecimiento/decrecimiento

Genera predicciones mensuales realistas.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            predicciones_mensuales: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  mes: { type: "string" },
                  ingresos_previstos: { type: "number" },
                  gastos_previstos: { type: "number" },
                  balance_previsto: { type: "number" },
                  confianza: { type: "number", description: "0-100" },
                  notas: { type: "string" }
                }
              }
            },
            tendencia_general: {
              type: "string",
              enum: ["positiva", "estable", "negativa"]
            },
            riesgos_detectados: {
              type: "array",
              items: { type: "string" }
            },
            oportunidades: {
              type: "array",
              items: { type: "string" }
            },
            resumen_ejecutivo: { type: "string" }
          }
        }
      });

      setForecastData(response);
      toast.success("Previsión generada");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al generar previsión");
    } finally {
      setLoading(false);
    }
  };

  // Generate Cash Flow Forecast
  const generateCashFlow = async () => {
    setLoading(true);
    try {
      const prompt = `Analiza el flujo de caja del club deportivo CD Bustarviejo.

DATOS HISTÓRICOS:
${JSON.stringify(historicalData)}

SITUACIÓN ACTUAL:
- Ingresos pendientes de cobro: ${currentSummary.pendingPayments}€
- Media mensual de ingresos: ${currentSummary.avgMonthlyIncome.toFixed(0)}€
- Media mensual de gastos: ${currentSummary.avgMonthlyExpense.toFixed(0)}€

Genera una previsión de flujo de caja para los próximos 6 meses, identificando:
1. Meses con posible déficit de liquidez
2. Meses con superávit
3. Recomendaciones para gestionar el flujo de caja
4. Alertas de tesorería`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            flujo_mensual: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  mes: { type: "string" },
                  entradas: { type: "number" },
                  salidas: { type: "number" },
                  saldo_neto: { type: "number" },
                  saldo_acumulado: { type: "number" },
                  estado: { type: "string", enum: ["positivo", "ajustado", "deficit"] }
                }
              }
            },
            meses_criticos: {
              type: "array",
              items: { type: "string" }
            },
            recomendaciones_liquidez: {
              type: "array",
              items: { type: "string" }
            },
            reserva_recomendada: { type: "number" },
            salud_financiera: {
              type: "string",
              enum: ["excelente", "buena", "aceptable", "preocupante", "critica"]
            }
          }
        }
      });

      setCashFlowData(response);
      toast.success("Análisis de flujo de caja completado");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al analizar flujo de caja");
    } finally {
      setLoading(false);
    }
  };

  // Generate Scenario Analysis
  const generateScenarioAnalysis = async () => {
    setLoading(true);
    try {
      let scenarioDescription = "";
      switch (scenario.type) {
        case "membership_increase":
          scenarioDescription = `Subida de cuotas del ${scenario.feeChangePercent}%`;
          break;
        case "new_sponsor":
          scenarioDescription = `Nuevo patrocinador con aportación de ${scenario.newSponsorAmount}€`;
          break;
        case "member_growth":
          scenarioDescription = `Captación de ${scenario.newMembersCount} nuevos jugadores`;
          break;
        case "event_revenue":
          scenarioDescription = `Organización de evento con ingresos previstos de ${scenario.eventRevenue}€`;
          break;
        case "cost_reduction":
          scenarioDescription = `Reducción de costes del ${scenario.costReductionPercent}%`;
          break;
      }

      const prompt = `Analiza el impacto financiero del siguiente escenario para el club deportivo:

ESCENARIO: ${scenarioDescription}

SITUACIÓN ACTUAL:
- Jugadores activos: ${currentSummary.activePlayers}
- Ingresos mensuales medios: ${currentSummary.avgMonthlyIncome.toFixed(0)}€
- Gastos mensuales medios: ${currentSummary.avgMonthlyExpense.toFixed(0)}€
- Patrocinios actuales: ${currentSummary.sponsorTotal}€
- Pagos pendientes: ${currentSummary.pendingPayments}€

PARÁMETROS DEL ESCENARIO:
${JSON.stringify(scenario)}

Calcula el impacto financiero detallado, considerando:
1. Impacto directo en ingresos/gastos
2. Efectos secundarios (ej: subir cuotas puede causar bajas)
3. Horizonte temporal del impacto
4. Riesgos asociados
5. Probabilidad de éxito`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            escenario_nombre: { type: "string" },
            impacto_anual: {
              type: "object",
              properties: {
                ingresos_adicionales: { type: "number" },
                gastos_adicionales: { type: "number" },
                beneficio_neto: { type: "number" }
              }
            },
            impacto_mensual: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  mes: { type: "number" },
                  impacto_ingresos: { type: "number" },
                  impacto_gastos: { type: "number" }
                }
              }
            },
            probabilidad_exito: { type: "number" },
            tiempo_implementacion: { type: "string" },
            riesgos: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  riesgo: { type: "string" },
                  probabilidad: { type: "string" },
                  impacto: { type: "string" }
                }
              }
            },
            requisitos: {
              type: "array",
              items: { type: "string" }
            },
            recomendacion: { type: "string" },
            puntuacion_viabilidad: { type: "number", description: "1-10" }
          }
        }
      });

      setScenarioResults(response);
      toast.success("Análisis de escenario completado");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al analizar escenario");
    } finally {
      setLoading(false);
    }
  };

  // Generate AI Insights
  const generateInsights = async () => {
    setLoading(true);
    try {
      const prompt = `Eres un consultor financiero experto para clubes deportivos.
Analiza la situación financiera del CD Bustarviejo y proporciona insights accionables.

DATOS HISTÓRICOS:
${JSON.stringify(historicalData)}

SITUACIÓN ACTUAL:
- Jugadores activos: ${currentSummary.activePlayers}
- Patrocinadores: ${currentSummary.activeSponsors} (${currentSummary.sponsorTotal}€)
- Pagos pendientes: ${currentSummary.pendingPayments}€
- Balance mensual medio: ${currentSummary.avgMonthlyBalance.toFixed(0)}€

PRESUPUESTO:
${budgets[0] ? JSON.stringify({
  partidas: budgets[0].partidas,
  ejecutado_ingresos: budgets[0].total_ejecutado_ingresos,
  ejecutado_gastos: budgets[0].total_ejecutado_gastos
}) : "Sin presupuesto"}

Proporciona:
1. Análisis DAFO financiero
2. 5 recomendaciones priorizadas para mejorar la situación financiera
3. Oportunidades de optimización de costes
4. Estrategias para aumentar ingresos
5. KPIs clave a monitorizar`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            dafo: {
              type: "object",
              properties: {
                debilidades: { type: "array", items: { type: "string" } },
                amenazas: { type: "array", items: { type: "string" } },
                fortalezas: { type: "array", items: { type: "string" } },
                oportunidades: { type: "array", items: { type: "string" } }
              }
            },
            recomendaciones: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  titulo: { type: "string" },
                  descripcion: { type: "string" },
                  impacto_estimado: { type: "string" },
                  prioridad: { type: "string", enum: ["alta", "media", "baja"] },
                  plazo: { type: "string" },
                  dificultad: { type: "string", enum: ["facil", "media", "dificil"] }
                }
              }
            },
            optimizacion_costes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  area: { type: "string" },
                  ahorro_potencial: { type: "string" },
                  accion: { type: "string" }
                }
              }
            },
            estrategias_ingresos: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  estrategia: { type: "string" },
                  ingresos_potenciales: { type: "string" },
                  esfuerzo: { type: "string" }
                }
              }
            },
            kpis_clave: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  kpi: { type: "string" },
                  valor_actual: { type: "string" },
                  objetivo: { type: "string" },
                  frecuencia_revision: { type: "string" }
                }
              }
            },
            puntuacion_salud_financiera: { type: "number", description: "1-100" },
            resumen: { type: "string" }
          }
        }
      });

      setInsights(response);
      toast.success("Insights generados");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al generar insights");
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data for forecast
  const forecastChartData = useMemo(() => {
    if (!forecastData?.predicciones_mensuales) return [];
    
    const combined = [...historicalData.slice(-6)];
    
    forecastData.predicciones_mensuales.forEach((pred, idx) => {
      combined.push({
        mes: pred.mes,
        label: pred.mes,
        ingresos: null,
        gastos: null,
        ingresos_previstos: pred.ingresos_previstos,
        gastos_previstos: pred.gastos_previstos,
        balance_previsto: pred.balance_previsto,
        isForecast: true
      });
    });

    return combined;
  }, [historicalData, forecastData]);

  // Cash flow chart data
  const cashFlowChartData = useMemo(() => {
    if (!cashFlowData?.flujo_mensual) return [];
    return cashFlowData.flujo_mensual.map(f => ({
      ...f,
      color: f.estado === "positivo" ? "#16a34a" : f.estado === "deficit" ? "#dc2626" : "#f59e0b"
    }));
  }, [cashFlowData]);

  const getHealthColor = (health) => {
    const colors = {
      excelente: "text-green-600 bg-green-100",
      buena: "text-blue-600 bg-blue-100",
      aceptable: "text-yellow-600 bg-yellow-100",
      preocupante: "text-orange-600 bg-orange-100",
      critica: "text-red-600 bg-red-100"
    };
    return colors[health] || colors.aceptable;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Análisis Financiero Avanzado con IA
          </DialogTitle>
        </DialogHeader>

        {/* Current Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="text-xs text-blue-800">Jugadores</span>
              </div>
              <p className="text-xl font-bold text-blue-700">{currentSummary.activePlayers}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-xs text-green-800">Ing. Medio/Mes</span>
              </div>
              <p className="text-xl font-bold text-green-700">{currentSummary.avgMonthlyIncome.toFixed(0)}€</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span className="text-xs text-red-800">Gasto Medio/Mes</span>
              </div>
              <p className="text-xl font-bold text-red-700">{currentSummary.avgMonthlyExpense.toFixed(0)}€</p>
            </CardContent>
          </Card>
          <Card className={`bg-gradient-to-br ${currentSummary.avgMonthlyBalance >= 0 ? 'from-emerald-50 to-emerald-100' : 'from-orange-50 to-orange-100'}`}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="h-4 w-4" />
                <span className="text-xs">Balance Medio</span>
              </div>
              <p className={`text-xl font-bold ${currentSummary.avgMonthlyBalance >= 0 ? 'text-emerald-700' : 'text-orange-700'}`}>
                {currentSummary.avgMonthlyBalance >= 0 ? '+' : ''}{currentSummary.avgMonthlyBalance.toFixed(0)}€
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="forecast" className="flex-1">
              <TrendingUp className="h-4 w-4 mr-2" />
              Previsión
            </TabsTrigger>
            <TabsTrigger value="cashflow" className="flex-1">
              <PiggyBank className="h-4 w-4 mr-2" />
              Flujo Caja
            </TabsTrigger>
            <TabsTrigger value="scenarios" className="flex-1">
              <Scale className="h-4 w-4 mr-2" />
              Escenarios
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex-1">
              <Lightbulb className="h-4 w-4 mr-2" />
              Insights
            </TabsTrigger>
          </TabsList>

          {/* Forecast Tab */}
          <TabsContent value="forecast" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Previsión de Ingresos y Gastos</h3>
                <p className="text-sm text-slate-500">Proyección basada en datos históricos y estacionalidad</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Meses:</Label>
                  <Select value={String(forecastMonths)} onValueChange={(v) => setForecastMonths(Number(v))}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="6">6</SelectItem>
                      <SelectItem value="12">12</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={generateForecast} disabled={loading} className="bg-purple-600 hover:bg-purple-700">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Generar Previsión
                </Button>
              </div>
            </div>

            {/* Historical Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Histórico y Previsión</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={forecastChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => v ? `${v.toLocaleString()}€` : '-'} />
                    <Legend />
                    <Bar dataKey="ingresos" name="Ingresos (real)" fill="#16a34a" />
                    <Bar dataKey="gastos" name="Gastos (real)" fill="#dc2626" />
                    <Line type="monotone" dataKey="ingresos_previstos" name="Ingresos (prev.)" stroke="#22c55e" strokeDasharray="5 5" strokeWidth={2} />
                    <Line type="monotone" dataKey="gastos_previstos" name="Gastos (prev.)" stroke="#ef4444" strokeDasharray="5 5" strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {forecastData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className={`border-l-4 ${forecastData.tendencia_general === 'positiva' ? 'border-l-green-500' : forecastData.tendencia_general === 'negativa' ? 'border-l-red-500' : 'border-l-yellow-500'}`}>
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      {forecastData.tendencia_general === 'positiva' ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />}
                      Resumen Ejecutivo
                    </h4>
                    <p className="text-sm text-slate-600">{forecastData.resumen_ejecutivo}</p>
                    <Badge className={`mt-2 ${forecastData.tendencia_general === 'positiva' ? 'bg-green-100 text-green-800' : forecastData.tendencia_general === 'negativa' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      Tendencia {forecastData.tendencia_general}
                    </Badge>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      Riesgos y Oportunidades
                    </h4>
                    <div className="space-y-2">
                      {forecastData.riesgos_detectados?.slice(0, 2).map((r, i) => (
                        <p key={i} className="text-xs text-red-600 flex items-start gap-1">
                          <span>⚠️</span> {r}
                        </p>
                      ))}
                      {forecastData.oportunidades?.slice(0, 2).map((o, i) => (
                        <p key={i} className="text-xs text-green-600 flex items-start gap-1">
                          <span>✨</span> {o}
                        </p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Cash Flow Tab */}
          <TabsContent value="cashflow" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Previsión de Flujo de Caja</h3>
                <p className="text-sm text-slate-500">Identifica posibles déficits o superávits de liquidez</p>
              </div>
              <Button onClick={generateCashFlow} disabled={loading} className="bg-purple-600 hover:bg-purple-700">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Analizar Flujo
              </Button>
            </div>

            {cashFlowData && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card className={getHealthColor(cashFlowData.salud_financiera)}>
                    <CardContent className="p-3 text-center">
                      <p className="text-xs font-medium">Salud Financiera</p>
                      <p className="text-lg font-bold capitalize">{cashFlowData.salud_financiera}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-slate-600">Reserva Recomendada</p>
                      <p className="text-lg font-bold text-blue-600">{cashFlowData.reserva_recomendada?.toLocaleString()}€</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-slate-600">Meses Críticos</p>
                      <p className="text-lg font-bold text-red-600">{cashFlowData.meses_criticos?.length || 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-slate-600">Pendiente Cobro</p>
                      <p className="text-lg font-bold text-orange-600">{currentSummary.pendingPayments.toLocaleString()}€</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Proyección de Flujo de Caja</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={cashFlowChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v) => `${v?.toLocaleString()}€`} />
                        <Legend />
                        <ReferenceLine y={0} stroke="#000" strokeDasharray="3 3" />
                        <Area type="monotone" dataKey="saldo_acumulado" name="Saldo Acumulado" fill="#8b5cf6" stroke="#7c3aed" fillOpacity={0.3} />
                        <Line type="monotone" dataKey="entradas" name="Entradas" stroke="#16a34a" />
                        <Line type="monotone" dataKey="salidas" name="Salidas" stroke="#dc2626" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {cashFlowData.recomendaciones_liquidez?.length > 0 && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-blue-600" />
                        Recomendaciones de Liquidez
                      </h4>
                      <ul className="space-y-1">
                        {cashFlowData.recomendaciones_liquidez.map((rec, i) => (
                          <li key={i} className="text-sm text-blue-800 flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* Scenarios Tab */}
          <TabsContent value="scenarios" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Simulador de Escenarios</h3>
                <p className="text-sm text-slate-500">Modela el impacto de diferentes decisiones</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Configura el Escenario</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Tipo de Escenario</Label>
                    <Select value={scenario.type} onValueChange={(v) => setScenario({...scenario, type: v})}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="membership_increase">📈 Subida de Cuotas</SelectItem>
                        <SelectItem value="new_sponsor">🏢 Nuevo Patrocinador</SelectItem>
                        <SelectItem value="member_growth">👥 Crecimiento Socios</SelectItem>
                        <SelectItem value="event_revenue">🎉 Evento Especial</SelectItem>
                        <SelectItem value="cost_reduction">💰 Reducción Costes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {scenario.type === "membership_increase" && (
                    <div>
                      <Label>Porcentaje de Subida: {scenario.feeChangePercent}%</Label>
                      <Slider
                        value={[scenario.feeChangePercent]}
                        onValueChange={([v]) => setScenario({...scenario, feeChangePercent: v})}
                        min={5}
                        max={30}
                        step={5}
                        className="mt-2"
                      />
                    </div>
                  )}

                  {scenario.type === "new_sponsor" && (
                    <div>
                      <Label>Aportación Anual (€)</Label>
                      <Input
                        type="number"
                        value={scenario.newSponsorAmount}
                        onChange={(e) => setScenario({...scenario, newSponsorAmount: Number(e.target.value)})}
                        className="mt-1"
                      />
                    </div>
                  )}

                  {scenario.type === "member_growth" && (
                    <div>
                      <Label>Nuevos Jugadores</Label>
                      <Input
                        type="number"
                        value={scenario.newMembersCount}
                        onChange={(e) => setScenario({...scenario, newMembersCount: Number(e.target.value)})}
                        className="mt-1"
                      />
                    </div>
                  )}

                  {scenario.type === "event_revenue" && (
                    <div>
                      <Label>Ingresos Previstos (€)</Label>
                      <Input
                        type="number"
                        value={scenario.eventRevenue}
                        onChange={(e) => setScenario({...scenario, eventRevenue: Number(e.target.value)})}
                        className="mt-1"
                      />
                    </div>
                  )}

                  {scenario.type === "cost_reduction" && (
                    <div>
                      <Label>Reducción de Costes: {scenario.costReductionPercent}%</Label>
                      <Slider
                        value={[scenario.costReductionPercent]}
                        onValueChange={([v]) => setScenario({...scenario, costReductionPercent: v})}
                        min={5}
                        max={30}
                        step={5}
                        className="mt-2"
                      />
                    </div>
                  )}

                  <Button onClick={generateScenarioAnalysis} disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                    Analizar Escenario
                  </Button>
                </CardContent>
              </Card>

              {scenarioResults && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      Resultados: {scenarioResults.escenario_nombre}
                      <Badge className={scenarioResults.puntuacion_viabilidad >= 7 ? "bg-green-100 text-green-800" : scenarioResults.puntuacion_viabilidad >= 5 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}>
                        Viabilidad: {scenarioResults.puntuacion_viabilidad}/10
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-green-50 p-2 rounded">
                        <p className="text-xs text-green-600">Ingresos +</p>
                        <p className="font-bold text-green-700">{scenarioResults.impacto_anual?.ingresos_adicionales?.toLocaleString()}€</p>
                      </div>
                      <div className="bg-red-50 p-2 rounded">
                        <p className="text-xs text-red-600">Gastos +</p>
                        <p className="font-bold text-red-700">{scenarioResults.impacto_anual?.gastos_adicionales?.toLocaleString()}€</p>
                      </div>
                      <div className={`p-2 rounded ${scenarioResults.impacto_anual?.beneficio_neto >= 0 ? 'bg-emerald-50' : 'bg-orange-50'}`}>
                        <p className="text-xs">Beneficio Neto</p>
                        <p className={`font-bold ${scenarioResults.impacto_anual?.beneficio_neto >= 0 ? 'text-emerald-700' : 'text-orange-700'}`}>
                          {scenarioResults.impacto_anual?.beneficio_neto >= 0 ? '+' : ''}{scenarioResults.impacto_anual?.beneficio_neto?.toLocaleString()}€
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-slate-600 mb-1">⏱️ Tiempo Implementación</p>
                      <p className="text-sm">{scenarioResults.tiempo_implementacion}</p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-slate-600 mb-1">📊 Probabilidad de Éxito</p>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full" 
                          style={{ width: `${scenarioResults.probabilidad_exito}%` }}
                        />
                      </div>
                      <p className="text-xs text-right text-slate-500">{scenarioResults.probabilidad_exito}%</p>
                    </div>

                    <div className="bg-blue-50 p-3 rounded text-sm text-blue-800">
                      <p className="font-medium mb-1">💡 Recomendación</p>
                      <p>{scenarioResults.recomendacion}</p>
                    </div>

                    {scenarioResults.riesgos?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-slate-600 mb-1">⚠️ Riesgos</p>
                        {scenarioResults.riesgos.slice(0, 2).map((r, i) => (
                          <p key={i} className="text-xs text-red-600">• {r.riesgo}</p>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Insights y Recomendaciones IA</h3>
                <p className="text-sm text-slate-500">Análisis profundo y acciones recomendadas</p>
              </div>
              <Button onClick={generateInsights} disabled={loading} className="bg-purple-600 hover:bg-purple-700">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Generar Insights
              </Button>
            </div>

            {insights && (
              <>
                {/* Health Score */}
                <Card className="bg-gradient-to-r from-purple-50 to-indigo-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-purple-800">Puntuación de Salud Financiera</p>
                        <p className="text-3xl font-bold text-purple-700">{insights.puntuacion_salud_financiera}/100</p>
                      </div>
                      <div className="w-20 h-20 rounded-full border-8 border-purple-200 flex items-center justify-center">
                        <span className="text-2xl font-bold text-purple-600">{insights.puntuacion_salud_financiera}</span>
                      </div>
                    </div>
                    <p className="text-sm text-purple-700 mt-2">{insights.resumen}</p>
                  </CardContent>
                </Card>

                {/* DAFO */}
                <div className="grid grid-cols-2 gap-3">
                  <Card className="border-l-4 border-l-green-500">
                    <CardContent className="p-3">
                      <p className="text-xs font-bold text-green-700 mb-2">💪 Fortalezas</p>
                      <ul className="text-xs space-y-1">
                        {insights.dafo?.fortalezas?.slice(0, 3).map((f, i) => (
                          <li key={i} className="text-green-600">• {f}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-red-500">
                    <CardContent className="p-3">
                      <p className="text-xs font-bold text-red-700 mb-2">⚠️ Debilidades</p>
                      <ul className="text-xs space-y-1">
                        {insights.dafo?.debilidades?.slice(0, 3).map((d, i) => (
                          <li key={i} className="text-red-600">• {d}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="p-3">
                      <p className="text-xs font-bold text-blue-700 mb-2">🚀 Oportunidades</p>
                      <ul className="text-xs space-y-1">
                        {insights.dafo?.oportunidades?.slice(0, 3).map((o, i) => (
                          <li key={i} className="text-blue-600">• {o}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-orange-500">
                    <CardContent className="p-3">
                      <p className="text-xs font-bold text-orange-700 mb-2">🔥 Amenazas</p>
                      <ul className="text-xs space-y-1">
                        {insights.dafo?.amenazas?.slice(0, 3).map((a, i) => (
                          <li key={i} className="text-orange-600">• {a}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                {/* Recommendations */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="h-4 w-4 text-purple-600" />
                      Recomendaciones Priorizadas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {insights.recomendaciones?.map((rec, i) => (
                      <div key={i} className={`p-3 rounded-lg border-l-4 ${
                        rec.prioridad === 'alta' ? 'border-l-red-500 bg-red-50' :
                        rec.prioridad === 'media' ? 'border-l-yellow-500 bg-yellow-50' :
                        'border-l-green-500 bg-green-50'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm">{rec.titulo}</p>
                            <p className="text-xs text-slate-600 mt-1">{rec.descripcion}</p>
                          </div>
                          <div className="flex gap-1">
                            <Badge variant="outline" className="text-xs">{rec.plazo}</Badge>
                            <Badge className={`text-xs ${
                              rec.prioridad === 'alta' ? 'bg-red-100 text-red-800' :
                              rec.prioridad === 'media' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {rec.prioridad}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-xs text-purple-600 mt-2">💰 Impacto: {rec.impacto_estimado}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Strategies */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ArrowUpRight className="h-4 w-4 text-green-600" />
                        Estrategias para Aumentar Ingresos
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {insights.estrategias_ingresos?.map((e, i) => (
                        <div key={i} className="p-2 bg-green-50 rounded text-sm">
                          <p className="font-medium text-green-800">{e.estrategia}</p>
                          <p className="text-xs text-green-600">Potencial: {e.ingresos_potenciales} | Esfuerzo: {e.esfuerzo}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ArrowDownRight className="h-4 w-4 text-blue-600" />
                        Optimización de Costes
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {insights.optimizacion_costes?.map((c, i) => (
                        <div key={i} className="p-2 bg-blue-50 rounded text-sm">
                          <p className="font-medium text-blue-800">{c.area}</p>
                          <p className="text-xs text-blue-600">Ahorro: {c.ahorro_potencial}</p>
                          <p className="text-xs text-slate-600">{c.accion}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                {/* KPIs */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Zap className="h-4 w-4 text-orange-600" />
                      KPIs Clave a Monitorizar
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {insights.kpis_clave?.map((kpi, i) => (
                        <div key={i} className="p-2 bg-slate-50 rounded text-center">
                          <p className="text-xs font-medium text-slate-700">{kpi.kpi}</p>
                          <p className="text-lg font-bold text-slate-900">{kpi.valor_actual}</p>
                          <p className="text-xs text-green-600">Objetivo: {kpi.objetivo}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
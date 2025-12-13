import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Sparkles, 
  Loader2, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Plus,
  Wallet,
  BarChart3
} from "lucide-react";
import { toast } from "sonner";

const OBJETIVOS_PREDEFINIDOS = [
  { id: "equilibrado", label: "Presupuesto equilibrado", description: "Distribución balanceada entre todas las partidas" },
  { id: "cantera", label: "Invertir en cantera", description: "Priorizar categorías inferiores y formación" },
  { id: "infraestructura", label: "Mejorar infraestructura", description: "Enfoque en instalaciones y mantenimiento" },
  { id: "competicion", label: "Máxima competitividad", description: "Priorizar equipación, desplazamientos y arbitrajes" },
  { id: "ahorro", label: "Maximizar ahorro", description: "Reducir gastos y aumentar reservas" },
  { id: "eventos", label: "Potenciar eventos", description: "Invertir en eventos y marketing del club" }
];

const CATEGORIAS_PARTIDAS = {
  "Ingresos": [
    "Cuotas de socios",
    "Inscripciones nuevas",
    "Subvenciones públicas",
    "Patrocinios",
    "Venta de equipación",
    "Eventos y torneos",
    "Lotería",
    "Otros ingresos"
  ],
  "Gastos Fijos": [
    "Seguros deportivos",
    "Federación y licencias",
    "Alquiler instalaciones",
    "Suministros",
    "Personal técnico"
  ],
  "Gastos Variables": [
    "Material deportivo",
    "Equipación",
    "Arbitrajes",
    "Desplazamientos",
    "Mantenimiento",
    "Marketing y comunicación"
  ],
  "Inversiones": [
    "Mejora instalaciones",
    "Equipamiento tecnológico",
    "Formación entrenadores",
    "Eventos especiales"
  ]
};

export default function AIBudgetAssistant({ 
  open, 
  onClose, 
  currentBudget,
  historicalTransactions = [],
  historicalBudgets = [],
  onApplyBudget 
}) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [objetivo, setObjetivo] = useState("");
  const [objetivoPersonalizado, setObjetivoPersonalizado] = useState("");
  const [temporadaBase, setTemporadaBase] = useState("");
  const [ingresosEsperados, setIngresosEsperados] = useState("");
  const [sugerencia, setSugerencia] = useState(null);
  const [ajustes, setAjustes] = useState(null);
  const [inflacion, setInflacion] = useState("3");
  const [crecimientoMiembros, setCrecimientoMiembros] = useState("0");
  const [copiarPresupuestoAnterior, setCopiarPresupuestoAnterior] = useState(null);

  // Obtener temporadas disponibles de datos históricos
  const temporadasDisponibles = [...new Set([
    ...historicalTransactions.map(t => t.temporada),
    ...historicalBudgets.map(b => b.temporada)
  ])].filter(Boolean).sort().reverse();

  const getCurrentSeason = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
  };

  const analyzeHistoricalData = () => {
    // Análisis de transacciones históricas
    const ingresosPorCategoria = {};
    const gastosPorCategoria = {};
    
    historicalTransactions.forEach(t => {
      if (t.tipo === "Ingreso") {
        ingresosPorCategoria[t.categoria] = (ingresosPorCategoria[t.categoria] || 0) + (t.cantidad || 0);
      } else {
        gastosPorCategoria[t.categoria] = (gastosPorCategoria[t.categoria] || 0) + (t.cantidad || 0);
      }
    });

    const totalIngresos = Object.values(ingresosPorCategoria).reduce((a, b) => a + b, 0);
    const totalGastos = Object.values(gastosPorCategoria).reduce((a, b) => a + b, 0);

    // Análisis de presupuestos anteriores
    const presupuestosAnteriores = historicalBudgets.map(b => ({
      temporada: b.temporada,
      totalIngresos: b.total_presupuestado_ingresos || 0,
      totalGastos: b.total_presupuestado_gastos || 0,
      ejecutadoIngresos: b.total_ejecutado_ingresos || 0,
      ejecutadoGastos: b.total_ejecutado_gastos || 0,
      partidas: b.partidas || []
    }));

    return {
      ingresosPorCategoria,
      gastosPorCategoria,
      totalIngresos,
      totalGastos,
      presupuestosAnteriores,
      tendencia: totalIngresos > totalGastos ? "positiva" : "negativa"
    };
  };

  const generateBudgetSuggestion = async () => {
    setLoading(true);
    try {
      const historicalAnalysis = analyzeHistoricalData();
      const objetivoSeleccionado = OBJETIVOS_PREDEFINIDOS.find(o => o.id === objetivo);
      
      // Si hay presupuesto anterior seleccionado para copiar, aplicar ajustes
      let baseBudget = null;
      if (copiarPresupuestoAnterior) {
        const presupuestoAnterior = historicalBudgets.find(b => b.id === copiarPresupuestoAnterior);
        if (presupuestoAnterior?.partidas) {
          baseBudget = presupuestoAnterior.partidas;
        }
      }
      
      const prompt = `Eres un experto en gestión financiera de clubes deportivos. Necesito que generes una propuesta de presupuesto para un club de fútbol/baloncesto.

DATOS HISTÓRICOS DEL CLUB:
- Ingresos históricos por categoría: ${JSON.stringify(historicalAnalysis.ingresosPorCategoria)}
- Gastos históricos por categoría: ${JSON.stringify(historicalAnalysis.gastosPorCategoria)}
- Total ingresos históricos: ${historicalAnalysis.totalIngresos}€
- Total gastos históricos: ${historicalAnalysis.totalGastos}€
- Tendencia financiera: ${historicalAnalysis.tendencia}
- Presupuestos anteriores: ${JSON.stringify(historicalAnalysis.presupuestosAnteriores.slice(0, 2))}

${baseBudget ? `PRESUPUESTO BASE A COPIAR Y AJUSTAR: ${JSON.stringify(baseBudget)}` : ''}

PARÁMETROS DE AJUSTE AUTOMÁTICO:
- Inflación estimada: ${inflacion}%
- Crecimiento esperado de miembros: ${crecimientoMiembros}%

OBJETIVO PRINCIPAL: ${objetivoSeleccionado?.label || objetivo} - ${objetivoSeleccionado?.description || objetivoPersonalizado}

${objetivoPersonalizado ? `INSTRUCCIONES ADICIONALES: ${objetivoPersonalizado}` : ''}

INGRESOS ESPERADOS PARA LA NUEVA TEMPORADA: ${ingresosEsperados || 'Estimar basándose en históricos'}€

CATEGORÍAS DE PARTIDAS DISPONIBLES:
${JSON.stringify(CATEGORIAS_PARTIDAS, null, 2)}

INSTRUCCIONES:
${baseBudget ? `1. Usa las partidas del presupuesto base como punto de partida
2. Ajusta CADA partida aplicando:
   - Inflación del ${inflacion}% a gastos fijos y variables
   - Crecimiento de miembros del ${crecimientoMiembros}% a ingresos por cuotas
   - Adaptaciones según el objetivo seleccionado
3. Añade nuevas partidas si son necesarias según el objetivo` : 
`1. Genera partidas de ingresos con importes estimados (considerando crecimiento de ${crecimientoMiembros}%)
2. Genera partidas de gastos aplicando inflación del ${inflacion}% sobre datos históricos
3. Ajusta según el objetivo principal`}
4. Proporciona recomendaciones específicas
5. Identifica alertas o riesgos
6. Incluye comparativa con temporadas anteriores`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            resumen_ejecutivo: {
              type: "string",
              description: "Resumen breve de la propuesta"
            },
            partidas_ingresos: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  nombre: { type: "string" },
                  categoria: { type: "string" },
                  presupuestado: { type: "number" },
                  justificacion: { type: "string" }
                }
              }
            },
            partidas_gastos: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  nombre: { type: "string" },
                  categoria: { type: "string" },
                  presupuestado: { type: "number" },
                  justificacion: { type: "string" },
                  prioridad: { type: "string", enum: ["alta", "media", "baja"] }
                }
              }
            },
            total_ingresos: { type: "number" },
            total_gastos: { type: "number" },
            balance_previsto: { type: "number" },
            recomendaciones: {
              type: "array",
              items: { type: "string" }
            },
            alertas: {
              type: "array",
              items: { type: "string" }
            },
            comparativa_historica: {
              type: "object",
              properties: {
                variacion_ingresos_pct: { type: "number" },
                variacion_gastos_pct: { type: "number" },
                comentario: { type: "string" }
              }
            }
          }
        }
      });

      setSugerencia(response);
      setStep(3);
      toast.success("Propuesta generada con éxito");
    } catch (error) {
      console.error("Error generando sugerencia:", error);
      toast.error("Error al generar la propuesta");
    } finally {
      setLoading(false);
    }
  };

  const generateBudgetAdjustments = async () => {
    if (!currentBudget?.partidas?.length) {
      toast.error("No hay partidas en el presupuesto actual para ajustar");
      return;
    }

    setLoading(true);
    try {
      const historicalAnalysis = analyzeHistoricalData();
      const objetivoSeleccionado = OBJETIVOS_PREDEFINIDOS.find(o => o.id === objetivo);

      const prompt = `Eres un experto en gestión financiera de clubes deportivos. Necesito que analices el presupuesto actual y sugiereas ajustes.

PRESUPUESTO ACTUAL:
${JSON.stringify(currentBudget.partidas, null, 2)}

DATOS HISTÓRICOS:
- Ingresos por categoría: ${JSON.stringify(historicalAnalysis.ingresosPorCategoria)}
- Gastos por categoría: ${JSON.stringify(historicalAnalysis.gastosPorCategoria)}

OBJETIVO: ${objetivoSeleccionado?.label || objetivo} - ${objetivoSeleccionado?.description || objetivoPersonalizado}

${objetivoPersonalizado ? `INSTRUCCIONES: ${objetivoPersonalizado}` : ''}

Analiza cada partida y sugiere ajustes específicos para optimizar el presupuesto según el objetivo.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            analisis_general: { type: "string" },
            ajustes_sugeridos: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  partida_id: { type: "string" },
                  partida_nombre: { type: "string" },
                  valor_actual: { type: "number" },
                  valor_sugerido: { type: "number" },
                  diferencia: { type: "number" },
                  razon: { type: "string" },
                  impacto: { type: "string", enum: ["positivo", "neutral", "riesgo"] }
                }
              }
            },
            nuevas_partidas_sugeridas: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  nombre: { type: "string" },
                  categoria: { type: "string" },
                  presupuestado: { type: "number" },
                  justificacion: { type: "string" }
                }
              }
            },
            ahorro_potencial: { type: "number" },
            mejora_eficiencia_pct: { type: "number" }
          }
        }
      });

      setAjustes(response);
      setStep(4);
      toast.success("Ajustes calculados");
    } catch (error) {
      console.error("Error generando ajustes:", error);
      toast.error("Error al calcular ajustes");
    } finally {
      setLoading(false);
    }
  };

  const applyNewBudget = () => {
    if (!sugerencia) return;

    const partidas = [
      ...sugerencia.partidas_ingresos.map((p, i) => ({
        id: `ing_${Date.now()}_${i}`,
        nombre: p.nombre,
        categoria: "Ingresos",
        presupuestado: p.presupuestado,
        ejecutado: 0
      })),
      ...sugerencia.partidas_gastos.map((p, i) => ({
        id: `gas_${Date.now()}_${i}`,
        nombre: p.nombre,
        categoria: p.categoria,
        presupuestado: p.presupuestado,
        ejecutado: 0
      }))
    ];

    onApplyBudget({
      partidas,
      total_presupuestado_ingresos: sugerencia.total_ingresos,
      total_presupuestado_gastos: sugerencia.total_gastos,
      notas: `Generado por IA - Objetivo: ${OBJETIVOS_PREDEFINIDOS.find(o => o.id === objetivo)?.label || objetivo}\n\n${sugerencia.resumen_ejecutivo}`
    });

    toast.success("Presupuesto aplicado");
    onClose();
  };

  const applyAdjustments = () => {
    if (!ajustes || !currentBudget) return;

    const updatedPartidas = currentBudget.partidas.map(p => {
      const ajuste = ajustes.ajustes_sugeridos.find(a => 
        a.partida_nombre?.toLowerCase() === p.nombre?.toLowerCase() ||
        a.partida_id === p.id
      );
      if (ajuste) {
        return { ...p, presupuestado: ajuste.valor_sugerido };
      }
      return p;
    });

    // Añadir nuevas partidas sugeridas
    const nuevasPartidas = (ajustes.nuevas_partidas_sugeridas || []).map((p, i) => ({
      id: `new_${Date.now()}_${i}`,
      nombre: p.nombre,
      categoria: p.categoria,
      presupuestado: p.presupuestado,
      ejecutado: 0
    }));

    onApplyBudget({
      partidas: [...updatedPartidas, ...nuevasPartidas]
    });

    toast.success("Ajustes aplicados");
    onClose();
  };

  const resetAndClose = () => {
    setStep(1);
    setObjetivo("");
    setObjetivoPersonalizado("");
    setTemporadaBase("");
    setIngresosEsperados("");
    setSugerencia(null);
    setAjustes(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Asistente IA de Presupuestos
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step >= s ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
              </div>
              {s < 4 && <div className={`w-12 h-1 ${step > s ? 'bg-purple-600' : 'bg-slate-200'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Selección de modo */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900 mb-2">¿Qué quieres hacer?</h3>
              <p className="text-slate-600">Elige una opción para comenzar</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card 
                className="cursor-pointer hover:border-purple-500 hover:shadow-lg transition-all"
                onClick={() => setStep(2)}
              >
                <CardContent className="pt-6 text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Plus className="h-8 w-8 text-purple-600" />
                  </div>
                  <h4 className="font-bold text-slate-900 mb-2">Crear Nuevo Presupuesto</h4>
                  <p className="text-sm text-slate-600">
                    La IA generará un borrador completo basado en datos históricos y tus objetivos
                  </p>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer hover:border-purple-500 hover:shadow-lg transition-all ${!currentBudget?.partidas?.length ? 'opacity-50' : ''}`}
                onClick={() => currentBudget?.partidas?.length && setStep(2)}
              >
                <CardContent className="pt-6 text-center">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="h-8 w-8 text-orange-600" />
                  </div>
                  <h4 className="font-bold text-slate-900 mb-2">Optimizar Presupuesto Actual</h4>
                  <p className="text-sm text-slate-600">
                    Analizar y sugerir ajustes para el presupuesto existente
                  </p>
                  {!currentBudget?.partidas?.length && (
                    <Badge className="mt-2 bg-slate-100 text-slate-600">Requiere presupuesto activo</Badge>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Step 2: Configuración */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-semibold">Objetivo Principal</Label>
              <p className="text-sm text-slate-500 mb-3">¿Cuál es la prioridad para esta temporada?</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {OBJETIVOS_PREDEFINIDOS.map(obj => (
                  <Card 
                    key={obj.id}
                    className={`cursor-pointer transition-all ${objetivo === obj.id ? 'border-purple-500 bg-purple-50' : 'hover:border-purple-300'}`}
                    onClick={() => setObjetivo(obj.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <Target className={`h-4 w-4 mt-0.5 ${objetivo === obj.id ? 'text-purple-600' : 'text-slate-400'}`} />
                        <div>
                          <p className="font-medium text-sm">{obj.label}</p>
                          <p className="text-xs text-slate-500">{obj.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <Label>Instrucciones adicionales (opcional)</Label>
              <Textarea
                placeholder="Ej: Queremos aumentar un 20% la inversión en prebenjamines, reducir gastos de desplazamiento..."
                value={objetivoPersonalizado}
                onChange={(e) => setObjetivoPersonalizado(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Temporada base para análisis</Label>
                <Select value={temporadaBase} onValueChange={setTemporadaBase}>
                  <SelectTrigger>
                    <SelectValue placeholder="Última disponible" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automático (última)</SelectItem>
                    {temporadasDisponibles.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Ingresos esperados (€)</Label>
                <Input
                  type="number"
                  placeholder="Estimar automáticamente"
                  value={ingresosEsperados}
                  onChange={(e) => setIngresosEsperados(e.target.value)}
                />
              </div>
            </div>

            {/* Copiar presupuesto anterior */}
            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
              <Label className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                Copiar y Ajustar Presupuesto Anterior
              </Label>
              <Select value={copiarPresupuestoAnterior || ""} onValueChange={setCopiarPresupuestoAnterior}>
                <SelectTrigger>
                  <SelectValue placeholder="Ninguno - crear desde cero" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Ninguno - crear desde cero</SelectItem>
                  {historicalBudgets.map(b => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.temporada} - {b.nombre || "Presupuesto"} ({b.partidas?.length || 0} partidas)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {copiarPresupuestoAnterior && (
                <p className="text-xs text-blue-700 mt-2">
                  ✨ Se copiarán las partidas y se ajustarán automáticamente
                </p>
              )}
            </div>

            {/* Parámetros de ajuste automático */}
            <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-purple-900 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Ajustes Automáticos
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Inflación estimada (%)</Label>
                  <Input
                    type="number"
                    value={inflacion}
                    onChange={(e) => setInflacion(e.target.value)}
                    placeholder="3"
                    step="0.1"
                  />
                  <p className="text-xs text-purple-700 mt-1">Se aplicará a gastos fijos y variables</p>
                </div>
                <div>
                  <Label className="text-sm">Crecimiento esperado miembros (%)</Label>
                  <Input
                    type="number"
                    value={crecimientoMiembros}
                    onChange={(e) => setCrecimientoMiembros(e.target.value)}
                    placeholder="0"
                    step="1"
                  />
                  <p className="text-xs text-purple-700 mt-1">Ajustará ingresos por cuotas proporcionalmente</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="font-medium text-slate-900 mb-2 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                Datos disponibles para el análisis
              </h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Transacciones</p>
                  <p className="font-bold text-slate-900">{historicalTransactions.length}</p>
                </div>
                <div>
                  <p className="text-slate-500">Presupuestos anteriores</p>
                  <p className="font-bold text-slate-900">{historicalBudgets.length}</p>
                </div>
                <div>
                  <p className="text-slate-500">Temporadas</p>
                  <p className="font-bold text-slate-900">{temporadasDisponibles.length}</p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)}>Atrás</Button>
              <Button 
                onClick={currentBudget?.partidas?.length ? generateBudgetAdjustments : generateBudgetSuggestion}
                disabled={!objetivo || loading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analizando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generar Propuesta
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 3: Resultado - Nuevo Presupuesto */}
        {step === 3 && sugerencia && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200">
              <h4 className="font-bold text-purple-900 mb-2">📊 Resumen Ejecutivo</h4>
              <p className="text-sm text-purple-800">{sugerencia.resumen_ejecutivo}</p>
            </div>

            {/* Balance previsto */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-4 text-center">
                  <TrendingUp className="h-6 w-6 text-green-600 mx-auto mb-2" />
                  <p className="text-xs text-green-600">Ingresos</p>
                  <p className="text-xl font-bold text-green-700">{sugerencia.total_ingresos?.toLocaleString()}€</p>
                </CardContent>
              </Card>
              <Card className="bg-red-50 border-red-200">
                <CardContent className="pt-4 text-center">
                  <TrendingDown className="h-6 w-6 text-red-600 mx-auto mb-2" />
                  <p className="text-xs text-red-600">Gastos</p>
                  <p className="text-xl font-bold text-red-700">{sugerencia.total_gastos?.toLocaleString()}€</p>
                </CardContent>
              </Card>
              <Card className={`${sugerencia.balance_previsto >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
                <CardContent className="pt-4 text-center">
                  <Wallet className={`h-6 w-6 mx-auto mb-2 ${sugerencia.balance_previsto >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
                  <p className={`text-xs ${sugerencia.balance_previsto >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>Balance</p>
                  <p className={`text-xl font-bold ${sugerencia.balance_previsto >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                    {sugerencia.balance_previsto?.toLocaleString()}€
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Partidas de Ingresos */}
            <div>
              <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Partidas de Ingresos ({sugerencia.partidas_ingresos?.length || 0})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {sugerencia.partidas_ingresos?.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{p.nombre}</p>
                      <p className="text-xs text-slate-500">{p.justificacion}</p>
                    </div>
                    <Badge className="bg-green-100 text-green-800">{p.presupuestado?.toLocaleString()}€</Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Partidas de Gastos */}
            <div>
              <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                Partidas de Gastos ({sugerencia.partidas_gastos?.length || 0})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {sugerencia.partidas_gastos?.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{p.nombre}</p>
                        <Badge variant="outline" className="text-[10px]">{p.categoria}</Badge>
                        {p.prioridad === "alta" && <Badge className="bg-red-100 text-red-700 text-[10px]">Alta</Badge>}
                      </div>
                      <p className="text-xs text-slate-500">{p.justificacion}</p>
                    </div>
                    <Badge className="bg-red-100 text-red-800">{p.presupuestado?.toLocaleString()}€</Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Recomendaciones y Alertas */}
            <div className="grid grid-cols-2 gap-4">
              {sugerencia.recomendaciones?.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h5 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    Recomendaciones
                  </h5>
                  <ul className="text-xs text-blue-800 space-y-1">
                    {sugerencia.recomendaciones.map((r, i) => (
                      <li key={i}>• {r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {sugerencia.alertas?.length > 0 && (
                <div className="bg-yellow-50 rounded-lg p-4">
                  <h5 className="font-medium text-yellow-900 mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Alertas
                  </h5>
                  <ul className="text-xs text-yellow-800 space-y-1">
                    {sugerencia.alertas.map((a, i) => (
                      <li key={i}>• {a}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(2)}>Modificar parámetros</Button>
              <Button onClick={applyNewBudget} className="bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Aplicar Presupuesto
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 4: Resultado - Ajustes */}
        {step === 4 && ajustes && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-4 border border-orange-200">
              <h4 className="font-bold text-orange-900 mb-2">🔧 Análisis del Presupuesto</h4>
              <p className="text-sm text-orange-800">{ajustes.analisis_general}</p>
            </div>

            {/* Métricas de mejora */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-4 text-center">
                  <p className="text-xs text-green-600">Ahorro Potencial</p>
                  <p className="text-2xl font-bold text-green-700">{ajustes.ahorro_potencial?.toLocaleString() || 0}€</p>
                </CardContent>
              </Card>
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4 text-center">
                  <p className="text-xs text-blue-600">Mejora Eficiencia</p>
                  <p className="text-2xl font-bold text-blue-700">+{ajustes.mejora_eficiencia_pct || 0}%</p>
                </CardContent>
              </Card>
            </div>

            {/* Ajustes sugeridos */}
            <div>
              <h4 className="font-bold text-slate-900 mb-3">Ajustes Sugeridos</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {ajustes.ajustes_sugeridos?.map((a, i) => (
                  <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${
                    a.impacto === 'positivo' ? 'bg-green-50 border-green-200' :
                    a.impacto === 'riesgo' ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{a.partida_nombre}</p>
                      <p className="text-xs text-slate-500">{a.razon}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500 line-through">{a.valor_actual?.toLocaleString()}€</span>
                        <ArrowRight className="h-3 w-3 text-slate-400" />
                        <span className="font-bold text-sm">{a.valor_sugerido?.toLocaleString()}€</span>
                      </div>
                      <Badge className={`text-[10px] ${a.diferencia > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {a.diferencia > 0 ? '+' : ''}{a.diferencia?.toLocaleString()}€
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Nuevas partidas sugeridas */}
            {ajustes.nuevas_partidas_sugeridas?.length > 0 && (
              <div>
                <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Plus className="h-4 w-4 text-purple-600" />
                  Nuevas Partidas Sugeridas
                </h4>
                <div className="space-y-2">
                  {ajustes.nuevas_partidas_sugeridas.map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <div>
                        <p className="font-medium text-sm">{p.nombre}</p>
                        <p className="text-xs text-slate-500">{p.justificacion}</p>
                      </div>
                      <Badge className="bg-purple-100 text-purple-800">{p.presupuestado?.toLocaleString()}€</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(2)}>Modificar parámetros</Button>
              <Button onClick={applyAdjustments} className="bg-orange-600 hover:bg-orange-700">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Aplicar Ajustes
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
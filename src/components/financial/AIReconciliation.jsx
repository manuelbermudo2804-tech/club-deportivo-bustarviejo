import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  Sparkles,
  Brain,
  RefreshCw,
  FileText,
  TrendingUp,
  TrendingDown,
  XCircle,
  HelpCircle,
  History,
  Settings,
  Zap,
  Eye
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const CATEGORIAS_INGRESO = [
  "Cuotas Socios", "Inscripciones", "Subvenciones", "Patrocinios",
  "Venta Equipación", "Eventos", "Lotería", "Otros Ingresos"
];

const CATEGORIAS_GASTO = [
  "Material Deportivo", "Equipación", "Arbitrajes", "Desplazamientos",
  "Instalaciones", "Mantenimiento", "Seguros", "Federación",
  "Personal", "Suministros", "Marketing", "Eventos y Celebraciones", "Otros Gastos"
];

export default function AIReconciliation({ 
  payments = [], 
  players = [], 
  financialTransactions = [],
  onReconcile 
}) {
  const queryClient = useQueryClient();
  
  // Estados principales
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [bankTransactions, setBankTransactions] = useState([]);
  const [matchResults, setMatchResults] = useState([]);
  const [activeTab, setActiveTab] = useState("upload");
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showSessionHistory, setShowSessionHistory] = useState(false);
  
  // Estados para IA
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  
  // Fetch reglas aprendidas y sesiones anteriores
  const { data: reconciliationRules = [] } = useQuery({
    queryKey: ['reconciliationRules'],
    queryFn: () => base44.entities.ReconciliationRule.list('-veces_aplicada'),
  });

  const { data: reconciliationSessions = [] } = useQuery({
    queryKey: ['reconciliationSessions'],
    queryFn: () => base44.entities.ReconciliationSession.list('-created_date', 10),
  });

  // Mutations
  const createRuleMutation = useMutation({
    mutationFn: (data) => base44.entities.ReconciliationRule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliationRules'] });
      toast.success("Regla de conciliación guardada - La IA aprenderá de esto");
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ReconciliationRule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliationRules'] });
    },
  });

  const createSessionMutation = useMutation({
    mutationFn: (data) => base44.entities.ReconciliationSession.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliationSessions'] });
    },
  });

  // Parsear CSV
  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    const transactions = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split(/[,;]/);
      
      if (parts.length >= 3) {
        const date = parts[0]?.trim();
        const concept = parts[1]?.trim() || '';
        const amountStr = parts[2]?.trim();
        const amount = parseFloat(amountStr.replace(/[^\d.,-]/g, '').replace(',', '.'));
        
        if (!isNaN(amount) && concept) {
          transactions.push({
            id: `bank_${i}_${Date.now()}`,
            date,
            concept,
            amount: Math.abs(amount),
            isIncome: amount > 0 || !amountStr.includes('-'),
            original: line
          });
        }
      }
    }
    
    return transactions;
  };

  // Subir archivo
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setBankTransactions([]);
    setMatchResults([]);
    setAiSuggestions(null);

    try {
      let transactions = [];
      
      if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
        const text = await file.text();
        transactions = parseCSV(text);
      } else if (file.name.endsWith('.pdf')) {
        // Usar IA para extraer datos del PDF
        toast.info("Procesando PDF con IA...");
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        const extractedData = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: {
            type: "object",
            properties: {
              transacciones: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    fecha: { type: "string" },
                    concepto: { type: "string" },
                    importe: { type: "number" },
                    es_ingreso: { type: "boolean" }
                  }
                }
              }
            }
          }
        });

        if (extractedData.status === "success" && extractedData.output?.transacciones) {
          transactions = extractedData.output.transacciones.map((t, i) => ({
            id: `bank_${i}_${Date.now()}`,
            date: t.fecha,
            concept: t.concepto,
            amount: Math.abs(t.importe),
            isIncome: t.es_ingreso,
            original: JSON.stringify(t)
          }));
        }
      }

      if (transactions.length === 0) {
        toast.error("No se encontraron transacciones válidas en el archivo");
        setUploading(false);
        return;
      }

      setBankTransactions(transactions);
      toast.success(`${transactions.length} transacciones cargadas`);
      
      // Ejecutar matching con IA
      await runAIMatching(transactions, file.name);
      setActiveTab("results");
      
    } catch (error) {
      console.error("Error processing file:", error);
      toast.error("Error al procesar el archivo");
    }
    setUploading(false);
  };

  // Matching con IA
  const runAIMatching = async (transactions, fileName) => {
    setAiAnalyzing(true);
    const results = [];
    
    try {
      // Preparar datos para el análisis
      const pendingPayments = payments.filter(p => 
        (p.estado === "Pendiente" || p.estado === "En revisión") && !p.reconciliado_banco
      );
      
      const existingTransactions = financialTransactions.filter(t => 
        t.estado === "Pendiente"
      );

      // Aplicar reglas aprendidas primero
      const activeRules = reconciliationRules.filter(r => r.activa);

      for (const bankTx of transactions) {
        let match = null;
        let matchType = "none";
        let confidence = 0;

        // 1. Buscar coincidencia exacta por importe y concepto en pagos
        for (const payment of pendingPayments) {
          const player = players.find(p => p.id === payment.jugador_id);
          const playerName = payment.jugador_nombre?.toUpperCase() || "";
          const conceptUpper = bankTx.concept.toUpperCase();
          
          const amountMatch = Math.abs(bankTx.amount - payment.cantidad) < 0.01;
          const nameMatch = conceptUpper.includes(playerName.split(' ')[0]) || 
                           conceptUpper.includes(playerName.replace(/\s+/g, ''));
          
          if (amountMatch && nameMatch) {
            match = { type: "payment", data: payment, player };
            matchType = "exact";
            confidence = 95;
            break;
          } else if (amountMatch) {
            match = { type: "payment", data: payment, player };
            matchType = "amount";
            confidence = 70;
          }
        }

        // 2. Buscar en transacciones financieras existentes
        if (!match || confidence < 80) {
          for (const tx of existingTransactions) {
            const amountMatch = Math.abs(bankTx.amount - tx.cantidad) < 0.01;
            const conceptMatch = bankTx.concept.toLowerCase().includes(tx.concepto?.toLowerCase() || "") ||
                                tx.concepto?.toLowerCase().includes(bankTx.concept.toLowerCase());
            
            if (amountMatch && conceptMatch) {
              match = { type: "transaction", data: tx };
              matchType = "transaction";
              confidence = 90;
              break;
            }
          }
        }

        // 3. Aplicar reglas aprendidas
        if (!match || confidence < 80) {
          for (const rule of activeRules) {
            if (bankTx.concept.toLowerCase().includes(rule.patron_concepto.toLowerCase())) {
              match = { type: "rule", data: rule };
              matchType = "rule";
              confidence = rule.confianza_minima;
              break;
            }
          }
        }

        results.push({
          bankTransaction: bankTx,
          match,
          matchType,
          confidence,
          status: confidence >= 90 ? "auto" : confidence >= 50 ? "review" : "unmatched",
          suggestedCategory: match?.type === "rule" ? match.data.categoria_destino : null,
          suggestedType: match?.type === "rule" ? match.data.tipo_transaccion : 
                        (bankTx.isIncome ? "Ingreso" : "Gasto")
        });
      }

      setMatchResults(results);

      // Generar análisis con IA para transacciones no coincidentes
      const unmatchedTxs = results.filter(r => r.status === "unmatched");
      if (unmatchedTxs.length > 0) {
        await generateAISuggestions(unmatchedTxs);
      }

      // Guardar sesión
      const stats = {
        total: results.length,
        auto: results.filter(r => r.status === "auto").length,
        review: results.filter(r => r.status === "review").length,
        unmatched: results.filter(r => r.status === "unmatched").length,
        totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0)
      };

      await createSessionMutation.mutateAsync({
        nombre_archivo: fileName,
        tipo_archivo: fileName.endsWith('.pdf') ? "PDF" : "CSV",
        total_transacciones: stats.total,
        conciliadas_automaticas: stats.auto,
        discrepancias: stats.review,
        sin_conciliar: stats.unmatched,
        importe_total_extracto: stats.totalAmount,
        estado: stats.unmatched === 0 ? "Completada" : "Parcial",
        transacciones_procesadas: results.map(r => ({
          fecha: r.bankTransaction.date,
          concepto: r.bankTransaction.concept,
          importe: r.bankTransaction.amount,
          estado: r.status === "auto" ? "conciliada" : r.status === "review" ? "discrepancia" : "pendiente",
          confianza: r.confidence,
          tipo_match: r.matchType
        }))
      });

    } catch (error) {
      console.error("Error in AI matching:", error);
      toast.error("Error en el análisis de IA");
    }
    
    setAiAnalyzing(false);
  };

  // Generar sugerencias con IA
  const generateAISuggestions = async (unmatchedResults) => {
    try {
      const transactionsText = unmatchedResults.map(r => 
        `- ${r.bankTransaction.date}: "${r.bankTransaction.concept}" - ${r.bankTransaction.amount}€`
      ).join('\n');

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Analiza estas transacciones bancarias de un club deportivo que no han podido ser emparejadas automáticamente. 
Sugiere categorías y posibles coincidencias basándote en el concepto.

Transacciones sin emparejar:
${transactionsText}

Categorías disponibles para ingresos: ${CATEGORIAS_INGRESO.join(', ')}
Categorías disponibles para gastos: ${CATEGORIAS_GASTO.join(', ')}

Para cada transacción, sugiere:
1. Si es ingreso o gasto
2. Categoría más probable
3. Posible proveedor/cliente
4. Patrón de texto que podría usarse para futuras conciliaciones automáticas`,
        response_json_schema: {
          type: "object",
          properties: {
            sugerencias: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  concepto_original: { type: "string" },
                  es_ingreso: { type: "boolean" },
                  categoria_sugerida: { type: "string" },
                  proveedor_cliente: { type: "string" },
                  patron_para_regla: { type: "string" },
                  confianza: { type: "number" },
                  explicacion: { type: "string" }
                }
              }
            },
            resumen: { type: "string" }
          }
        }
      });

      setAiSuggestions(response);
    } catch (error) {
      console.error("Error generating AI suggestions:", error);
    }
  };

  // Conciliar transacción
  const handleReconcile = async (result, manualCategory = null) => {
    setProcessing(true);
    try {
      const bankTx = result.bankTransaction;
      
      if (result.match?.type === "payment") {
        // Actualizar pago como reconciliado
        await base44.entities.Payment.update(result.match.data.id, {
          estado: "Pagado",
          reconciliado_banco: true,
          fecha_reconciliacion: new Date().toISOString(),
          fecha_pago: bankTx.date,
          notas: `${result.match.data.notas || ''}\nReconciliado con extracto: ${bankTx.concept}`
        });
        toast.success(`Pago de ${result.match.data.jugador_nombre} conciliado`);
        
      } else if (result.match?.type === "transaction") {
        // Actualizar transacción existente
        await base44.entities.FinancialTransaction.update(result.match.data.id, {
          estado: result.suggestedType === "Ingreso" ? "Cobrado" : "Pagado",
          notas: `${result.match.data.notas || ''}\nReconciliado con extracto: ${bankTx.concept}`
        });
        toast.success("Transacción conciliada");
        
      } else {
        // Crear nueva transacción financiera
        const category = manualCategory || result.suggestedCategory || 
                        (bankTx.isIncome ? "Otros Ingresos" : "Otros Gastos");
        
        await base44.entities.FinancialTransaction.create({
          tipo: bankTx.isIncome ? "Ingreso" : "Gasto",
          concepto: bankTx.concept,
          cantidad: bankTx.amount,
          fecha: bankTx.date,
          categoria: category,
          estado: bankTx.isIncome ? "Cobrado" : "Pagado",
          temporada: getCurrentSeason(),
          notas: "Creado desde conciliación bancaria"
        });
        toast.success("Nueva transacción creada desde extracto");
      }

      // Actualizar resultados
      setMatchResults(prev => prev.map(r => 
        r.bankTransaction.id === bankTx.id 
          ? { ...r, status: "reconciled" }
          : r
      ));

      if (onReconcile) onReconcile();
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['financialTransactions'] });
      
    } catch (error) {
      console.error("Error reconciling:", error);
      toast.error("Error al conciliar");
    }
    setProcessing(false);
  };

  // Crear regla desde corrección manual
  const handleCreateRule = async (result, category, tipo) => {
    const pattern = extractPattern(result.bankTransaction.concept);
    
    await createRuleMutation.mutateAsync({
      patron_concepto: pattern,
      categoria_destino: category,
      tipo_transaccion: tipo,
      confianza_minima: 80,
      veces_aplicada: 1,
      ultima_aplicacion: new Date().toISOString()
    });

    // Conciliar con la categoría seleccionada
    await handleReconcile(result, category);
    setShowRuleDialog(false);
  };

  // Extraer patrón del concepto
  const extractPattern = (concept) => {
    // Eliminar números, fechas y caracteres especiales para crear patrón
    return concept
      .replace(/\d{2}[\/-]\d{2}[\/-]\d{2,4}/g, '')
      .replace(/\d+/g, '')
      .replace(/[^\w\s]/g, '')
      .trim()
      .toLowerCase()
      .split(' ')
      .filter(w => w.length > 3)
      .slice(0, 3)
      .join(' ');
  };

  // Conciliar todas las automáticas
  const handleReconcileAll = async () => {
    const autoMatches = matchResults.filter(r => r.status === "auto");
    if (autoMatches.length === 0) return;

    setProcessing(true);
    let success = 0;

    for (const result of autoMatches) {
      try {
        await handleReconcile(result);
        success++;
      } catch (error) {
        console.error("Error:", error);
      }
    }

    toast.success(`${success} transacciones conciliadas automáticamente`);
    setProcessing(false);
  };

  const getCurrentSeason = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
  };

  // Estadísticas
  const stats = useMemo(() => {
    const auto = matchResults.filter(r => r.status === "auto").length;
    const review = matchResults.filter(r => r.status === "review").length;
    const unmatched = matchResults.filter(r => r.status === "unmatched").length;
    const reconciled = matchResults.filter(r => r.status === "reconciled").length;
    const total = matchResults.length;

    return { auto, review, unmatched, reconciled, total };
  }, [matchResults]);

  // Descargar plantilla
  const downloadTemplate = () => {
    const csv = `Fecha,Concepto,Importe
2025-01-15,CUOTA ENERO JUAN PEREZ,50.00
2025-01-16,TRANSFERENCIA AYUNTAMIENTO SUBVENCION,1500.00
2025-01-17,PAGO ARBITRAJE PARTIDO,-85.00
2025-01-18,BIZUM MARIA GARCIA EQUIPACION,35.00`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_extracto_bancario.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Exportar informe
  const exportReport = () => {
    const lines = [
      "INFORME DE CONCILIACIÓN BANCARIA",
      `Fecha: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`,
      "",
      "RESUMEN:",
      `- Total transacciones: ${stats.total}`,
      `- Conciliadas automáticamente: ${stats.auto}`,
      `- Pendientes de revisión: ${stats.review}`,
      `- Sin coincidencia: ${stats.unmatched}`,
      `- Ya reconciliadas: ${stats.reconciled}`,
      "",
      "DETALLE:",
      ""
    ];

    matchResults.forEach(r => {
      lines.push(`${r.bankTransaction.date} | ${r.bankTransaction.concept} | ${r.bankTransaction.amount}€ | Estado: ${r.status} | Confianza: ${r.confidence}%`);
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `informe_conciliacion_${format(new Date(), "yyyyMMdd")}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-none shadow-xl bg-gradient-to-r from-purple-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Brain className="w-6 h-6 text-purple-600" />
            Conciliación Inteligente con IA
            <Badge className="ml-2 bg-purple-100 text-purple-700">
              <Sparkles className="w-3 h-3 mr-1" />
              Aprende de tus correcciones
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600 text-sm">
            Sube tu extracto bancario y la IA emparejará automáticamente las transacciones, 
            detectará discrepancias y aprenderá de tus correcciones para mejorar futuras conciliaciones.
          </p>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="upload" className="gap-2">
            <Upload className="w-4 h-4" />
            Subir Extracto
          </TabsTrigger>
          <TabsTrigger value="results" className="gap-2" disabled={matchResults.length === 0}>
            <FileSpreadsheet className="w-4 h-4" />
            Resultados
            {stats.total > 0 && <Badge variant="outline">{stats.total}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-2">
            <Settings className="w-4 h-4" />
            Reglas IA
            <Badge variant="outline">{reconciliationRules.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        {/* Tab: Subir Extracto */}
        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <Alert className="bg-blue-50 border-blue-300">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  <strong>🤖 Cómo funciona la IA:</strong>
                  <ol className="mt-2 space-y-1 text-sm ml-4 list-decimal">
                    <li>Sube un extracto bancario (CSV o PDF)</li>
                    <li>La IA analiza cada transacción y busca coincidencias</li>
                    <li>Las coincidencias de alta confianza se concilian automáticamente</li>
                    <li>Revisas y corriges las discrepancias manualmente</li>
                    <li>La IA aprende de tus correcciones para mejorar</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <div className="flex gap-3">
                <Button
                  onClick={() => document.getElementById('bank-file-upload').click()}
                  disabled={uploading || aiAnalyzing}
                  className="bg-purple-600 hover:bg-purple-700"
                  size="lg"
                >
                  {uploading || aiAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      {aiAnalyzing ? "Analizando con IA..." : "Procesando..."}
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 mr-2" />
                      Subir Extracto Bancario
                    </>
                  )}
                </Button>
                <input
                  id="bank-file-upload"
                  type="file"
                  accept=".csv,.txt,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="w-4 h-4 mr-2" />
                  Descargar Plantilla CSV
                </Button>
              </div>

              <div className="text-sm text-slate-500">
                Formatos soportados: CSV, TXT, PDF (la IA extrae datos de PDFs automáticamente)
              </div>
            </CardContent>
          </Card>

          {/* Reglas activas */}
          {reconciliationRules.filter(r => r.activa).length > 0 && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  Reglas de IA Activas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {reconciliationRules.filter(r => r.activa).slice(0, 5).map(rule => (
                    <Badge key={rule.id} variant="outline" className="text-xs">
                      "{rule.patron_concepto}" → {rule.categoria_destino}
                      <span className="ml-1 text-slate-400">({rule.veces_aplicada}x)</span>
                    </Badge>
                  ))}
                  {reconciliationRules.filter(r => r.activa).length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{reconciliationRules.filter(r => r.activa).length - 5} más
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Resultados */}
        <TabsContent value="results" className="space-y-4">
          {/* Estadísticas */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card className="bg-slate-50">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-slate-600">Total</p>
              </CardContent>
            </Card>
            <Card className="bg-green-50">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-green-700">{stats.auto}</p>
                <p className="text-xs text-green-600">Automáticas</p>
              </CardContent>
            </Card>
            <Card className="bg-yellow-50">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-yellow-700">{stats.review}</p>
                <p className="text-xs text-yellow-600">Revisar</p>
              </CardContent>
            </Card>
            <Card className="bg-red-50">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-red-700">{stats.unmatched}</p>
                <p className="text-xs text-red-600">Sin match</p>
              </CardContent>
            </Card>
            <Card className="bg-blue-50">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-blue-700">{stats.reconciled}</p>
                <p className="text-xs text-blue-600">Conciliadas</p>
              </CardContent>
            </Card>
          </div>

          {/* Acciones */}
          <div className="flex gap-3">
            <Button
              onClick={handleReconcileAll}
              disabled={processing || stats.auto === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Conciliar Automáticas ({stats.auto})
            </Button>
            <Button variant="outline" onClick={exportReport}>
              <FileText className="w-4 h-4 mr-2" />
              Exportar Informe
            </Button>
          </div>

          {/* Sugerencias IA */}
          {aiSuggestions && (
            <Card className="border-purple-200 bg-purple-50">
              <CardHeader className="py-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  Sugerencias de la IA
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-purple-900 mb-3">{aiSuggestions.resumen}</p>
                <div className="space-y-2">
                  {aiSuggestions.sugerencias?.slice(0, 3).map((sug, i) => (
                    <div key={i} className="bg-white rounded p-2 text-sm">
                      <p className="font-medium">{sug.concepto_original}</p>
                      <p className="text-slate-600">
                        → {sug.es_ingreso ? "Ingreso" : "Gasto"}: {sug.categoria_sugerida}
                        {sug.proveedor_cliente && ` (${sug.proveedor_cliente})`}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabla de resultados */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead className="text-right">Importe</TableHead>
                      <TableHead>Coincidencia</TableHead>
                      <TableHead>Confianza</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matchResults.map((result, index) => (
                      <TableRow 
                        key={index}
                        className={
                          result.status === "reconciled" ? "bg-blue-50" :
                          result.status === "auto" ? "bg-green-50" :
                          result.status === "review" ? "bg-yellow-50" :
                          "bg-red-50"
                        }
                      >
                        <TableCell className="text-sm">{result.bankTransaction.date}</TableCell>
                        <TableCell className="max-w-xs truncate text-sm" title={result.bankTransaction.concept}>
                          {result.bankTransaction.concept}
                        </TableCell>
                        <TableCell className={`text-right font-bold ${result.bankTransaction.isIncome ? "text-green-600" : "text-red-600"}`}>
                          {result.bankTransaction.isIncome ? "+" : "-"}{result.bankTransaction.amount}€
                        </TableCell>
                        <TableCell className="text-sm">
                          {result.match ? (
                            <span>
                              {result.match.type === "payment" && `Pago: ${result.match.data.jugador_nombre}`}
                              {result.match.type === "transaction" && `Tx: ${result.match.data.concepto}`}
                              {result.match.type === "rule" && `Regla: ${result.match.data.categoria_destino}`}
                            </span>
                          ) : (
                            <span className="text-slate-400">Sin coincidencia</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            result.confidence >= 90 ? "bg-green-500" :
                            result.confidence >= 70 ? "bg-yellow-500" :
                            result.confidence >= 50 ? "bg-orange-500" :
                            "bg-red-500"
                          }>
                            {result.confidence}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {result.status === "reconciled" && <Badge className="bg-blue-500">Conciliada</Badge>}
                          {result.status === "auto" && <Badge className="bg-green-500">Auto</Badge>}
                          {result.status === "review" && <Badge className="bg-yellow-500">Revisar</Badge>}
                          {result.status === "unmatched" && <Badge className="bg-red-500">Sin match</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          {result.status !== "reconciled" && (
                            <div className="flex gap-1 justify-end">
                              {result.status === "auto" ? (
                                <Button
                                  size="sm"
                                  onClick={() => handleReconcile(result)}
                                  disabled={processing}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedTransaction(result);
                                    setShowRuleDialog(true);
                                  }}
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  Clasificar
                                </Button>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Reglas IA */}
        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-600" />
                Reglas de Aprendizaje
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reconciliationRules.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Brain className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                  <p>No hay reglas de aprendizaje todavía</p>
                  <p className="text-sm">La IA aprenderá de tus correcciones manuales</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patrón</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Veces Aplicada</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reconciliationRules.map(rule => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-mono text-sm">"{rule.patron_concepto}"</TableCell>
                        <TableCell>{rule.categoria_destino}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {rule.tipo_transaccion === "Ingreso" ? (
                              <><TrendingUp className="w-3 h-3 mr-1" />Ingreso</>
                            ) : (
                              <><TrendingDown className="w-3 h-3 mr-1" />Gasto</>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>{rule.veces_aplicada}x</TableCell>
                        <TableCell>
                          <Badge className={rule.activa ? "bg-green-500" : "bg-slate-300"}>
                            {rule.activa ? "Activa" : "Inactiva"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Historial */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                Sesiones de Conciliación
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reconciliationSessions.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <History className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                  <p>No hay sesiones de conciliación anteriores</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reconciliationSessions.map(session => (
                    <Card key={session.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{session.nombre_archivo}</p>
                            <p className="text-sm text-slate-500">
                              {format(new Date(session.created_date), "dd/MM/yyyy HH:mm", { locale: es })}
                            </p>
                          </div>
                          <Badge className={
                            session.estado === "Completada" ? "bg-green-500" :
                            session.estado === "Parcial" ? "bg-yellow-500" :
                            "bg-red-500"
                          }>
                            {session.estado}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-4 gap-2 mt-3 text-center text-sm">
                          <div className="bg-slate-50 rounded p-2">
                            <p className="font-bold">{session.total_transacciones}</p>
                            <p className="text-xs text-slate-500">Total</p>
                          </div>
                          <div className="bg-green-50 rounded p-2">
                            <p className="font-bold text-green-700">{session.conciliadas_automaticas}</p>
                            <p className="text-xs text-green-600">Auto</p>
                          </div>
                          <div className="bg-yellow-50 rounded p-2">
                            <p className="font-bold text-yellow-700">{session.discrepancias}</p>
                            <p className="text-xs text-yellow-600">Discrepancias</p>
                          </div>
                          <div className="bg-red-50 rounded p-2">
                            <p className="font-bold text-red-700">{session.sin_conciliar}</p>
                            <p className="text-xs text-red-600">Sin conciliar</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog: Clasificar transacción manualmente */}
      <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600" />
              Clasificar Transacción
            </DialogTitle>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-sm text-slate-500">Transacción:</p>
                <p className="font-medium">{selectedTransaction.bankTransaction.concept}</p>
                <p className="text-lg font-bold mt-1">
                  {selectedTransaction.bankTransaction.isIncome ? "+" : "-"}
                  {selectedTransaction.bankTransaction.amount}€
                </p>
              </div>

              {aiSuggestions?.sugerencias?.find(s => 
                s.concepto_original === selectedTransaction.bankTransaction.concept
              ) && (
                <Alert className="bg-purple-50 border-purple-200">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <AlertDescription className="text-purple-900 text-sm">
                    <strong>Sugerencia IA:</strong>{" "}
                    {aiSuggestions.sugerencias.find(s => 
                      s.concepto_original === selectedTransaction.bankTransaction.concept
                    )?.explicacion}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-3">
                <div>
                  <Label>Tipo de transacción</Label>
                  <Select
                    defaultValue={selectedTransaction.bankTransaction.isIncome ? "Ingreso" : "Gasto"}
                    onValueChange={(v) => setSelectedTransaction({
                      ...selectedTransaction,
                      suggestedType: v
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ingreso">
                        <span className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                          Ingreso
                        </span>
                      </SelectItem>
                      <SelectItem value="Gasto">
                        <span className="flex items-center gap-2">
                          <TrendingDown className="w-4 h-4 text-red-600" />
                          Gasto
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Categoría</Label>
                  <Select
                    onValueChange={(v) => setSelectedTransaction({
                      ...selectedTransaction,
                      selectedCategory: v
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {(selectedTransaction.suggestedType === "Ingreso" ? CATEGORIAS_INGRESO : CATEGORIAS_GASTO)
                        .map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                </div>

                <Alert className="bg-blue-50 border-blue-200">
                  <Brain className="w-4 h-4 text-blue-600" />
                  <AlertDescription className="text-blue-900 text-sm">
                    Esta clasificación se guardará como regla de aprendizaje para futuras conciliaciones.
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRuleDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => handleCreateRule(
                selectedTransaction,
                selectedTransaction?.selectedCategory,
                selectedTransaction?.suggestedType || (selectedTransaction?.bankTransaction.isIncome ? "Ingreso" : "Gasto")
              )}
              disabled={!selectedTransaction?.selectedCategory || processing}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {processing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Clasificar y Aprender
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
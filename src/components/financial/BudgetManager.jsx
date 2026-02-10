import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Edit2, Trash2, TrendingUp, TrendingDown, AlertTriangle, Sparkles, Upload, Download, FileText, Loader2, Save, FolderOpen, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import AIBudgetAssistant from "./AIBudgetAssistant";
import BudgetExcelManager from "./BudgetExcelManager";

const PARTIDA_TEMPLATES = {
  "Ingresos": [
    "Cuotas Socios",
    "Inscripciones Jugadores",
    "Subvenciones Ayuntamiento",
    "Patrocinios",
    "Venta Equipación",
    "Eventos y Torneos",
    "Lotería Navidad",
    "Otros Ingresos"
  ],
  "Gastos Fijos": [
    "Seguros",
    "Federación (Fichas)",
    "Mantenimiento Instalaciones",
    "Suministros (Agua, Luz)",
    "Personal/Entrenadores"
  ],
  "Gastos Variables": [
    "Material Deportivo",
    "Equipación",
    "Arbitrajes",
    "Desplazamientos",
    "Botiquín/Médico",
    "Trofeos y Premios"
  ],
  "Inversiones": [
    "Mejora Instalaciones",
    "Equipamiento",
    "Formación",
    "Marketing"
  ]
};

export default function BudgetManager({ 
  budget, 
  onUpdate, 
  onDelete,
  historicalTransactions = [],
  historicalBudgets = []
}) {
  const [showAddPartida, setShowAddPartida] = useState(false);
  const [editingPartida, setEditingPartida] = useState(null);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [showLoadTemplateDialog, setShowLoadTemplateDialog] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importedPartidas, setImportedPartidas] = useState([]);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [updatingExecuted, setUpdatingExecuted] = useState(false);
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);
  const [isImportingExcel, setIsImportingExcel] = useState(false);
  const [newPartida, setNewPartida] = useState({
    nombre: "",
    categoria: "Gastos Variables",
    presupuestado: 0
  });
  
  const queryClient = useQueryClient();

  // Cargar plantillas guardadas
  const { data: savedTemplates = [] } = useQuery({
    queryKey: ['budgetTemplates'],
    queryFn: () => base44.entities.BudgetTemplate.list('-created_date'),
  });

  // Guardar plantilla
  const saveTemplateMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.BudgetTemplate.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgetTemplates'] });
      setShowSaveTemplateDialog(false);
      setTemplateName("");
      setTemplateDescription("");
      toast.success("✅ Plantilla guardada para futuros presupuestos");
    },
  });

  // Eliminar plantilla
  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.BudgetTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgetTemplates'] });
      toast.success("Plantilla eliminada");
    },
  });

  // Guardar partidas actuales como plantilla
  const handleSaveAsTemplate = () => {
    if (!templateName.trim()) {
      toast.error("Introduce un nombre para la plantilla");
      return;
    }

    const partidas = budget?.partidas || [];
    const ingresos = partidas.filter(p => p.categoria === "Ingresos").reduce((sum, p) => sum + (p.presupuestado || 0), 0);
    const gastos = partidas.filter(p => p.categoria !== "Ingresos").reduce((sum, p) => sum + (p.presupuestado || 0), 0);

    saveTemplateMutation.mutate({
      nombre: templateName,
      descripcion: templateDescription,
      partidas: partidas.map(p => ({
        nombre: p.nombre,
        categoria: p.categoria,
        presupuestado: p.presupuestado
      })),
      temporada_origen: budget?.temporada,
      total_ingresos: ingresos,
      total_gastos: gastos,
      activa: true
    });
  };

  // Cargar plantilla en presupuesto actual
  const handleLoadTemplate = (template) => {
    const newPartidas = template.partidas.map((p, idx) => ({
      id: `partida_template_${Date.now()}_${idx}`,
      nombre: p.nombre,
      categoria: p.categoria,
      presupuestado: p.presupuestado || 0,
      ejecutado: 0
    }));

    onUpdate({ partidas: newPartidas });
    setShowLoadTemplateDialog(false);
    toast.success(`Plantilla "${template.nombre}" cargada con ${newPartidas.length} partidas`);
  };

  // Función para importar presupuesto desde PDF
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error("Por favor, sube un archivo PDF");
      return;
    }

    setIsImporting(true);
    try {
      // Subir el archivo
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Extraer datos del PDF usando IA
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            partidas: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  nombre: { type: "string", description: "Nombre de la partida presupuestaria" },
                  categoria: { 
                    type: "string", 
                    enum: ["Ingresos", "Gastos Fijos", "Gastos Variables", "Inversiones"],
                    description: "Categoría de la partida"
                  },
                  presupuestado: { type: "number", description: "Importe presupuestado en euros" }
                }
              }
            },
            temporada: { type: "string", description: "Temporada del presupuesto (ej: 2025/2026)" }
          }
        }
      });

      if (result.status === "success" && result.output?.partidas?.length > 0) {
        setImportedPartidas(result.output.partidas);
        toast.success(`Se encontraron ${result.output.partidas.length} partidas en el PDF`);
      } else {
        toast.error("No se pudieron extraer partidas del PDF. Verifica que el formato sea correcto.");
      }
    } catch (error) {
      console.error("Error al importar:", error);
      toast.error("Error al procesar el archivo PDF");
    } finally {
      setIsImporting(false);
    }
  };

  const handleApplyImportedPartidas = () => {
    if (importedPartidas.length === 0) return;

    const newPartidas = importedPartidas.map((p, idx) => ({
      id: `partida_import_${Date.now()}_${idx}`,
      nombre: p.nombre,
      categoria: p.categoria || "Gastos Variables",
      presupuestado: p.presupuestado || 0,
      ejecutado: 0
    }));

    const updatedPartidas = [...(budget?.partidas || []), ...newPartidas];
    onUpdate({ partidas: updatedPartidas });
    setImportedPartidas([]);
    setShowImportDialog(false);
    toast.success(`${newPartidas.length} partidas importadas correctamente`);
  };

  // Cargar partidas base sin borrar las existentes
  const handleLoadDefaultPartidas = () => {
    const defaults = [
      // Ingresos
      { nombre: 'Inscripciones Jugadores', categoria: 'Ingresos' },
      { nombre: 'Cuotas Socios', categoria: 'Ingresos' },
      { nombre: 'Patrocinios', categoria: 'Ingresos' },
      { nombre: 'Lotería Navidad', categoria: 'Ingresos' },
      { nombre: 'Venta Equipación', categoria: 'Ingresos' },
      { nombre: 'Subvenciones', categoria: 'Ingresos' },
      // Gastos
      { nombre: 'Arbitrajes', categoria: 'Gastos Variables' },
      { nombre: 'Instalaciones', categoria: 'Gastos Fijos' },
      { nombre: 'Material Deportivo', categoria: 'Gastos Variables' },
      { nombre: 'Viajes', categoria: 'Gastos Variables' },
      { nombre: 'Publicidad y Redes', categoria: 'Gastos Variables' },
    ];

    const existentes = new Set((budget?.partidas || []).map(p => `${(p.nombre||'').toLowerCase()}|${(p.categoria||'').toLowerCase()}`));
    const toAdd = defaults
      .filter(d => !existentes.has(`${d.nombre.toLowerCase()}|${d.categoria.toLowerCase()}`))
      .map((d, idx) => ({ id: `partida_default_${Date.now()}_${idx}`, nombre: d.nombre, categoria: d.categoria, presupuestado: 0, ejecutado: 0 }));

    if (toAdd.length === 0) {
      toast.info('Ya tienes todas las partidas base');
      return;
    }
    onUpdate({ partidas: [ ...(budget?.partidas || []), ...toAdd ] });
    toast.success(`Añadidas ${toAdd.length} partidas base`);
  };

  // Descargar presupuesto como Excel
  const handleDownloadExcel = async () => {
    setIsDownloadingExcel(true);
    try {
      const { data } = await base44.functions.invoke('downloadBudgetExcel', {
        budgetId: budget.id
      });
      
      if (data?.file_url) {
        // Descargar el archivo
        const link = document.createElement('a');
        link.href = data.file_url;
        link.download = `Presupuesto_${budget.nombre}_${budget.temporada}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('✅ Presupuesto descargado como Excel');
      } else {
        toast.error('Error al generar el Excel');
      }
    } catch (error) {
      console.error('Error descargando Excel:', error);
      toast.error('Error al descargar el presupuesto');
    } finally {
      setIsDownloadingExcel(false);
    }
  };

  // Importar presupuesto desde Excel
  const handleImportExcel = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingExcel(true);
    try {
      // Subir archivo y extraer datos
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            partidas: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  nombre: { type: "string" },
                  categoria: { type: "string", enum: ["Ingresos", "Gastos Fijos", "Gastos Variables", "Inversiones"] },
                  presupuestado: { type: "number" },
                  ejecutado: { type: "number" }
                }
              }
            }
          }
        }
      });

      if (result.status === "success" && result.output?.partidas?.length > 0) {
        const importedPartidas = result.output.partidas.map((p, idx) => ({
          id: `partida_import_${Date.now()}_${idx}`,
          nombre: p.nombre,
          categoria: p.categoria || "Gastos Variables",
          presupuestado: p.presupuestado || 0,
          ejecutado: p.ejecutado || 0
        }));
        
        onUpdate({ partidas: importedPartidas });
        toast.success(`✅ ${importedPartidas.length} partidas importadas del Excel`);
      } else {
        toast.error('No se pudieron extraer partidas del Excel');
      }
    } catch (error) {
      console.error('Error importando Excel:', error);
      toast.error('Error al procesar el archivo Excel');
    } finally {
      setIsImportingExcel(false);
      // Reset input
      e.target.value = '';
    }
  };

  const partidas = budget?.partidas || [];

  const getPartidasByCategoria = (categoria) => {
    return partidas.filter(p => p.categoria === categoria);
  };

  const calcularTotales = () => {
    const ingresos = partidas.filter(p => p.categoria === "Ingresos");
    const gastos = partidas.filter(p => p.categoria !== "Ingresos");

    return {
      totalPresupuestadoIngresos: ingresos.reduce((sum, p) => sum + (p.presupuestado || 0), 0),
      totalEjecutadoIngresos: ingresos.reduce((sum, p) => sum + (p.ejecutado || 0), 0),
      totalPresupuestadoGastos: gastos.reduce((sum, p) => sum + (p.presupuestado || 0), 0),
      totalEjecutadoGastos: gastos.reduce((sum, p) => sum + (p.ejecutado || 0), 0)
    };
  };

  const totales = calcularTotales();

  const handleAddPartida = () => {
    if (!newPartida.nombre) {
      toast.error("Introduce un nombre para la partida");
      return;
    }

    const updatedPartidas = [
      ...partidas,
      {
        id: `partida_${Date.now()}`,
        ...newPartida,
        ejecutado: 0
      }
    ];

    onUpdate({ partidas: updatedPartidas });
    setNewPartida({ nombre: "", categoria: "Gastos Variables", presupuestado: 0 });
    setShowAddPartida(false);
    toast.success("Partida añadida");
  };

  const handleUpdatePartida = () => {
    const updatedPartidas = partidas.map(p => 
      p.id === editingPartida.id ? editingPartida : p
    );
    onUpdate({ partidas: updatedPartidas });
    setEditingPartida(null);
    toast.success("Partida actualizada");
  };

  const handleDeletePartida = (partidaId) => {
    const updatedPartidas = partidas.filter(p => p.id !== partidaId);
    onUpdate({ partidas: updatedPartidas });
    toast.success("Partida eliminada");
  };

  const getProgressColor = (presupuestado, ejecutado, esIngreso) => {
    const porcentaje = presupuestado > 0 ? (ejecutado / presupuestado) * 100 : 0;
    if (esIngreso) {
      return porcentaje >= 100 ? "bg-green-500" : porcentaje >= 75 ? "bg-blue-500" : "bg-orange-500";
    } else {
      return porcentaje > 100 ? "bg-red-500" : porcentaje >= 80 ? "bg-orange-500" : "bg-green-500";
    }
  };

  const renderPartidaRow = (partida) => {
    const esIngreso = partida.categoria === "Ingresos";
    const porcentajeRaw = partida.presupuestado > 0 
      ? (partida.ejecutado / partida.presupuestado) * 100 
      : 0;
    const porcentaje = Math.max(0, Math.min(100, porcentajeRaw));
    const desviacion = (partida.ejecutado || 0) - (partida.presupuestado || 0);

    return (
      <div key={partida.id} className="border rounded-lg p-3 bg-white">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-sm">{partida.nombre}</span>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => setEditingPartida(partida)}
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-red-500 hover:text-red-700"
              onClick={() => handleDeletePartida(partida.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-600">
            <span>Presupuestado: {partida.presupuestado?.toLocaleString()}€</span>
            <span>Ejecutado: {(partida.ejecutado || 0).toLocaleString()}€</span>
          </div>
          <Progress 
            value={Math.min(porcentaje, 100)} 
            className={`h-2 ${getProgressColor(partida.presupuestado, partida.ejecutado, esIngreso)}`}
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500">{porcentaje.toFixed(0)}%</span>
            {desviacion !== 0 && (
              <Badge 
                variant="outline" 
                className={`text-xs ${
                  esIngreso 
                    ? (desviacion >= 0 ? "text-green-600 border-green-300" : "text-red-600 border-red-300")
                    : (desviacion <= 0 ? "text-green-600 border-green-300" : "text-red-600 border-red-300")
                }`}
              >
                {desviacion > 0 ? "+" : ""}{desviacion.toLocaleString()}€
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Gestor de Excel y Google Drive */}
      <BudgetExcelManager 
        budget={budget}
        onImportSuccess={() => onUpdate({ partidas: budget?.partidas })}
      />

      {/* Resumen General */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-800">Ingresos Presupuestados</span>
            </div>
            <p className="text-2xl font-bold text-green-700">
              {totales.totalPresupuestadoIngresos.toLocaleString()}€
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Ingresos Ejecutados</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">
              {totales.totalEjecutadoIngresos.toLocaleString()}€
            </p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-5 w-5 text-orange-600" />
              <span className="text-sm font-medium text-orange-800">Gastos Presupuestados</span>
            </div>
            <p className="text-2xl font-bold text-orange-700">
              {totales.totalPresupuestadoGastos.toLocaleString()}€
            </p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              <span className="text-sm font-medium text-red-800">Gastos Ejecutados</span>
            </div>
            <p className="text-2xl font-bold text-red-700">
              {totales.totalEjecutadoGastos.toLocaleString()}€
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Balance */}
      <Card className={`border-2 ${
        (totales.totalEjecutadoIngresos - totales.totalEjecutadoGastos) >= 0 
          ? "border-green-300 bg-green-50" 
          : "border-red-300 bg-red-50"
      }`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Balance Actual</p>
              <p className="text-3xl font-bold">
                {(totales.totalEjecutadoIngresos - totales.totalEjecutadoGastos).toLocaleString()}€
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600">Balance Presupuestado</p>
              <p className="text-xl font-semibold text-slate-700">
                {(totales.totalPresupuestadoIngresos - totales.totalPresupuestadoGastos).toLocaleString()}€
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integración con Google Sheets gestionada desde Panel de Tesorería > Presupuestos */}

      {/* Botones de acción - SIMPLIFICADOS */}
      <div className="flex flex-wrap justify-end gap-2">
        {savedTemplates.length > 0 && (
          <Button 
            onClick={() => setShowLoadTemplateDialog(true)} 
            variant="outline"
            size="sm"
          >
            <FolderOpen className="h-4 w-4 mr-2" />
            Plantillas ({savedTemplates.length})
          </Button>
        )}

        <Button 
          onClick={handleLoadDefaultPartidas}
          variant="outline"
          size="sm"
        >
          <Copy className="h-4 w-4 mr-2" />
          Cargar partidas base
        </Button>

        {/* Grupo de Excel */}
        <div className="flex gap-2">
          <Button 
            onClick={handleDownloadExcel}
            disabled={isDownloadingExcel}
            variant="outline"
            size="sm"
            className="border-green-500 text-green-600 hover:bg-green-50"
            title="Descargar presupuesto como Excel"
          >
            {isDownloadingExcel ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>

          <label className="relative">
            <Button 
              as="span"
              disabled={isImportingExcel}
              variant="outline"
              size="sm"
              className="border-blue-500 text-blue-600 hover:bg-blue-50 cursor-pointer"
              title="Importar Excel editado desde Drive"
            >
              {isImportingExcel ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
            </Button>
            <input 
              type="file" 
              accept=".xlsx,.xls"
              onChange={handleImportExcel}
              disabled={isImportingExcel}
              className="hidden"
            />
          </label>

          <Button 
            onClick={async () => {
              try {
                setUpdatingExecuted(true);
                const { data } = await base44.functions.invoke('updateBudgetExecuted', { budgetId: budget.id });
                if (data?.success) {
                  await queryClient.invalidateQueries({ queryKey: ['budgets'] });
                  toast.success('Ejecutado actualizado');
                } else {
                  toast.error(data?.error || 'No se pudo actualizar el ejecutado');
                }
              } catch (e) {
                console.error('updateBudgetExecuted error', e);
                toast.error('Error al actualizar el ejecutado');
              } finally {
                setUpdatingExecuted(false);
              }
            }}
            disabled={updatingExecuted}
            variant="outline"
            size="sm"
            className="border-slate-400 text-slate-700 hover:bg-slate-50"
            title="Recalcular datos ejecutados (automáticos)"
          >
            {updatingExecuted ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>

        <Button onClick={() => setShowAddPartida(true)} className="bg-orange-600 hover:bg-orange-700">
          <Plus className="h-4 w-4 mr-2" />
          Añadir Partida
        </Button>
      </div>

      {/* Partidas por categoría */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.keys(PARTIDA_TEMPLATES).map(categoria => {
          const partidasCategoria = getPartidasByCategoria(categoria);
          const esIngreso = categoria === "Ingresos";
          
          return (
            <Card key={categoria}>
              <CardHeader className={`py-3 ${esIngreso ? "bg-green-50" : "bg-slate-50"}`}>
                <CardTitle className="text-base flex items-center gap-2">
                  {esIngreso ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-orange-600" />
                  )}
                  {categoria}
                  <Badge variant="outline" className="ml-auto">
                    {partidasCategoria.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2">
                {partidasCategoria.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">
                    No hay partidas en esta categoría
                  </p>
                ) : (
                  partidasCategoria.map(renderPartidaRow)
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialog añadir partida */}
      <Dialog open={showAddPartida} onOpenChange={setShowAddPartida}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Partida Presupuestaria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Categoría</Label>
              <Select
                value={newPartida.categoria}
                onValueChange={(v) => setNewPartida({...newPartida, categoria: v, nombre: ""})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(PARTIDA_TEMPLATES).map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Nombre de la partida</Label>
              <Select
                value={newPartida.nombre}
                onValueChange={(v) => setNewPartida({...newPartida, nombre: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona o escribe..." />
                </SelectTrigger>
                <SelectContent>
                  {PARTIDA_TEMPLATES[newPartida.categoria]?.map(nombre => (
                    <SelectItem key={nombre} value={nombre}>{nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="mt-2"
                placeholder="O escribe un nombre personalizado..."
                value={newPartida.nombre}
                onChange={(e) => setNewPartida({...newPartida, nombre: e.target.value})}
              />
            </div>

            <div>
              <Label>Importe Presupuestado (€)</Label>
              <Input
                type="number"
                value={newPartida.presupuestado}
                onChange={(e) => setNewPartida({...newPartida, presupuestado: parseFloat(e.target.value) || 0})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPartida(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddPartida} className="bg-orange-600 hover:bg-orange-700">
              Añadir Partida
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog editar partida */}
      <Dialog open={!!editingPartida} onOpenChange={() => setEditingPartida(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Partida</DialogTitle>
          </DialogHeader>
          {editingPartida && (
            <div className="space-y-4 py-4">
              <div>
                <Label>Nombre</Label>
                <Input
                  value={editingPartida.nombre}
                  onChange={(e) => setEditingPartida({...editingPartida, nombre: e.target.value})}
                />
              </div>
              <div>
                <Label>Importe Presupuestado (€)</Label>
                <Input
                  type="number"
                  value={editingPartida.presupuestado}
                  onChange={(e) => setEditingPartida({...editingPartida, presupuestado: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label>Importe Ejecutado (€)</Label>
                <Input
                  type="number"
                  value={editingPartida.ejecutado || 0}
                  onChange={(e) => setEditingPartida({...editingPartida, ejecutado: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPartida(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdatePartida} className="bg-orange-600 hover:bg-orange-700">
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  );
}
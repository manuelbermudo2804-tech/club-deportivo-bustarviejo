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
import { Plus, Edit2, Trash2, TrendingUp, TrendingDown, AlertTriangle, Sparkles, Upload, FileText, Loader2, Save, FolderOpen, Copy, Sheet, RefreshCw, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import AIBudgetAssistant from "./AIBudgetAssistant";

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
  const [creatingSheet, setCreatingSheet] = useState(false);
  const [syncingFromSheet, setSyncingFromSheet] = useState(false);
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

  // Crear/Abrir Google Sheet
  const handleOpenInSheets = async () => {
    setCreatingSheet(true);
    try {
      const { data } = await base44.functions.invoke('budgetSheets', {
        action: 'createOrUpdateSheet',
        budgetId: budget.id
      });

      if (data.success) {
        // Refrescar budget para obtener la URL
        queryClient.invalidateQueries({ queryKey: ['budgets'] });
        
        // Abrir en nueva pestaña
        window.open(data.spreadsheetUrl, '_blank');
        toast.success('✅ Hoja de cálculo abierta en Google Sheets');
      }
    } catch (error) {
      console.error('Error abriendo Sheets:', error);
      toast.error('Error al abrir Google Sheets');
    } finally {
      setCreatingSheet(false);
    }
  };

  // Sincronizar desde Google Sheets
  const handleSyncFromSheet = async () => {
    if (!budget.google_sheet_id) {
      toast.error('No hay hoja de Google Sheets vinculada');
      return;
    }

    setSyncingFromSheet(true);
    try {
      const { data } = await base44.functions.invoke('budgetSheets', {
        action: 'syncFromSheet',
        budgetId: budget.id,
        spreadsheetId: budget.google_sheet_id
      });

      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['budgets'] });
        toast.success(`✅ ${data.partidasSincronizadas} partidas sincronizadas desde Sheets`);
      }
    } catch (error) {
      console.error('Error sincronizando:', error);
      toast.error('Error al sincronizar desde Google Sheets');
    } finally {
      setSyncingFromSheet(false);
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
    const porcentaje = partida.presupuestado > 0 
      ? Math.min((partida.ejecutado / partida.presupuestado) * 100, 150) 
      : 0;
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

      {/* Google Sheets Integration */}
      {budget.google_sheet_url && (
        <Card className="border-2 border-green-300 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
                  <Sheet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Conectado con Google Sheets</p>
                  <p className="text-xs text-slate-600">
                    {budget.fecha_ultima_sync 
                      ? `Última sincronización: ${new Date(budget.fecha_ultima_sync).toLocaleString('es-ES')}` 
                      : 'Aún no sincronizado'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleSyncFromSheet}
                  disabled={syncingFromSheet}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {syncingFromSheet ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sincronizando...</>
                  ) : (
                    <><RefreshCw className="h-4 w-4 mr-2" /> Traer cambios de Sheets</>
                  )}
                </Button>
                <Button
                  onClick={() => window.open(budget.google_sheet_url, '_blank')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir en Sheets
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Botones de acción */}
      <div className="flex flex-wrap justify-end gap-2">
        {!budget.google_sheet_id && (
          <Button 
            onClick={handleOpenInSheets}
            disabled={creatingSheet}
            className="bg-green-600 hover:bg-green-700"
          >
            {creatingSheet ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creando...</>
            ) : (
              <><Sheet className="h-4 w-4 mr-2" /> Abrir en Google Sheets</>
            )}
          </Button>
        )}
        <Button 
          onClick={() => setShowLoadTemplateDialog(true)} 
          variant="outline"
          className="border-green-300 text-green-700 hover:bg-green-50"
        >
          <FolderOpen className="h-4 w-4 mr-2" />
          Cargar Plantilla
          {savedTemplates.length > 0 && (
            <Badge className="ml-2 bg-green-100 text-green-700">{savedTemplates.length}</Badge>
          )}
        </Button>
        <Button 
          onClick={() => setShowSaveTemplateDialog(true)} 
          variant="outline"
          className="border-orange-300 text-orange-700 hover:bg-orange-50"
          disabled={!budget?.partidas?.length}
        >
          <Save className="h-4 w-4 mr-2" />
          Guardar Plantilla
        </Button>
        <Button 
          onClick={() => setShowImportDialog(true)} 
          variant="outline"
          className="border-blue-300 text-blue-700 hover:bg-blue-50"
        >
          <Upload className="h-4 w-4 mr-2" />
          Importar PDF
        </Button>
        <Button 
          onClick={() => setShowAIAssistant(true)} 
          variant="outline"
          className="border-purple-300 text-purple-700 hover:bg-purple-50"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Asistente IA
        </Button>
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

      {/* Asistente IA de Presupuestos */}
      <AIBudgetAssistant
        open={showAIAssistant}
        onClose={() => setShowAIAssistant(false)}
        currentBudget={budget}
        historicalTransactions={historicalTransactions}
        historicalBudgets={historicalBudgets}
        onApplyBudget={(newBudgetData) => {
          onUpdate(newBudgetData);
          setShowAIAssistant(false);
        }}
      />

      {/* Dialog guardar como plantilla */}
      <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="h-5 w-5 text-orange-600" />
              Guardar como Plantilla
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-sm text-orange-800">
                💾 Guarda las partidas actuales como plantilla para reutilizarlas en futuras temporadas.
              </p>
            </div>
            <div>
              <Label>Nombre de la plantilla *</Label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Ej: Presupuesto Base 2025-2026"
              />
            </div>
            <div>
              <Label>Descripción (opcional)</Label>
              <Textarea
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Descripción de esta plantilla..."
                rows={2}
              />
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-sm font-medium text-slate-700">
                Se guardarán {budget?.partidas?.length || 0} partidas
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Ingresos: {calcularTotales().totalPresupuestadoIngresos.toLocaleString()}€ | 
                Gastos: {calcularTotales().totalPresupuestadoGastos.toLocaleString()}€
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveTemplateDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveAsTemplate}
              disabled={!templateName.trim() || saveTemplateMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {saveTemplateMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...</>
              ) : (
                <><Save className="h-4 w-4 mr-2" /> Guardar Plantilla</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog cargar plantilla */}
      <Dialog open={showLoadTemplateDialog} onOpenChange={setShowLoadTemplateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-green-600" />
              Cargar Plantilla de Presupuesto
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {savedTemplates.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No hay plantillas guardadas</p>
                <p className="text-sm mt-1">Guarda tu presupuesto actual como plantilla para usarlo en el futuro</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {savedTemplates.map(template => (
                  <div 
                    key={template.id} 
                    className="border rounded-lg p-4 hover:border-green-300 hover:bg-green-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900">{template.nombre}</h4>
                        {template.descripcion && (
                          <p className="text-sm text-slate-600 mt-1">{template.descripcion}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {template.partidas?.length || 0} partidas
                          </Badge>
                          {template.temporada_origen && (
                            <Badge variant="outline" className="text-xs">
                              Origen: {template.temporada_origen}
                            </Badge>
                          )}
                          <Badge className="bg-green-100 text-green-700 text-xs">
                            +{(template.total_ingresos || 0).toLocaleString()}€
                          </Badge>
                          <Badge className="bg-red-100 text-red-700 text-xs">
                            -{(template.total_gastos || 0).toLocaleString()}€
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleLoadTemplate(template)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Usar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => deleteTemplateMutation.mutate(template.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLoadTemplateDialog(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog importar desde PDF */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Importar Presupuesto desde PDF
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                📄 Sube un archivo PDF con el presupuesto. El sistema extraerá automáticamente las partidas usando IA.
              </p>
              <p className="text-xs text-blue-600 mt-2">
                Formatos soportados: tablas con nombre de partida, categoría e importe.
              </p>
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
                id="pdf-upload"
                disabled={isImporting}
              />
              <label 
                htmlFor="pdf-upload" 
                className={`cursor-pointer ${isImporting ? 'opacity-50' : ''}`}
              >
                {isImporting ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
                    <p className="text-slate-600">Analizando PDF con IA...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <Upload className="h-12 w-12 text-slate-400" />
                    <p className="text-slate-600 font-medium">Arrastra o haz clic para subir el PDF</p>
                    <p className="text-xs text-slate-500">Máximo 10MB</p>
                  </div>
                )}
              </label>
            </div>

            {importedPartidas.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                  ✅ Partidas extraídas ({importedPartidas.length})
                </h4>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {importedPartidas.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
                      <div>
                        <p className="font-medium text-sm">{p.nombre}</p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {p.categoria}
                        </Badge>
                      </div>
                      <span className="font-bold text-green-600">
                        {p.presupuestado?.toLocaleString()}€
                      </span>
                    </div>
                  ))}
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800 font-medium">
                    Total: {importedPartidas.reduce((sum, p) => sum + (p.presupuestado || 0), 0).toLocaleString()}€
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowImportDialog(false);
              setImportedPartidas([]);
            }}>
              Cancelar
            </Button>
            {importedPartidas.length > 0 && (
              <Button 
                onClick={handleApplyImportedPartidas} 
                className="bg-green-600 hover:bg-green-700"
              >
                Importar {importedPartidas.length} Partidas
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
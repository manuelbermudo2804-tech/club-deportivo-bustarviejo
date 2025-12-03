import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Edit2, Trash2, TrendingUp, TrendingDown, AlertTriangle, Sparkles, Upload, FileText, Loader2 } from "lucide-react";
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
  const [newPartida, setNewPartida] = useState({
    nombre: "",
    categoria: "Gastos Variables",
    presupuestado: 0
  });

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

      {/* Botones de acción */}
      <div className="flex justify-end gap-3">
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
    </div>
  );
}
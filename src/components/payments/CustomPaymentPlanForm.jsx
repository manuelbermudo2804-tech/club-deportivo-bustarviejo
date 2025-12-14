import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Calendar, Euro, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const MESES_OPTIONS = [
  "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", 
  "Diciembre", "Enero", "Febrero", "Marzo", "Abril", "Mayo"
];

const TEMPLATES = [
  {
    nombre: "Fraccionado 6 meses",
    cuotas: [
      { mes: "Junio", cantidad: 47 },
      { mes: "Julio", cantidad: 47 },
      { mes: "Septiembre", cantidad: 47 },
      { mes: "Octubre", cantidad: 47 },
      { mes: "Noviembre", cantidad: 47 },
      { mes: "Diciembre", cantidad: 45 }
    ]
  },
  {
    nombre: "Mitad temporada (4 meses)",
    cuotas: [
      { mes: "Octubre", cantidad: 70 },
      { mes: "Noviembre", cantidad: 70 },
      { mes: "Diciembre", cantidad: 70 },
      { mes: "Enero", cantidad: 70 }
    ]
  },
  {
    nombre: "Beca 50% (3 cuotas)",
    cuotas: [
      { mes: "Junio", cantidad: 58 },
      { mes: "Septiembre", cantidad: 50 },
      { mes: "Diciembre", cantidad: 47 }
    ]
  }
];

export default function CustomPaymentPlanForm({ open, onClose, player, existingPlan, onSubmit, isSubmitting }) {
  const [motivo, setMotivo] = useState("");
  const [cuotas, setCuotas] = useState([]);
  const [mensajeFamilia, setMensajeFamilia] = useState("");
  const [notasInternas, setNotasInternas] = useState("");

  useEffect(() => {
    if (existingPlan) {
      setMotivo(existingPlan.motivo || "");
      setCuotas(existingPlan.cuotas_personalizadas || []);
      setMensajeFamilia(existingPlan.mensaje_para_familia || "");
      setNotasInternas(existingPlan.notas_internas || "");
    } else {
      setMotivo("");
      setCuotas([]);
      setMensajeFamilia("");
      setNotasInternas("");
    }
  }, [existingPlan, open]);

  const addCuota = () => {
    setCuotas([...cuotas, { mes: "Junio", cantidad: 0, fecha_vencimiento: "" }]);
  };

  const removeCuota = (index) => {
    setCuotas(cuotas.filter((_, i) => i !== index));
  };

  const updateCuota = (index, field, value) => {
    const updated = [...cuotas];
    updated[index] = { ...updated[index], [field]: value };
    setCuotas(updated);
  };

  const applyTemplate = (template) => {
    setCuotas(template.cuotas.map(c => ({ ...c, fecha_vencimiento: "" })));
  };

  const totalPlan = cuotas.reduce((sum, c) => sum + (parseFloat(c.cantidad) || 0), 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!motivo || cuotas.length === 0) {
      return;
    }

    const planData = {
      jugador_id: player.id,
      jugador_nombre: player.nombre,
      temporada: player.temporada_renovacion || getCurrentSeason(),
      motivo,
      cuotas_personalizadas: cuotas,
      total_plan: totalPlan,
      mensaje_para_familia: mensajeFamilia,
      notas_internas: notasInternas,
      activo: true
    };

    onSubmit(planData);
  };

  const getCurrentSeason = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return month >= 6 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            💰 Plan de Pago Personalizado - {player?.nombre}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Motivo */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              📝 Motivo del plan especial
            </label>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: Situación económica familiar, Incorporación a mitad de temporada, Beca deportiva..."
              className="h-20"
              required
            />
          </div>

          {/* Templates rápidos */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              ⚡ Plantillas rápidas (opcional)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TEMPLATES.map((template, idx) => (
                <Button
                  key={idx}
                  type="button"
                  variant="outline"
                  onClick={() => applyTemplate(template)}
                  className="text-xs"
                >
                  {template.nombre}
                </Button>
              ))}
            </div>
          </div>

          {/* Cuotas personalizadas */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium">
                💳 Cuotas del plan ({cuotas.length} cuotas)
              </label>
              <Button type="button" onClick={addCuota} size="sm" className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-1" />
                Añadir Cuota
              </Button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {cuotas.map((cuota, index) => (
                <Card key={index} className="p-3 bg-slate-50">
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4">
                      <label className="text-xs text-slate-600 mb-1 block">Mes</label>
                      <Select
                        value={cuota.mes}
                        onValueChange={(value) => updateCuota(index, 'mes', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MESES_OPTIONS.map(mes => (
                            <SelectItem key={mes} value={mes}>{mes}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <label className="text-xs text-slate-600 mb-1 block">Cantidad (€)</label>
                      <Input
                        type="number"
                        value={cuota.cantidad}
                        onChange={(e) => updateCuota(index, 'cantidad', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-4">
                      <label className="text-xs text-slate-600 mb-1 block">Vencimiento</label>
                      <Input
                        type="date"
                        value={cuota.fecha_vencimiento || ""}
                        onChange={(e) => updateCuota(index, 'fecha_vencimiento', e.target.value)}
                      />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCuota(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {cuotas.length === 0 && (
              <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
                <p className="text-slate-500 text-sm">Añade cuotas personalizadas o usa una plantilla</p>
              </div>
            )}
          </div>

          {/* Resumen del plan */}
          {cuotas.length > 0 && (
            <Card className="bg-blue-50 border-blue-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900">Total del plan:</p>
                  <p className="text-xs text-blue-700 mt-1">{cuotas.length} cuotas programadas</p>
                </div>
                <div className="text-3xl font-bold text-blue-900">
                  {totalPlan.toFixed(2)}€
                </div>
              </div>
            </Card>
          )}

          {/* Mensaje para la familia */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              💬 Mensaje para la familia (opcional)
            </label>
            <Textarea
              value={mensajeFamilia}
              onChange={(e) => setMensajeFamilia(e.target.value)}
              placeholder="Ej: Hemos ajustado las cuotas según vuestra situación. Cualquier duda, contactadnos."
              className="h-16"
            />
          </div>

          {/* Notas internas */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              🔒 Notas internas (solo visible para admins)
            </label>
            <Textarea
              value={notasInternas}
              onChange={(e) => setNotasInternas(e.target.value)}
              placeholder="Notas privadas sobre este plan..."
              className="h-16"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="bg-orange-600 hover:bg-orange-700"
              disabled={isSubmitting || !motivo || cuotas.length === 0}
            >
              {isSubmitting ? "Guardando..." : existingPlan ? "Actualizar Plan" : "Crear Plan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
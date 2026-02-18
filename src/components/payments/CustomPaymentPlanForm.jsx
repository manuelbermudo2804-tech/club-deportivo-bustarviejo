import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Zap } from "lucide-react";
import { toast } from "sonner";
import { getCuotasPorCategoriaSync } from "./paymentAmounts";
import { base44 } from "@/api/base44Client";

export default function CustomPaymentPlanForm({ open, onClose, player, existingPlan, onSubmit, isSubmitting, payments = [] }) {
  const [formData, setFormData] = useState({
    deuda_original: 0,
    deuda_condonada: 0,
    numero_cuotas: 3,
    motivo_plan: "Dificultad Económica",
    motivo_detalle: "",
    notas_internas: "",
    mensaje_para_familia: ""
  });

  const [cuotas, setCuotas] = useState([]);
  const [activeSeason, setActiveSeason] = useState(null);

  // Cargar temporada activa
  useEffect(() => {
    const fetchActiveSeason = async () => {
      const configs = await base44.entities.SeasonConfig.list();
      const active = configs.find(c => c.activa === true);
      setActiveSeason(active?.temporada || getCurrentSeason());
    };
    fetchActiveSeason();
  }, []);

  // Calcular deuda original automáticamente cuando se selecciona el jugador
  useEffect(() => {
    if (existingPlan) {
      setFormData({
        deuda_original: existingPlan.deuda_original || 0,
        deuda_condonada: existingPlan.deuda_condonada || 0,
        numero_cuotas: existingPlan.numero_cuotas || 3,
        motivo_plan: existingPlan.motivo_plan || "Dificultad Económica",
        motivo_detalle: existingPlan.motivo_detalle || "",
        notas_internas: existingPlan.notas_internas || "",
        mensaje_para_familia: existingPlan.mensaje_para_familia || ""
      });
      setCuotas(existingPlan.cuotas || []);
    } else if (player) {
      // CALCULAR DEUDA AUTOMÁTICAMENTE
      const cuotas = getCuotasPorCategoriaSync(player.deporte);
      const deudaTotal = cuotas.total;
      
      setFormData({
        deuda_original: deudaTotal,
        deuda_condonada: 0,
        numero_cuotas: 3,
        motivo_plan: "Dificultad Económica",
        motivo_detalle: "",
        notas_internas: "",
        mensaje_para_familia: ""
      });
      setCuotas([]);
    }
  }, [existingPlan, player, payments]);

  // Generar cuotas automáticamente cuando cambia el número
  const handleGenerateCuotas = () => {
    const deudaFinal = formData.deuda_original - formData.deuda_condonada;
    const cuotaMensual = Math.round((deudaFinal / formData.numero_cuotas) * 100) / 100;
    
    const nuevasCuotas = [];
    let total = 0;
    
    for (let i = 0; i < formData.numero_cuotas - 1; i++) {
      const vencimiento = new Date();
      vencimiento.setMonth(vencimiento.getMonth() + i + 1);
      
      nuevasCuotas.push({
        numero: i + 1,
        cantidad: cuotaMensual,
        fecha_vencimiento: vencimiento.toISOString().split('T')[0],
        pagada: false
      });
      total += cuotaMensual;
    }
    
    // Última cuota ajustada
    const ultimaCuota = Math.round((deudaFinal - total) * 100) / 100;
    const vencimientoUltima = new Date();
    vencimientoUltima.setMonth(vencimientoUltima.getMonth() + formData.numero_cuotas);
    
    nuevasCuotas.push({
      numero: formData.numero_cuotas,
      cantidad: ultimaCuota,
      fecha_vencimiento: vencimientoUltima.toISOString().split('T')[0],
      pagada: false
    });
    
    setCuotas(nuevasCuotas);
  };

  // Planes rápidos pre-concebidos
  const handleQuickPlan = (meses) => {
    setFormData({...formData, numero_cuotas: meses});
    
    const deudaFinal = formData.deuda_original - formData.deuda_condonada;
    const cuotaMensual = Math.round((deudaFinal / meses) * 100) / 100;
    
    const nuevasCuotas = [];
    let total = 0;
    
    for (let i = 0; i < meses - 1; i++) {
      const vencimiento = new Date();
      vencimiento.setMonth(vencimiento.getMonth() + i + 1);
      
      nuevasCuotas.push({
        numero: i + 1,
        cantidad: cuotaMensual,
        fecha_vencimiento: vencimiento.toISOString().split('T')[0],
        pagada: false
      });
      total += cuotaMensual;
    }
    
    // Última cuota ajustada
    const ultimaCuota = Math.round((deudaFinal - total) * 100) / 100;
    const vencimientoUltima = new Date();
    vencimientoUltima.setMonth(vencimientoUltima.getMonth() + meses);
    
    nuevasCuotas.push({
      numero: meses,
      cantidad: ultimaCuota,
      fecha_vencimiento: vencimientoUltima.toISOString().split('T')[0],
      pagada: false
    });
    
    setCuotas(nuevasCuotas);
    toast.success(`Plan de ${meses} cuotas generado automáticamente`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!player) {
      toast.error("Selecciona un jugador");
      return;
    }
    
    if (formData.deuda_original <= 0) {
      toast.error("La deuda original debe ser mayor a 0");
      return;
    }
    
    if (cuotas.length === 0) {
      toast.error("Genera las cuotas primero");
      return;
    }

    const deudaFinal = formData.deuda_original - formData.deuda_condonada;
    
    const planData = {
      jugador_id: player.id,
      jugador_nombre: player.nombre,
      familia_email: player.email_padre,
      temporada: activeSeason || getCurrentSeason(),
      deuda_original: formData.deuda_original,
      deuda_condonada: formData.deuda_condonada,
      deuda_final: deudaFinal,
      numero_cuotas: formData.numero_cuotas,
      cuotas: cuotas,
      motivo_plan: formData.motivo_plan,
      motivo_detalle: formData.motivo_detalle,
      notas_internas: formData.notas_internas,
      mensaje_para_familia: formData.mensaje_para_familia,
      estado: "Activo",
      notificaciones_activadas: true
    };

    console.log('📤 [CustomPaymentPlanForm] Enviando plan:', planData);
    onSubmit(planData);
  };

  const updateCuota = (index, field, value) => {
    const nuevasCuotas = [...cuotas];
    nuevasCuotas[index] = { ...nuevasCuotas[index], [field]: value };
    setCuotas(nuevasCuotas);
  };

  const deudaFinal = formData.deuda_original - formData.deuda_condonada;
  const totalCuotas = cuotas.reduce((sum, c) => sum + (c.cantidad || 0), 0);

  const getCurrentSeason = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>💝 {existingPlan ? "Editar" : "Crear"} Plan de Pago Personalizado</DialogTitle>
          {player && (
            <div className="flex items-center gap-2 mt-2">
              <Badge className="bg-purple-100 text-purple-800">
                {player.nombre} - {player.deporte}
              </Badge>
            </div>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Deuda */}
          <Card className="border-2 border-purple-200">
            <CardContent className="pt-4 space-y-4">
              <h3 className="font-bold text-purple-900">📊 Deuda</h3>
              
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  ℹ️ La deuda se calculó automáticamente según la categoría del jugador
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Deuda Original (€)</label>
                  <Input 
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.deuda_original}
                    onChange={(e) => setFormData({...formData, deuda_original: parseFloat(e.target.value) || 0})}
                    required
                    className="bg-blue-50 font-bold"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Cantidad a Condonar (€)</label>
                  <Input 
                    type="number"
                    step="0.01"
                    min="0"
                    max={formData.deuda_original}
                    value={formData.deuda_condonada}
                    onChange={(e) => setFormData({...formData, deuda_condonada: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>

              {formData.deuda_condonada > 0 && (
                <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-3">
                  <p className="text-sm text-orange-800">
                    💝 <strong>Deuda Final:</strong> {deudaFinal.toFixed(2)}€
                    (Condonado: {formData.deuda_condonada.toFixed(2)}€)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Planes Rápidos */}
          <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-green-600" />
                <h3 className="font-bold text-green-900">⚡ Planes Rápidos</h3>
              </div>
              <p className="text-xs text-slate-600">Selecciona un plan pre-configurado</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[3, 6, 9, 12].map(meses => {
                  const cuotaMensual = (deudaFinal / meses).toFixed(2);
                  return (
                    <Button
                      key={meses}
                      type="button"
                      onClick={() => handleQuickPlan(meses)}
                      variant="outline"
                      className="flex-col h-auto py-3 hover:bg-green-100 hover:border-green-400"
                      disabled={formData.deuda_original <= 0}
                    >
                      <span className="text-2xl font-bold text-green-700">{meses}</span>
                      <span className="text-xs text-slate-600">cuotas de</span>
                      <span className="text-sm font-bold text-slate-900">{cuotaMensual}€</span>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Cuotas */}
          <Card className="border-2 border-blue-200">
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-blue-900">💰 Cuotas Generadas</h3>
                {cuotas.length > 0 && (
                  <Badge className="bg-blue-100 text-blue-800">
                    {cuotas.length} cuotas programadas
                  </Badge>
                )}
              </div>

              {cuotas.length > 0 ? (
                <div className="space-y-2">
                  {cuotas.map((cuota, idx) => (
                    <div key={idx} className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-lg">
                      <div>
                        <label className="text-xs text-slate-600">Cuota {cuota.numero}</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={cuota.cantidad}
                          onChange={(e) => updateCuota(idx, 'cantidad', parseFloat(e.target.value) || 0)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-slate-600">Vencimiento</label>
                        <Input
                          type="date"
                          value={cuota.fecha_vencimiento}
                          onChange={(e) => updateCuota(idx, 'fecha_vencimiento', e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  ))}
                  
                  <div className="bg-green-50 border-2 border-green-300 rounded-lg p-3">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Total del Plan:</span>
                      <span className="font-bold text-green-700">{totalCuotas.toFixed(2)}€</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="font-medium">Debe ser:</span>
                      <span className={`font-bold ${Math.abs(totalCuotas - deudaFinal) < 0.01 ? 'text-green-700' : 'text-red-700'}`}>
                        {deudaFinal.toFixed(2)}€
                      </span>
                    </div>
                    {Math.abs(totalCuotas - deudaFinal) > 0.01 && (
                      <div className="flex items-center gap-2 mt-2 text-xs text-red-700">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Diferencia: {(totalCuotas - deudaFinal).toFixed(2)}€</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">
                  Genera las cuotas automáticamente o añade manualmente
                </p>
              )}
            </CardContent>
          </Card>

          {/* Motivo */}
          <Card className="border-2 border-blue-200">
            <CardContent className="pt-4 space-y-4">
              <h3 className="font-bold text-blue-900">📝 Motivo del Plan</h3>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Motivo Principal</label>
                <Select 
                  value={formData.motivo_plan} 
                  onValueChange={(value) => setFormData({...formData, motivo_plan: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dificultad Económica">Dificultad Económica</SelectItem>
                    <SelectItem value="Pérdida Empleo">Pérdida Empleo</SelectItem>
                    <SelectItem value="Emergencia Familiar">Emergencia Familiar</SelectItem>
                    <SelectItem value="Familia Numerosa">Familia Numerosa</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Detalles del Motivo</label>
                <Textarea 
                  placeholder="Explica brevemente la situación..."
                  value={formData.motivo_detalle}
                  onChange={(e) => setFormData({...formData, motivo_detalle: e.target.value})}
                  className="min-h-[80px]"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Mensaje para la Familia</label>
                <Textarea 
                  placeholder="Mensaje que verá la familia en su panel..."
                  value={formData.mensaje_para_familia}
                  onChange={(e) => setFormData({...formData, mensaje_para_familia: e.target.value})}
                  className="min-h-[80px]"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Notas Internas (privadas)</label>
                <Textarea 
                  placeholder="Notas para el equipo administrativo..."
                  value={formData.notas_internas}
                  onChange={(e) => setFormData({...formData, notas_internas: e.target.value})}
                  className="min-h-[60px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <Button 
              type="submit" 
              disabled={isSubmitting || cuotas.length === 0 || Math.abs(totalCuotas - deudaFinal) > 0.01}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {isSubmitting ? "Guardando..." : existingPlan ? "Actualizar Plan" : "Crear Plan"}
            </Button>
            <Button type="button" onClick={onClose} variant="outline">
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

// NOTA: Este componente ahora es solo de VISUALIZACIÓN.
// La creación/edición se hace desde pages/Payments con CustomPaymentPlanForm.
export default function CustomPaymentPlanManager({ activeSeason }) {
  const queryClient = useQueryClient();

  const { data: plans = [] } = useQuery({
    queryKey: ['customPaymentPlans', activeSeason?.temporada],
    queryFn: async () => {
      const allPlans = await base44.entities.CustomPaymentPlan.list();
      return allPlans.filter(p => p.temporada === activeSeason?.temporada);
    },
    enabled: !!activeSeason,
  });

  const handleMarkCuotaPaid = async (plan, cuotaIndex) => {
    const updatedCuotas = [...plan.cuotas];
    updatedCuotas[cuotaIndex] = {
      ...updatedCuotas[cuotaIndex],
      pagada: true,
      fecha_pago: new Date().toISOString().split('T')[0],
    };

    const allPaid = updatedCuotas.every(c => c.pagada);
    await base44.entities.CustomPaymentPlan.update(plan.id, {
      cuotas: updatedCuotas,
      estado: allPaid ? "Completado" : "Activo"
    });

    // Sincronizar el Payment correspondiente
    try {
      const payments = await base44.entities.Payment.filter({
        plan_especial_id: plan.id,
        mes: `Cuota ${updatedCuotas[cuotaIndex].numero}`
      });
      if (payments[0]) {
        await base44.entities.Payment.update(payments[0].id, {
          estado: 'Pagado',
          fecha_pago: new Date().toISOString().split('T')[0],
        });
      }
    } catch (e) { console.log('Error sync Payment:', e); }

    queryClient.invalidateQueries(['customPaymentPlans']);
    queryClient.invalidateQueries(['myPayments']);
    toast.success("Cuota marcada como pagada");
  };

  const activePlans = plans.filter(p => p.estado === "Activo");
  const completedPlans = plans.filter(p => p.estado === "Completado");
  const totalCondonado = plans.reduce((sum, p) => sum + (p.deuda_condonada || 0), 0);
  const totalAyudas = plans.length;

  return (
    <div className="space-y-6">
      <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-6 h-6 text-purple-600" />
              Planes de Pago Personalizados
            </CardTitle>
            <Button onClick={() => setShowForm(true)} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Crear Plan
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 text-center">
              <p className="text-sm text-purple-600 font-medium">Planes Activos</p>
              <p className="text-3xl font-bold text-purple-700">{activePlans.length}</p>
            </div>
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 text-center">
              <p className="text-sm text-green-600 font-medium">Planes Completados</p>
              <p className="text-3xl font-bold text-green-700">{completedPlans.length}</p>
            </div>
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 text-center">
              <p className="text-sm text-orange-600 font-medium">Total Condonado</p>
              <p className="text-3xl font-bold text-orange-700">{totalCondonado.toFixed(2)}€</p>
            </div>
          </div>

          {activePlans.length === 0 ? (
            <div className="text-center py-8">
              <Heart className="w-12 h-12 text-purple-300 mx-auto mb-3" />
              <p className="text-slate-500">No hay planes de pago activos</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activePlans.map(plan => {
                const cuotasPagadas = plan.cuotas.filter(c => c.pagada).length;
                const progreso = (cuotasPagadas / plan.numero_cuotas) * 100;

                return (
                  <Card key={plan.id} className="border-2 border-purple-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-bold text-lg text-slate-900">{plan.jugador_nombre}</h4>
                          <p className="text-sm text-slate-600">{plan.familia_email}</p>
                          <Badge className="mt-1 bg-purple-100 text-purple-800">{plan.motivo_plan}</Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-600">Progreso</p>
                          <p className="text-2xl font-bold text-purple-700">{cuotasPagadas}/{plan.numero_cuotas}</p>
                        </div>
                      </div>

                      {plan.deuda_condonada > 0 && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                          <p className="text-sm text-orange-800">
                            💝 Condonación aplicada: <strong>{plan.deuda_condonada.toFixed(2)}€</strong>
                          </p>
                          <p className="text-xs text-orange-600">
                            Original: {plan.deuda_original.toFixed(2)}€ → Final: {plan.deuda_final.toFixed(2)}€
                          </p>
                        </div>
                      )}

                      <div className="space-y-2">
                        {plan.cuotas.map((cuota, idx) => (
                          <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border ${
                            cuota.pagada ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'
                          }`}>
                            <div className="flex items-center gap-3">
                              {cuota.pagada ? (
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                              ) : (
                                <AlertCircle className="w-5 h-5 text-orange-500" />
                              )}
                              <div>
                                <p className="font-medium text-slate-900">Cuota {cuota.numero}</p>
                                <p className="text-xs text-slate-500">
                                  Vence: {format(new Date(cuota.fecha_vencimiento), 'dd/MM/yyyy')}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <p className="font-bold text-slate-900">{cuota.cantidad.toFixed(2)}€</p>
                              {!cuota.pagada && (
                                <Button 
                                  size="sm"
                                  onClick={() => handleMarkCuotaPaid(plan, idx, null)}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  Marcar Pagada
                                </Button>
                              )}
                              {cuota.pagada && cuota.justificante_url && (
                                <Button 
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => window.open(cuota.justificante_url, '_blank')}
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 bg-slate-50 rounded-lg p-2">
                        <div className="flex items-center gap-2 text-xs text-slate-600 mb-1">
                          <span>Progreso del plan</span>
                          <span className="ml-auto font-bold">{progreso.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div 
                            className="h-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full transition-all"
                            style={{ width: `${progreso}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog crear plan */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>💝 Crear Plan de Pago Personalizado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Seleccionar Jugador</label>
              <Select 
                value={selectedPlayer?.id} 
                onValueChange={(id) => setSelectedPlayer(allPlayers.find(p => p.id === id))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Elige un jugador" />
                </SelectTrigger>
                <SelectContent>
                  {allPlayers.filter(p => p.activo).map(player => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.nombre} - {player.deporte}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Deuda Original (€)</label>
                <Input 
                  type="number"
                  value={formData.deuda_original}
                  onChange={(e) => setFormData({...formData, deuda_original: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Cantidad a Condonar (€)</label>
                <Input 
                  type="number"
                  value={formData.deuda_condonada}
                  onChange={(e) => setFormData({...formData, deuda_condonada: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>

            {formData.deuda_condonada > 0 && (
              <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-3">
                <p className="text-sm text-orange-800">
                  💝 <strong>Deuda Final:</strong> {(formData.deuda_original - formData.deuda_condonada).toFixed(2)}€
                  (Condonado: {formData.deuda_condonada.toFixed(2)}€)
                </p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">Número de Cuotas Mensuales</label>
              <Input 
                type="number"
                min="1"
                max="12"
                value={formData.numero_cuotas}
                onChange={(e) => setFormData({...formData, numero_cuotas: parseInt(e.target.value) || 1})}
              />
              <p className="text-xs text-slate-500 mt-1">
                Cuota mensual: {((formData.deuda_original - formData.deuda_condonada) / formData.numero_cuotas).toFixed(2)}€
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Motivo del Plan</label>
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
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Notas Internas (privadas)</label>
              <Textarea 
                placeholder="Notas para el equipo administrativo..."
                value={formData.notas_internas}
                onChange={(e) => setFormData({...formData, notas_internas: e.target.value})}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleCreatePlan} className="flex-1 bg-purple-600 hover:bg-purple-700">
                Crear Plan de Pago
              </Button>
              <Button onClick={() => setShowForm(false)} variant="outline">
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
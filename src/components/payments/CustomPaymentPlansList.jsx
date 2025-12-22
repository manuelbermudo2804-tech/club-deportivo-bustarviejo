import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Pencil, Trash2, Calendar, Euro } from "lucide-react";
import { format } from "date-fns";

export default function CustomPaymentPlansList({ plans, players, onEdit, onDelete }) {
  if (!plans || plans.length === 0) {
    return (
      <Card className="border-2 border-purple-200 bg-purple-50">
        <CardContent className="py-12 text-center">
          <p className="text-slate-500">No hay planes de pago personalizados activos</p>
        </CardContent>
      </Card>
    );
  }

  const activePlans = plans.filter(p => p.estado === "Activo");
  const completedPlans = plans.filter(p => p.estado === "Completado");

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-2 border-purple-200 bg-purple-50">
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-purple-600 font-medium">Planes Activos</p>
            <p className="text-3xl font-bold text-purple-700">{activePlans.length}</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-green-200 bg-green-50">
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-green-600 font-medium">Completados</p>
            <p className="text-3xl font-bold text-green-700">{completedPlans.length}</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-orange-200 bg-orange-50">
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-orange-600 font-medium">Total Condonado</p>
            <p className="text-3xl font-bold text-orange-700">
              {plans.reduce((sum, p) => sum + (p.deuda_condonada || 0), 0).toFixed(2)}€
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Planes Activos */}
      {activePlans.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-bold text-lg text-slate-900">Planes Activos</h3>
          {activePlans.map(plan => {
            const cuotasPagadas = plan.cuotas?.filter(c => c.pagada)?.length || 0;
            const progreso = ((cuotasPagadas / plan.numero_cuotas) * 100) || 0;
            const player = players.find(p => p.id === plan.jugador_id);

            return (
              <Card key={plan.id} className="border-2 border-purple-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {player?.foto_url ? (
                        <img src={player.foto_url} className="w-12 h-12 rounded-full object-cover" alt="" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">
                          {plan.jugador_nombre?.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-lg text-slate-900">{plan.jugador_nombre}</h4>
                        <p className="text-sm text-slate-600">{plan.familia_email}</p>
                        <Badge className="mt-1 bg-purple-100 text-purple-800 text-xs">{plan.motivo_plan}</Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-600">Progreso</p>
                      <p className="text-3xl font-bold text-purple-700">{cuotasPagadas}/{plan.numero_cuotas}</p>
                      <p className="text-xs text-slate-500">{progreso.toFixed(0)}%</p>
                    </div>
                  </div>

                  {/* Deuda info */}
                  {plan.deuda_condonada > 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                      <p className="text-sm text-orange-800">
                        💝 Condonación: <strong>{plan.deuda_condonada.toFixed(2)}€</strong>
                      </p>
                      <p className="text-xs text-orange-600">
                        Original: {plan.deuda_original?.toFixed(2)}€ → Final: {plan.deuda_final?.toFixed(2)}€
                      </p>
                    </div>
                  )}

                  {/* Mensaje para familia */}
                  {plan.mensaje_para_familia && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                      <p className="text-xs text-blue-600 font-medium mb-1">📨 Mensaje para la familia:</p>
                      <p className="text-sm text-blue-900">{plan.mensaje_para_familia}</p>
                    </div>
                  )}

                  {/* Cuotas */}
                  <div className="space-y-2">
                    {plan.cuotas?.map((cuota, idx) => (
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
                              Vence: {cuota.fecha_vencimiento ? format(new Date(cuota.fecha_vencimiento), 'dd/MM/yyyy') : '-'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="font-bold text-slate-900">{cuota.cantidad?.toFixed(2)}€</p>
                          {cuota.pagada && <Badge className="bg-green-100 text-green-700 text-xs">Pagada</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4 bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
                      <span>Progreso del plan</span>
                      <span className="font-bold">{progreso.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3">
                      <div 
                        className="h-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full transition-all"
                        style={{ width: `${progreso}%` }}
                      />
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(plan)}
                      className="flex-1"
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDelete(plan.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Desactivar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Planes Completados */}
      {completedPlans.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-bold text-lg text-slate-900">Planes Completados</h3>
          {completedPlans.map(plan => {
            const player = players.find(p => p.id === plan.jugador_id);

            return (
              <Card key={plan.id} className="border-2 border-green-200 bg-green-50/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {player?.foto_url ? (
                        <img src={player.foto_url} className="w-10 h-10 rounded-full object-cover" alt="" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
                          {plan.jugador_nombre?.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-slate-900">{plan.jugador_nombre}</h4>
                        <p className="text-xs text-slate-600">{plan.numero_cuotas} cuotas completadas</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-green-600 text-white">✅ Completado</Badge>
                      <p className="text-sm font-bold text-green-700 mt-1">{plan.deuda_final?.toFixed(2)}€</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
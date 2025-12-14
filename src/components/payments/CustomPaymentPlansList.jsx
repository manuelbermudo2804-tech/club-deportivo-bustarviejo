import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Trash2, Eye, Calendar, Euro, FileText, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function PlanDetailDialog({ open, onClose, plan }) {
  if (!plan) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>📋 Detalle del Plan - {plan.jugador_nombre}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-600">Motivo</p>
              <p className="font-medium">{plan.motivo}</p>
            </div>
            <div>
              <p className="text-xs text-slate-600">Temporada</p>
              <p className="font-medium">{plan.temporada}</p>
            </div>
            <div>
              <p className="text-xs text-slate-600">Aprobado por</p>
              <p className="font-medium">{plan.aprobado_por_nombre || plan.aprobado_por}</p>
            </div>
            <div>
              <p className="text-xs text-slate-600">Fecha aprobación</p>
              <p className="font-medium">
                {plan.fecha_aprobacion 
                  ? format(new Date(plan.fecha_aprobacion), "dd/MM/yyyy", { locale: es })
                  : "-"}
              </p>
            </div>
          </div>

          {plan.mensaje_para_familia && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-900 font-medium mb-1">💬 Mensaje para la familia:</p>
              <p className="text-sm text-blue-800">{plan.mensaje_para_familia}</p>
            </div>
          )}

          {plan.notas_internas && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-xs text-orange-900 font-medium mb-1">🔒 Notas internas:</p>
              <p className="text-sm text-orange-800">{plan.notas_internas}</p>
            </div>
          )}

          <div>
            <p className="text-sm font-medium mb-2">📅 Calendario de cuotas:</p>
            <div className="space-y-2">
              {plan.cuotas_personalizadas?.map((cuota, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50 p-2 rounded">
                  <span className="font-medium">{cuota.mes}</span>
                  <span className="text-lg font-bold text-green-700">{cuota.cantidad}€</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t flex items-center justify-between">
              <span className="font-bold">TOTAL</span>
              <span className="text-2xl font-bold text-orange-600">{plan.total_plan}€</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function CustomPaymentPlansList({ 
  plans, 
  players, 
  onEdit, 
  onDelete, 
  onViewDetails 
}) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const activePlans = plans.filter(p => p.activo);
  const inactivePlans = plans.filter(p => !p.activo);

  const handleViewDetails = (plan) => {
    setSelectedPlan(plan);
    setShowDetailDialog(true);
  };

  return (
    <>
      <PlanDetailDialog 
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        plan={selectedPlan}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Euro className="w-5 h-5 text-orange-600" />
            Planes de Pago Personalizados ({activePlans.length} activos)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activePlans.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>No hay planes personalizados activos</p>
              <p className="text-xs mt-2">Crea planes desde la ficha del jugador</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jugador</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Cuotas</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Temporada</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activePlans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">{plan.jugador_nombre}</TableCell>
                      <TableCell>
                        <p className="text-sm truncate max-w-xs">{plan.motivo}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {plan.cuotas_personalizadas?.length || 0} cuotas
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold text-green-700">
                        {plan.total_plan}€
                      </TableCell>
                      <TableCell>{plan.temporada}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewDetails(plan)}
                            title="Ver detalles"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onEdit(plan)}
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onDelete(plan.id)}
                            className="text-red-600 hover:text-red-700"
                            title="Desactivar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {inactivePlans.length > 0 && (
                <details className="mt-4">
                  <summary className="text-sm text-slate-600 cursor-pointer hover:text-slate-900">
                    Ver planes desactivados ({inactivePlans.length})
                  </summary>
                  <div className="mt-2 opacity-50">
                    <Table>
                      <TableBody>
                        {inactivePlans.map((plan) => (
                          <TableRow key={plan.id}>
                            <TableCell>{plan.jugador_nombre}</TableCell>
                            <TableCell>{plan.motivo}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">Desactivado</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </details>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
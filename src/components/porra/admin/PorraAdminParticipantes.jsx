import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PorraAdminParticipantes({ participantes = [], config }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>👥 Participantes</CardTitle>
        <p className="text-sm text-slate-500">{participantes.length} registros · {participantes.filter(p => p.estado_pago === 'pagado').length} con pago confirmado</p>
      </CardHeader>
      <CardContent>
        {participantes.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <p className="text-lg">Aún no hay participantes</p>
            <p className="text-sm">Cuando la porra esté activa, aquí verás los registros</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="text-left p-2">Nombre</th>
                  <th className="text-left p-2">Alias</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Estado</th>
                  <th className="text-right p-2">Pagado</th>
                  <th className="text-right p-2">Puntos</th>
                </tr>
              </thead>
              <tbody>
                {participantes.map(p => (
                  <tr key={p.id} className="border-b hover:bg-slate-50">
                    <td className="p-2 font-medium">{p.nombre}</td>
                    <td className="p-2">{p.alias_equipo}</td>
                    <td className="p-2 text-slate-600">{p.email}</td>
                    <td className="p-2">
                      <Badge variant={p.estado_pago === 'pagado' ? 'default' : 'outline'} className={
                        p.estado_pago === 'pagado' ? 'bg-green-600' : ''
                      }>
                        {p.estado_pago}
                      </Badge>
                    </td>
                    <td className="p-2 text-right">{p.cantidad_pagada ? `${p.cantidad_pagada}€` : '-'}</td>
                    <td className="p-2 text-right font-bold">{p.puntos_total || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
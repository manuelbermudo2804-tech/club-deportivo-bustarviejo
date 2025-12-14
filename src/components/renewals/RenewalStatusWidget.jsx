import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, CreditCard, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Progress } from "@/components/ui/progress";

export default function RenewalStatusWidget({ players, payments, seasonConfig }) {
  // NO MOSTRAR NADA si permitir_renovaciones está desactivado
  if (!seasonConfig?.permitir_renovaciones) {
    return null;
  }

  const pendientesRenovar = players.filter(p => 
    p.estado_renovacion === "pendiente" && 
    p.temporada_renovacion === seasonConfig?.temporada
  );

  const renovados = players.filter(p => 
    p.estado_renovacion === "renovado" && 
    p.temporada_renovacion === seasonConfig?.temporada
  );

  const noRenuevan = players.filter(p => 
    p.estado_renovacion === "no_renueva" && 
    p.temporada_renovacion === seasonConfig?.temporada
  );

  // Solo cuotas SIN justificante (Pendiente) - "En revisión" ya no es tu responsabilidad
  const cuotasPendientes = payments.filter(p => 
    p.temporada === seasonConfig?.temporada &&
    p.estado === "Pendiente" &&
    renovados.some(player => player.id === p.jugador_id)
  );

  const totalJugadores = players.length;
  const progresoRenovacion = totalJugadores > 0 
    ? Math.round((renovados.length / totalJugadores) * 100) 
    : 0;

  // Si todo está completo, mostrar versión compacta
  if (pendientesRenovar.length === 0 && cuotasPendientes.length === 0) {
    return (
      <Card className="border-2 border-green-300 bg-gradient-to-r from-green-50 to-emerald-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
            <div>
              <p className="font-bold text-green-900">✅ Renovaciones Completas</p>
              <p className="text-sm text-green-700">
                Jugadores renovados y justificantes subidos. En espera de aprobación del club.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-orange-400 bg-gradient-to-r from-orange-50 to-yellow-50 shadow-lg">
      <CardContent className="pt-6 space-y-4">
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-orange-600" />
            <h3 className="font-bold text-orange-900 text-lg">Estado de Renovaciones</h3>
          </div>
          <Badge className="bg-orange-600 text-white">
            Temporada {seasonConfig?.temporada}
          </Badge>
        </div>

        {/* Progreso */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-700">Progreso de renovación</span>
            <span className="text-2xl font-bold text-green-600">{progresoRenovacion}%</span>
          </div>
          <Progress value={progresoRenovacion} className="h-3" />
          <div className="flex justify-between text-xs mt-1">
            <span className="text-green-600">✅ {renovados.length} renovados</span>
            <span className="text-orange-600">⏳ {pendientesRenovar.length} pendientes</span>
          </div>
        </div>

        {/* Alerta de pendientes de renovar */}
        {pendientesRenovar.length > 0 && (
          <div className="bg-red-50 border-2 border-red-400 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse" />
              <p className="font-bold text-red-900">
                ⚠️ {pendientesRenovar.length} jugador(es) pendiente(s) de renovar
              </p>
            </div>
            <div className="space-y-1">
              {pendientesRenovar.map(p => (
                <div key={p.id} className="bg-white rounded px-3 py-2 text-sm border border-red-200">
                  <p className="font-semibold text-slate-900">{p.nombre}</p>
                  <p className="text-xs text-slate-600">{p.deporte}</p>
                </div>
              ))}
            </div>
            <Link to={createPageUrl("ParentPlayers")} className="block">
              <Button className="w-full bg-red-600 hover:bg-red-700 font-bold">
                🔄 Renovar Ahora
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        )}

        {/* Cuotas pendientes de pago */}
        {renovados.length > 0 && cuotasPendientes.length > 0 && (
          <div className="bg-orange-50 border-2 border-orange-400 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-orange-600" />
              <p className="font-bold text-orange-900">
                💳 {cuotasPendientes.length} cuota(s) pendiente(s) de pago
              </p>
            </div>
            <p className="text-sm text-orange-800">
              Has renovado a tus jugadores, pero tienes cuotas pendientes de registrar
            </p>
            <div className="space-y-1">
              {cuotasPendientes.slice(0, 3).map(p => (
                <div key={p.id} className="bg-white rounded px-3 py-2 text-sm border border-orange-200 flex justify-between">
                  <span className="text-slate-900">{p.jugador_nombre} - {p.mes}</span>
                  <span className="font-bold text-orange-700">{p.cantidad}€</span>
                </div>
              ))}
              {cuotasPendientes.length > 3 && (
                <p className="text-xs text-orange-600 text-center">
                  Y {cuotasPendientes.length - 3} cuota(s) más...
                </p>
              )}
            </div>
            <Link to={createPageUrl("ParentPayments")} className="block">
              <Button className="w-full bg-orange-600 hover:bg-orange-700 font-bold">
                <CreditCard className="w-4 h-4 mr-2" />
                Registrar Pagos
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        )}

        {/* Fecha límite si existe */}
        {seasonConfig?.fecha_limite_renovaciones && pendientesRenovar.length > 0 && (
          <div className="bg-slate-100 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-600">
              ⏰ Fecha límite: <strong className="text-orange-700">
                {new Date(seasonConfig.fecha_limite_renovaciones).toLocaleDateString('es-ES', { 
                  day: 'numeric', 
                  month: 'long' 
                })}
              </strong>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Euro, TrendingUp, Users, AlertCircle } from "lucide-react";

export default function TreasurerDashboard() {
  const [user, setUser] = useState(null);

  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ['allPayments'],
    queryFn: () => base44.entities.Payment.list('-created_date'),
    initialData: [],
  });

  const { data: players = [], isLoading: loadingPlayers } = useQuery({
    queryKey: ['allPlayers'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
  });

  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const isLoading = loadingPayments || loadingPlayers || !user;

  // Calcular estadísticas básicas
  const totalPagado = payments
    .filter(p => p.estado === "Pagado")
    .reduce((sum, p) => sum + (p.cantidad || 0), 0);

  const totalPendiente = payments
    .filter(p => p.estado === "Pendiente")
    .reduce((sum, p) => sum + (p.cantidad || 0), 0);

  const totalEnRevision = payments
    .filter(p => p.estado === "En revisión")
    .reduce((sum, p) => sum + (p.cantidad || 0), 0);

  const jugadoresActivos = players.filter(p => p.activo === true).length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">💰 Panel Financiero</h1>
        <p className="text-slate-600 mt-1">Vista general de pagos y finanzas del club</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-green-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-900 flex items-center gap-2">
                <Euro className="w-4 h-4" />
                Total Pagado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-700">{totalPagado.toFixed(2)}€</p>
              <p className="text-xs text-green-600 mt-1">{payments.filter(p => p.estado === "Pagado").length} pagos</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-red-50 to-red-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Total Pendiente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-700">{totalPendiente.toFixed(2)}€</p>
              <p className="text-xs text-red-600 mt-1">{payments.filter(p => p.estado === "Pendiente").length} pagos</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-orange-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                En Revisión
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-700">{totalEnRevision.toFixed(2)}€</p>
              <p className="text-xs text-orange-600 mt-1">{payments.filter(p => p.estado === "En revisión").length} pagos</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-900 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Jugadores Activos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-700">{jugadoresActivos}</p>
              <p className="text-xs text-blue-600 mt-1">actualmente inscritos</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>Información</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600">
            Desde este panel puedes gestionar todos los pagos del club. Utiliza el menú lateral para acceder a:
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            <li>💳 <strong>Pagos:</strong> Ver y gestionar todos los pagos</li>
            <li>🔔 <strong>Recordatorios:</strong> Enviar avisos de pago</li>
            <li>📁 <strong>Histórico:</strong> Consultar pagos anteriores</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Euro, Users, AlertTriangle, Building2 } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";

const COLORS = {
  "Principal": "#f59e0b",
  "Oro": "#eab308",
  "Plata": "#94a3b8",
  "Bronce": "#ea580c",
  "Colaborador": "#3b82f6"
};

export default function SponsorDashboard({ sponsors }) {
  const activeSponsors = sponsors.filter(s => s.activo === true);
  const inactiveSponsors = sponsors.filter(s => s.activo === false);

  const totalActiveIncome = activeSponsors.reduce((sum, s) => sum + (s.precio_anual || 0), 0);

  const expiringSponsors = activeSponsors.filter(s => {
    if (!s.fecha_fin) return false;
    const daysUntilExpiry = differenceInDays(new Date(s.fecha_fin), new Date());
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
  });

  return (
    <div className="space-y-6">
      {/* KPIs simples */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-600 rounded-xl">
                <Euro className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-green-700 font-medium">Ingresos Anuales</p>
                <p className="text-2xl font-bold text-green-800">
                  {totalActiveIncome.toLocaleString('es-ES')}€
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-amber-50 to-amber-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-600 rounded-xl">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-amber-700 font-medium">Activos en Banner</p>
                <p className="text-2xl font-bold text-amber-800">{activeSponsors.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-slate-50 to-slate-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-600 rounded-xl">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-700 font-medium">Inactivos</p>
                <p className="text-2xl font-bold text-slate-800">{inactiveSponsors.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-none shadow-lg ${expiringSponsors.length > 0 ? 'bg-gradient-to-br from-red-50 to-red-100' : 'bg-gradient-to-br from-slate-50 to-slate-100'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${expiringSponsors.length > 0 ? 'bg-red-600' : 'bg-slate-600'}`}>
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className={`text-xs font-medium ${expiringSponsors.length > 0 ? 'text-red-700' : 'text-slate-700'}`}>
                  Próximos a Vencer
                </p>
                <p className={`text-2xl font-bold ${expiringSponsors.length > 0 ? 'text-red-800' : 'text-slate-800'}`}>
                  {expiringSponsors.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Próximos a vencer */}
      {expiringSponsors.length > 0 && (
        <Card className="border-none shadow-lg border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <h3 className="text-lg font-bold text-red-700 mb-3">⚠️ Próximos a Vencer</h3>
            <div className="space-y-2">
              {expiringSponsors.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {s.logo_url ? (
                      <img src={s.logo_url} alt={s.nombre} className="w-10 h-10 object-contain rounded" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-red-200 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-red-600" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-slate-900">{s.nombre}</p>
                      <p className="text-xs text-slate-600">{s.nivel_patrocinio} • {s.precio_anual?.toLocaleString('es-ES')}€/año</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-red-500 text-white">
                      {format(new Date(s.fecha_fin), "d MMM yyyy", { locale: es })}
                    </Badge>
                    <p className="text-xs text-red-600 mt-1">
                      {differenceInDays(new Date(s.fecha_fin), new Date())} días
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
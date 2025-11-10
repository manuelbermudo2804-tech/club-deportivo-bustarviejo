import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, AlertCircle, TrendingUp } from "lucide-react";

export default function PaymentStats({ payments }) {
  const totalPaid = payments
    .filter(p => p.estado === "Pagado")
    .reduce((sum, p) => sum + (p.cantidad || 0), 0);

  const totalPending = payments
    .filter(p => p.estado === "Pendiente")
    .reduce((sum, p) => sum + (p.cantidad || 0), 0);

  const totalOverdue = payments
    .filter(p => p.estado === "Atrasado")
    .reduce((sum, p) => sum + (p.cantidad || 0), 0);

  const stats = [
    {
      title: "Total Cobrado",
      value: `${totalPaid.toFixed(2)}€`,
      icon: CheckCircle2,
      color: "emerald"
    },
    {
      title: "Pendiente de Cobro",
      value: `${totalPending.toFixed(2)}€`,
      icon: Clock,
      color: "orange"
    },
    {
      title: "Pagos Atrasados",
      value: `${totalOverdue.toFixed(2)}€`,
      icon: AlertCircle,
      color: "red"
    },
    {
      title: "Total Registrado",
      value: `${(totalPaid + totalPending + totalOverdue).toFixed(2)}€`,
      icon: TrendingUp,
      color: "blue"
    }
  ];

  const colorClasses = {
    emerald: "bg-emerald-500 text-emerald-500",
    orange: "bg-orange-500 text-orange-500",
    red: "bg-red-500 text-red-500",
    blue: "bg-blue-500 text-blue-500"
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <Card key={index} className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-xl ${colorClasses[stat.color].split(' ')[0]} bg-opacity-10`}>
                <stat.icon className={`w-5 h-5 ${colorClasses[stat.color].split(' ')[1]}`} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {stat.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
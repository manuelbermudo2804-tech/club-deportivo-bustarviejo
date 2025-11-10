import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, AlertTriangle, TrendingUp } from "lucide-react";

export default function PaymentStats({ payments }) {
  const totalPaid = payments
    .filter(p => p.estado === "Pagado")
    .reduce((sum, p) => sum + (p.cantidad || 0), 0);

  const totalPending = payments
    .filter(p => p.estado === "Pendiente")
    .reduce((sum, p) => sum + (p.cantidad || 0), 0);

  const totalInReview = payments
    .filter(p => p.estado === "En revisión")
    .reduce((sum, p) => sum + (p.cantidad || 0), 0);

  const stats = [
    {
      title: "Total Cobrado",
      value: `${totalPaid.toFixed(2)}€`,
      icon: CheckCircle2,
      color: "orange"
    },
    {
      title: "Pendiente de Cobro",
      value: `${totalPending.toFixed(2)}€`,
      icon: Clock,
      color: "amber"
    },
    {
      title: "En Revisión",
      value: `${totalInReview.toFixed(2)}€`,
      icon: AlertTriangle,
      color: "blue"
    },
    {
      title: "Total Registrado",
      value: `${(totalPaid + totalPending + totalInReview).toFixed(2)}€`,
      icon: TrendingUp,
      color: "slate"
    }
  ];

  const colorClasses = {
    orange: "bg-orange-500 text-orange-500",
    amber: "bg-amber-500 text-amber-500",
    blue: "bg-blue-500 text-blue-500",
    slate: "bg-slate-800 text-slate-800"
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
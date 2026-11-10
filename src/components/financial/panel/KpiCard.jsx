import React from "react";
import { Card, CardContent } from "@/components/ui/card";

const TONES = {
  blue: "from-slate-800 to-slate-900",
  green: "from-green-600 to-emerald-700",
  orange: "from-orange-500 to-red-600",
  red: "from-rose-700 to-red-900",
};

export default function KpiCard({ icon: Icon, label, value, detail, tone = "blue" }) {
  return (
    <Card className={`border-none bg-gradient-to-br ${TONES[tone]} text-white shadow-lg`}>
      <CardContent className="p-5 sm:p-6">
        <div className="mb-3 flex items-center gap-2 text-sm text-white/80">
          <Icon className="h-5 w-5" />
          <span>{label}</span>
        </div>
        <p className="text-3xl font-bold tracking-tight sm:text-4xl">{value}</p>
        {detail && <p className="mt-2 text-xs text-white/75">{detail}</p>}
      </CardContent>
    </Card>
  );
}
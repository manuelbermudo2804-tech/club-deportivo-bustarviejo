import React from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function TreasurerDashboard() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-slate-900 mb-4">💰 Panel Financiero</h1>
      <Card>
        <CardContent className="p-8">
          <p className="text-lg text-slate-600">Panel cargando correctamente</p>
        </CardContent>
      </Card>
    </div>
  );
}
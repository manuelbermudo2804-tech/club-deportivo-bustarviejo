import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, ExternalLink, Plus } from "lucide-react";
import SubTabs from "./SubTabs";
import BankAccountManager from "@/components/financial/BankAccountManager.jsx";
import TransactionList from "@/components/financial/TransactionList";
import StripeCotejoPanel from "@/components/financial/stripe/StripeCotejoPanel";

const OPTIONS = [
  { value: "banco", label: "Banco y extractos" },
  { value: "movimientos", label: "Todos los movimientos" },
  { value: "stripe", label: "Cobros con tarjeta (Stripe)" },
];

export default function MovimientosTab({ initialView = "banco", activeSeason, transactions, onAdd, onDelete, onExport }) {
  const [view, setView] = useState(initialView);
  return (
    <div className="space-y-5">
      <SubTabs options={OPTIONS} value={view} onChange={setView} />

      {view === "banco" && (
        <div className="space-y-5">
          <Card className="border-0 bg-gradient-to-r from-red-700 to-rose-600 text-white">
            <CardContent className="flex flex-col items-start justify-between gap-3 p-5 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <Building2 className="h-6 w-6 shrink-0" />
                <p className="text-sm">Descarga el extracto en la banca online del Santander y súbelo aquí abajo para cuadrarlo.</p>
              </div>
              <Button asChild className="shrink-0 bg-white font-semibold text-red-700 hover:bg-red-50">
                <a href="https://empresas3.gruposantander.es/paas/loginnwe/" target="_blank" rel="noopener noreferrer">
                  Abrir Santander <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
          <BankAccountManager activeSeason={activeSeason} />
        </div>
      )}

      {view === "movimientos" && (
        <Card>
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <p className="text-sm text-slate-600">Ingresos y gastos de la temporada. Lo que llega del banco aparece aquí solo; no lo vuelvas a añadir a mano.</p>
              <Button onClick={onAdd} className="shrink-0 bg-orange-600 hover:bg-orange-700">
                <Plus className="mr-2 h-4 w-4" /> Añadir movimiento
              </Button>
            </div>
            <TransactionList transactions={transactions} onDelete={onDelete} onExport={onExport} />
          </CardContent>
        </Card>
      )}

      {view === "stripe" && <StripeCotejoPanel />}
    </div>
  );
}
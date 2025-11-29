import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Plus, 
  Wallet, 
  Receipt, 
  PieChart, 
  FileText,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

import BudgetManager from "../components/financial/BudgetManager";
import TransactionForm from "../components/financial/TransactionForm";
import TransactionList from "../components/financial/TransactionList";

export default function BudgetManagement() {
  const [showNewBudget, setShowNewBudget] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [newBudgetData, setNewBudgetData] = useState({
    temporada: "2024/2025",
    nombre: "Presupuesto Principal"
  });
  const queryClient = useQueryClient();

  const getCurrentSeason = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
  };

  const currentSeason = getCurrentSeason();

  const { data: budgets = [], isLoading: loadingBudgets } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => base44.entities.Budget.list('-created_date'),
  });

  const { data: transactions = [], isLoading: loadingTransactions } = useQuery({
    queryKey: ['financialTransactions'],
    queryFn: () => base44.entities.FinancialTransaction.list('-fecha'),
  });

  const activeBudget = budgets.find(b => b.activo && b.temporada === currentSeason) || budgets[0];

  const createBudgetMutation = useMutation({
    mutationFn: (data) => base44.entities.Budget.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      setShowNewBudget(false);
      toast.success("Presupuesto creado");
    },
  });

  const updateBudgetMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Budget.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (data) => {
      const transaction = await base44.entities.FinancialTransaction.create(data);
      
      if (data.partida_id && activeBudget) {
        const updatedPartidas = activeBudget.partidas.map(p => {
          if (p.id === data.partida_id) {
            return {
              ...p,
              ejecutado: (p.ejecutado || 0) + data.cantidad
            };
          }
          return p;
        });
        await base44.entities.Budget.update(activeBudget.id, { partidas: updatedPartidas });
      }
      
      return transaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financialTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      setShowTransactionForm(false);
      toast.success("Movimiento registrado");
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (id) => {
      const transaction = transactions.find(t => t.id === id);
      await base44.entities.FinancialTransaction.delete(id);
      
      if (transaction?.partida_id && activeBudget) {
        const updatedPartidas = activeBudget.partidas.map(p => {
          if (p.id === transaction.partida_id) {
            return {
              ...p,
              ejecutado: Math.max(0, (p.ejecutado || 0) - transaction.cantidad)
            };
          }
          return p;
        });
        await base44.entities.Budget.update(activeBudget.id, { partidas: updatedPartidas });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financialTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success("Movimiento eliminado");
    },
  });

  const handleCreateBudget = () => {
    createBudgetMutation.mutate({
      ...newBudgetData,
      partidas: [],
      activo: true
    });
  };

  const handleUpdateBudget = (updates) => {
    if (activeBudget) {
      updateBudgetMutation.mutate({
        id: activeBudget.id,
        data: { ...activeBudget, ...updates }
      });
    }
  };

  const handleExportTransactions = () => {
    const csvContent = [
      ["Fecha", "Tipo", "Concepto", "Categoría", "Proveedor/Cliente", "Importe", "Estado", "Nº Factura"].join(","),
      ...transactions.map(t => [
        t.fecha,
        t.tipo,
        `"${t.concepto}"`,
        t.categoria,
        `"${t.proveedor_cliente || ''}"`,
        t.cantidad,
        t.estado,
        t.numero_factura || ''
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `movimientos_${currentSeason.replace("/", "-")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Exportación completada");
  };

  if (loadingBudgets || loadingTransactions) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Wallet className="h-8 w-8 text-orange-600" />
            Gestión de Presupuestos
          </h1>
          <p className="text-slate-600 mt-1">Temporada {currentSeason}</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowTransactionForm(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Receipt className="h-4 w-4 mr-2" />
            Nuevo Movimiento
          </Button>
          {!activeBudget && (
            <Button 
              onClick={() => setShowNewBudget(true)}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear Presupuesto
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="presupuesto" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="presupuesto" className="gap-2">
            <PieChart className="h-4 w-4" />
            Presupuesto
          </TabsTrigger>
          <TabsTrigger value="movimientos" className="gap-2">
            <Receipt className="h-4 w-4" />
            Movimientos
          </TabsTrigger>
          <TabsTrigger value="documentos" className="gap-2">
            <FileText className="h-4 w-4" />
            Documentos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="presupuesto">
          {activeBudget ? (
            <BudgetManager
              budget={activeBudget}
              onUpdate={handleUpdateBudget}
            />
          ) : (
            <Card className="border-dashed border-2">
              <CardContent className="p-12 text-center">
                <Wallet className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  No hay presupuesto para esta temporada
                </h3>
                <p className="text-slate-600 mb-4">
                  Crea un presupuesto para empezar a gestionar tus finanzas
                </p>
                <Button 
                  onClick={() => setShowNewBudget(true)}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Presupuesto
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="movimientos">
          {showTransactionForm ? (
            <TransactionForm
              partidas={activeBudget?.partidas || []}
              temporada={currentSeason}
              onSubmit={(data) => createTransactionMutation.mutate(data)}
              onCancel={() => setShowTransactionForm(false)}
              isSubmitting={createTransactionMutation.isPending}
            />
          ) : (
            <TransactionList
              transactions={transactions.filter(t => t.temporada === currentSeason)}
              onDelete={(id) => deleteTransactionMutation.mutate(id)}
              onExport={handleExportTransactions}
            />
          )}
        </TabsContent>

        <TabsContent value="documentos">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-600" />
                Documentos y Facturas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {transactions
                  .filter(t => t.documento_url)
                  .map(t => (
                    <Card key={t.id} className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => window.open(t.documento_url, '_blank')}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-orange-100 rounded-lg">
                            <FileText className="h-6 w-6 text-orange-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{t.documento_nombre || "Documento"}</p>
                            <p className="text-xs text-slate-500 truncate">{t.concepto}</p>
                            <p className="text-xs text-slate-400 mt-1">{t.fecha}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                {transactions.filter(t => t.documento_url).length === 0 && (
                  <div className="col-span-full text-center py-12 text-slate-500">
                    <FileText className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                    <p>No hay documentos adjuntos</p>
                    <p className="text-sm">Los documentos aparecerán aquí cuando los adjuntes a los movimientos</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showNewBudget} onOpenChange={setShowNewBudget}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Presupuesto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Temporada</Label>
              <Input
                value={newBudgetData.temporada}
                onChange={(e) => setNewBudgetData({...newBudgetData, temporada: e.target.value})}
                placeholder="2024/2025"
              />
            </div>
            <div>
              <Label>Nombre del Presupuesto</Label>
              <Input
                value={newBudgetData.nombre}
                onChange={(e) => setNewBudgetData({...newBudgetData, nombre: e.target.value})}
                placeholder="Presupuesto Principal"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewBudget(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateBudget}
              disabled={createBudgetMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {createBudgetMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                "Crear Presupuesto"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
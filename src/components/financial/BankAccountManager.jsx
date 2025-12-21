import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, Eye, Upload } from "lucide-react";
import { toast } from "sonner";
import BankStatementImporter from "./BankStatementImporter";

export default function BankAccountManager({ activeSeason }) {
  const queryClient = useQueryClient();
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [formData, setFormData] = useState({
    nombre: "",
    banco: "",
    numero_cuenta: "",
    tipo: "Corriente",
    saldo_inicial: 0
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['bankAccounts'],
    queryFn: () => base44.entities.BankAccount.list(),
  });

  const { data: movements = [] } = useQuery({
    queryKey: ['bankMovements', selectedAccount?.id],
    queryFn: async () => {
      if (!selectedAccount) return [];
      return base44.entities.BankMovement.filter({ cuenta_id: selectedAccount.id });
    },
    enabled: !!selectedAccount,
  });

  const createAccountMutation = useMutation({
    mutationFn: async (data) => base44.entities.BankAccount.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['bankAccounts']);
      setShowAddAccount(false);
      toast.success("Cuenta creada");
    },
  });

  const handleCreateAccount = () => {
    createAccountMutation.mutate({
      ...formData,
      saldo_actual: formData.saldo_inicial,
      activa: true,
      temporada: activeSeason?.temporada
    });
  };

  const activeAccounts = accounts.filter(a => a.activa);
  const totalSaldo = activeAccounts.reduce((sum, a) => sum + (a.saldo_actual || 0), 0);

  const conciliadosCount = movements.filter(m => m.conciliado).length;
  const pendientesCount = movements.filter(m => !m.conciliado).length;

  return (
    <div className="space-y-6">
      <Card className="border-2 border-indigo-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-6 h-6 text-indigo-600" />
              Cuentas Bancarias
            </CardTitle>
            <Button onClick={() => setShowAddAccount(true)} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Cuenta
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-indigo-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-indigo-600 font-medium">Saldo Total</p>
            <p className="text-3xl font-bold text-indigo-700">{totalSaldo.toFixed(2)}€</p>
          </div>

          <div className="space-y-3">
            {activeAccounts.map(account => (
              <div key={account.id} className="border rounded-lg p-4 hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedAccount(account)}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900">{account.nombre}</h4>
                    <p className="text-sm text-slate-600">{account.banco}</p>
                    <Badge variant="outline" className="mt-1">{account.tipo}</Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-600">Saldo</p>
                    <p className="text-2xl font-bold text-slate-900">{account.saldo_actual?.toFixed(2)}€</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedAccount && (
        <BankStatementImporter 
          activeSeason={activeSeason}
          accountId={selectedAccount.id}
        />
      )}

      {selectedAccount && movements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Movimientos de {selectedAccount.nombre}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-xs text-green-600">Conciliados</p>
                <p className="text-xl font-bold text-green-700">{conciliadosCount}</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 text-center">
                <p className="text-xs text-orange-600">Pendientes</p>
                <p className="text-xl font-bold text-orange-700">{pendientesCount}</p>
              </div>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {movements.map(mov => (
                <div key={mov.id} className={`flex justify-between p-3 rounded-lg border ${
                  mov.conciliado ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'
                }`}>
                  <div>
                    <p className="font-medium text-sm">{mov.concepto}</p>
                    <p className="text-xs text-slate-500">{new Date(mov.fecha).toLocaleDateString('es-ES')}</p>
                    {mov.conciliado && (
                      <Badge className="mt-1 bg-green-600 text-xs">✓ Conciliado</Badge>
                    )}
                  </div>
                  <p className={`font-bold ${mov.tipo === "Ingreso" ? 'text-green-600' : 'text-red-600'}`}>
                    {mov.tipo === "Ingreso" ? '+' : '-'}{Math.abs(mov.cantidad).toFixed(2)}€
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog añadir cuenta */}
      <Dialog open={showAddAccount} onOpenChange={setShowAddAccount}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir Cuenta Bancaria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input 
              placeholder="Nombre (ej: Cuenta Principal)"
              value={formData.nombre}
              onChange={(e) => setFormData({...formData, nombre: e.target.value})}
            />
            <Input 
              placeholder="Banco"
              value={formData.banco}
              onChange={(e) => setFormData({...formData, banco: e.target.value})}
            />
            <Input 
              placeholder="Número de cuenta / IBAN"
              value={formData.numero_cuenta}
              onChange={(e) => setFormData({...formData, numero_cuenta: e.target.value})}
            />
            <Select value={formData.tipo} onValueChange={(value) => setFormData({...formData, tipo: value})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Corriente">Corriente</SelectItem>
                <SelectItem value="Ahorro">Ahorro</SelectItem>
                <SelectItem value="Caja">Caja</SelectItem>
              </SelectContent>
            </Select>
            <Input 
              type="number"
              placeholder="Saldo inicial (€)"
              value={formData.saldo_inicial}
              onChange={(e) => setFormData({...formData, saldo_inicial: parseFloat(e.target.value) || 0})}
            />
            <Button onClick={handleCreateAccount} className="w-full bg-indigo-600 hover:bg-indigo-700">
              Crear Cuenta
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";

import PaymentForm from "../components/payments/PaymentForm";
import PaymentTable from "../components/payments/PaymentTable";
import PaymentStats from "../components/payments/PaymentStats";

export default function Payments() {
  const [showForm, setShowForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [playerFilter, setPlayerFilter] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const queryClient = useQueryClient();

  // Leer parámetro de URL para filtrar por jugador
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const jugadorId = urlParams.get('jugador_id');
    if (jugadorId) {
      setPlayerFilter(jugadorId);
    }
  }, []);

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const user = await base44.auth.me();
        setIsAdmin(user.role === "admin");
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, []);

  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list('-created_date'),
    initialData: [],
  });

  const { data: players } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
  });

  const createPaymentMutation = useMutation({
    mutationFn: (paymentData) => base44.entities.Payment.create(paymentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setShowForm(false);
      setEditingPayment(null);
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: ({ id, paymentData }) => base44.entities.Payment.update(id, paymentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setShowForm(false);
      setEditingPayment(null);
    },
  });

  const handleSubmit = async (paymentData) => {
    if (editingPayment) {
      updatePaymentMutation.mutate({ id: editingPayment.id, paymentData });
    } else {
      createPaymentMutation.mutate(paymentData);
    }
  };

  const handleEdit = (payment) => {
    setEditingPayment(payment);
    setShowForm(true);
  };

  const handleStatusChange = (payment, newStatus) => {
    if (!isAdmin) {
      // Solo admins pueden cambiar estados
      console.warn("Only administrators can change payment status.");
      return; 
    }
    const updatedData = { ...payment, estado: newStatus };
    if (newStatus === "Pagado" && !payment.fecha_pago) {
      updatedData.fecha_pago = new Date().toISOString().split('T')[0];
    }
    updatePaymentMutation.mutate({ id: payment.id, paymentData: updatedData });
  };

  // Filtrar pagos por jugador si hay filtro activo
  const filteredPayments = playerFilter 
    ? payments.filter(p => p.jugador_id === playerFilter)
    : payments;

  const filteredPlayer = playerFilter 
    ? players.find(p => p.id === playerFilter)
    : null;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Pagos</h1>
          <p className="text-slate-600 mt-1">Control de cuotas y pagos</p>
          {filteredPlayer && (
            <div className="flex items-center gap-2 mt-3">
              <Badge className="bg-orange-100 text-orange-700 text-sm py-1">
                Filtrando por: {filteredPlayer.nombre}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPlayerFilter(null);
                  window.history.pushState({}, '', window.location.pathname);
                }}
                className="h-7 px-2 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
        {isAdmin && (
          <Button
            onClick={() => {
              setEditingPayment(null);
              setShowForm(!showForm);
            }}
            className="bg-orange-600 hover:bg-orange-700 shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Registrar Pago
          </Button>
        )}
      </div>

      <PaymentStats payments={filteredPayments} />

      {isAdmin && (
        <AnimatePresence>
          {showForm && (
            <PaymentForm
              payment={editingPayment}
              players={players}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingPayment(null);
              }}
              isSubmitting={createPaymentMutation.isPending || updatePaymentMutation.isPending}
            />
          )}
        </AnimatePresence>
      )}

      <PaymentTable
        payments={filteredPayments}
        isLoading={isLoading}
        onEdit={isAdmin ? handleEdit : undefined}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}

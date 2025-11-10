
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AnimatePresence } from "framer-motion";

import PaymentForm from "../components/payments/PaymentForm";
import PaymentTable from "../components/payments/PaymentTable";
import PaymentStats from "../components/payments/PaymentStats";

export default function Payments() {
  const [showForm, setShowForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  
  const queryClient = useQueryClient();

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
    const updatedData = { ...payment, estado: newStatus };
    if (newStatus === "Pagado" && !payment.fecha_pago) {
      updatedData.fecha_pago = new Date().toISOString().split('T')[0];
    }
    updatePaymentMutation.mutate({ id: payment.id, paymentData: updatedData });
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Pagos</h1>
          <p className="text-slate-600 mt-1">Control de cuotas y pagos</p>
        </div>
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
      </div>

      <PaymentStats payments={payments} />

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

      <PaymentTable
        payments={payments}
        isLoading={isLoading}
        onEdit={handleEdit}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}

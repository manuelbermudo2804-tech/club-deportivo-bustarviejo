import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";

import PaymentForm from "../components/payments/PaymentForm";
import PaymentTable from "../components/payments/PaymentTable";
import PaymentStats from "../components/payments/PaymentStats";
import ExportButton from "../components/ExportButton";

export default function Payments() {
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const jugadorIdFromUrl = urlParams.get('jugador_id');
  const autoRegister = urlParams.get('register') === 'true';

  const [showForm, setShowForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [playerFilter, setPlayerFilter] = useState(jugadorIdFromUrl || "all");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCoach, setIsCoach] = useState(false);
  const [myPlayers, setMyPlayers] = useState([]);

  const queryClient = useQueryClient();

  useEffect(() => {
    const checkUserRoleAndPlayers = async () => {
      try {
        const user = await base44.auth.me();
        const adminCheck = user.role === "admin";
        const coachCheck = user.es_entrenador === true && !adminCheck;

        setIsAdmin(adminCheck);
        setIsCoach(coachCheck);

        if (adminCheck) {
          const allPlayers = await base44.entities.Player.list();
          setMyPlayers(allPlayers);
        } else if (coachCheck) {
          const allPlayers = await base44.entities.Player.list();
          const userPlayers = allPlayers.filter(p =>
            p.email_padre === user.email ||
            p.email_tutor_2 === user.email
          );
          setMyPlayers(userPlayers);
        }
      } catch (error) {
        console.error("Error checking user role and fetching players:", error);
        setIsAdmin(false);
        setIsCoach(false);
        setMyPlayers([]);
      }
    };
    checkUserRoleAndPlayers();
  }, []);

  useEffect(() => {
    if (autoRegister && (isAdmin || (isCoach && myPlayers.length > 0))) {
      setShowForm(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [autoRegister, isAdmin, isCoach, myPlayers.length]);

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
      console.warn("Only administrators can change payment status.");
      return;
    }
    const updatedData = { ...payment, estado: newStatus };
    if (newStatus === "Pagado" && !payment.fecha_pago) {
      updatedData.fecha_pago = new Date().toISOString().split('T')[0];
    }
    updatePaymentMutation.mutate({ id: payment.id, paymentData: updatedData });
  };

  const canRegisterPayments = isAdmin || (isCoach && myPlayers.length > 0);

  const filteredPayments = (playerFilter && playerFilter !== "all")
    ? payments.filter(p => p.jugador_id === playerFilter)
    : payments;

  const filteredPlayer = (playerFilter && playerFilter !== "all")
    ? players.find(p => p.id === playerFilter)
    : null;

  const prepareExportData = () => {
    return filteredPayments.map(p => ({
      Jugador: p.jugador_nombre,
      Tipo: p.tipo_pago,
      Mes: p.mes,
      Temporada: p.temporada,
      Cantidad: `${p.cantidad}€`,
      Estado: p.estado,
      Metodo: p.metodo_pago,
      'Fecha Pago': p.fecha_pago || '-',
      'Tiene Justificante': p.justificante_url ? 'Sí' : 'No'
    }));
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Pagos y Cuotas</h1>
          <p className="text-slate-600 mt-1">
            {isAdmin ? "Gestión de pagos y cobros de temporada" : isCoach && myPlayers.length > 0 ? "Pagos de mis hijos" : "Consulta de pagos"}
          </p>
          {filteredPlayer && (
            <div className="flex items-center gap-2 mt-3">
              <Badge className="bg-orange-100 text-orange-700 text-sm py-1">
                Filtrando por: {filteredPlayer.nombre}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPlayerFilter("all");
                  window.history.pushState({}, '', window.location.pathname);
                }}
                className="h-7 px-2 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {(isAdmin || (isCoach && myPlayers.length > 0)) && filteredPayments.length > 0 && (
            <ExportButton
              data={prepareExportData()}
              filename="pagos_club"
            />
          )}
          {canRegisterPayments && (
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
      </div>

      <PaymentStats payments={filteredPayments} />

      <AnimatePresence>
        {showForm && canRegisterPayments && (
          <PaymentForm
            payment={editingPayment}
            players={isAdmin ? players : myPlayers}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingPayment(null);
            }}
            isSubmitting={createPaymentMutation.isPending || updatePaymentMutation.isPending}
            isAdmin={isAdmin}
          />
        )}
      </AnimatePresence>

      <PaymentTable
        payments={filteredPayments}
        players={players}
        isLoading={isLoading}
        onEdit={canRegisterPayments ? handleEdit : null}
        onStatusChange={isAdmin ? handleStatusChange : null}
        playerFilter={playerFilter}
        setPlayerFilter={setPlayerFilter}
        selectedPlayer={filteredPlayer}
        isAdmin={isAdmin}
      />
    </div>
  );
}
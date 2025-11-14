
import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom"; // Added useLocation import
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
  const location = useLocation(); // Hook to get current URL location
  const urlParams = new URLSearchParams(location.search);
  const jugadorIdFromUrl = urlParams.get('jugador_id');

  const [showForm, setShowForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [playerFilter, setPlayerFilter] = useState(jugadorIdFromUrl || "all"); // Initialize playerFilter from URL or "all"
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCoach, setIsCoach] = useState(false); // New state for coach role
  const [myPlayers, setMyPlayers] = useState([]); // New state for players associated with coach/admin

  const queryClient = useQueryClient();

  // Removed old useEffect for URL param as it's handled by useLocation and useState init

  // Check user role (admin/coach) and fetch associated players
  useEffect(() => {
    const checkUserRoleAndPlayers = async () => {
      try {
        const user = await base44.auth.me();
        const adminCheck = user.role === "admin";
        // A coach is someone who is not an admin but has es_entrenador = true
        const coachCheck = user.es_entrenador === true && !adminCheck;

        setIsAdmin(adminCheck);
        setIsCoach(coachCheck);

        // If admin or coach, get their relevant players
        if (adminCheck) {
          // Admins can see and manage all players
          const allPlayers = await base44.entities.Player.list();
          setMyPlayers(allPlayers);
        } else if (coachCheck) {
          // Coaches can only see and manage players associated with their email
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
  }, []); // Run once on component mount

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

  // Determine if the current user can register payments
  const canRegisterPayments = isAdmin || (isCoach && myPlayers.length > 0);

  // Filter payments by player if a filter is active (not "all")
  const filteredPayments = (playerFilter && playerFilter !== "all")
    ? payments.filter(p => p.jugador_id === playerFilter)
    : payments;

  // Find the player object for the active filter, if any
  const filteredPlayer = (playerFilter && playerFilter !== "all")
    ? players.find(p => p.id === playerFilter)
    : null;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Pagos y Cuotas</h1>
          <p className="text-slate-600 mt-1">
            {isAdmin ? "Gestión de pagos y cobros de temporada" : isCoach ? "Pagos de mis hijos" : "Gestión de pagos"}
          </p>
          {filteredPlayer && ( // Only show filter badge if a specific player is selected
            <div className="flex items-center gap-2 mt-3">
              <Badge className="bg-orange-100 text-orange-700 text-sm py-1">
                Filtrando por: {filteredPlayer.nombre}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPlayerFilter("all"); // Reset player filter to "all"
                  // Remove jugador_id from URL if present
                  window.history.pushState({}, '', window.location.pathname);
                }}
                className="h-7 px-2 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
        {canRegisterPayments && ( // Only show "Registrar Pago" button if user can register payments
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

      <AnimatePresence>
        {showForm && canRegisterPayments && ( // Only show form if it's toggled and user can register payments
          <PaymentForm
            payment={editingPayment}
            players={isAdmin ? players : myPlayers} // Provide all players for admin, filtered players for coach
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingPayment(null);
            }}
            isSubmitting={createPaymentMutation.isPending || updatePaymentMutation.isPending}
            isAdmin={isAdmin} // Pass isAdmin prop to form
          />
        )}
      </AnimatePresence>

      <PaymentTable
        payments={filteredPayments}
        players={players} // Pass all players for mapping player names in table
        isLoading={isLoading}
        onEdit={canRegisterPayments ? handleEdit : null} // Allow edit only if user can register payments
        onStatusChange={isAdmin ? handleStatusChange : null} // Allow status change only for admins
        playerFilter={playerFilter} // Pass current player filter state
        setPlayerFilter={setPlayerFilter} // Pass function to update player filter
        selectedPlayer={filteredPlayer} // Pass the selected player object
        isAdmin={isAdmin} // Pass isAdmin prop to table
      />
    </div>
  );
}

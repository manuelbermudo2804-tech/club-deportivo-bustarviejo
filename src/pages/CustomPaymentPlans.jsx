import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

import CustomPaymentPlansList from "../components/payments/CustomPaymentPlansList";
import CustomPaymentPlanForm from "../components/payments/CustomPaymentPlanForm";

export default function CustomPaymentPlans() {
  const [showForm, setShowForm] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [editingPlan, setEditingPlan] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const queryClient = useQueryClient();

  const { data: customPlans = [] } = useQuery({
    queryKey: ['customPaymentPlans'],
    queryFn: () => base44.entities.CustomPaymentPlan.list('-created_date'),
    initialData: [],
  });

  const { data: players = [] } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
  });

  const createCustomPlanMutation = useMutation({
    mutationFn: async (planData) => {
      const user = await base44.auth.me();
      return base44.entities.CustomPaymentPlan.create({
        ...planData,
        aprobado_por: user.email,
        aprobado_por_nombre: user.full_name,
        fecha_aprobacion: new Date().toISOString()
      });
    },
    onSuccess: async (createdPlan, variables) => {
      // Archivar pagos previos (Único o Tres meses) del jugador en la misma temporada
      try {
        const user = await base44.auth.me();
        const jugadorId = createdPlan?.jugador_id || variables?.jugador_id;
        const temporada = createdPlan?.temporada || variables?.temporada;
        if (jugadorId && temporada) {
          const allPayments = await base44.entities.Payment.list();
          const playerSeasonPayments = allPayments.filter(p => p.jugador_id === jugadorId && p.temporada === temporada && p.is_deleted !== true);
          const toArchive = playerSeasonPayments.filter(p => {
            const tipo = (p.tipo_pago || '').toLowerCase();
            return tipo.includes('único') || tipo.includes('unico') || tipo.includes('tres meses');
          });
          for (const p of toArchive) {
            await base44.entities.Payment.update(p.id, {
              is_deleted: true,
              deleted_by: user.email,
              deleted_date: new Date().toISOString(),
              deleted_reason: 'Reemplazado por Plan Especial',
            });
          }
        }
      } catch (e) { console.log('Cleanup pagos previos falló:', e); }
      queryClient.invalidateQueries({ queryKey: ['customPaymentPlans'] });
      setShowForm(false);
      setSelectedPlayer(null);
      setEditingPlan(null);
      toast.success("Plan personalizado creado correctamente");
    },
  });

  const updateCustomPlanMutation = useMutation({
    mutationFn: ({ id, planData }) => base44.entities.CustomPaymentPlan.update(id, planData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customPaymentPlans'] });
      setShowForm(false);
      setEditingPlan(null);
      toast.success("Plan actualizado correctamente");
    },
  });

  const deleteCustomPlanMutation = useMutation({
    mutationFn: async (planId) => {
      await base44.entities.CustomPaymentPlan.update(planId, { activo: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customPaymentPlans'] });
      toast.success("Plan desactivado");
    },
  });

  const filteredPlayers = players.filter(p => 
    p.activo && 
    (!searchTerm || p.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">💰 Planes de Pago Personalizados</h1>
          <p className="text-slate-600 mt-1">Crea planes a medida para familias con necesidades especiales</p>
        </div>
        <Button
          onClick={() => {
            setEditingPlan(null);
            setShowForm(!showForm);
          }}
          className="bg-orange-600 hover:bg-orange-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nuevo Plan
        </Button>
      </div>

      {showForm && (
        <div className="bg-purple-50 border-2 border-purple-300 rounded-xl p-4 space-y-3">
          <h3 className="font-bold text-purple-900">Selecciona el jugador:</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Buscar jugador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
            {filteredPlayers.map(player => {
              const hasActivePlan = customPlans.some(p => p.jugador_id === player.id && p.activo);
              return (
                <button
                  key={player.id}
                  onClick={() => {
                    setSelectedPlayer(player);
                  }}
                  className="text-left p-3 bg-white hover:bg-purple-50 rounded-lg border-2 border-slate-200 hover:border-purple-400 transition-all"
                  disabled={hasActivePlan}
                >
                  <div className="flex items-center gap-2">
                    {player.foto_url ? (
                      <img src={player.foto_url} className="w-10 h-10 rounded-full object-cover" alt="" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold">
                        {player.nombre.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-sm">{player.nombre}</p>
                      <p className="text-xs text-slate-600">{player.deporte}</p>
                      {hasActivePlan && (
                        <p className="text-xs text-purple-600 font-medium mt-1">✅ Ya tiene plan activo</p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            onClick={() => {
              setShowForm(false);
              setSearchTerm("");
            }}
          >
            Cancelar
          </Button>
        </div>
      )}

      <CustomPaymentPlanForm
        open={!!selectedPlayer}
        onClose={() => {
          setSelectedPlayer(null);
          setEditingPlan(null);
        }}
        player={selectedPlayer}
        existingPlan={editingPlan}
        onSubmit={(planData) => {
          if (editingPlan) {
            updateCustomPlanMutation.mutate({ id: editingPlan.id, planData });
          } else {
            createCustomPlanMutation.mutate(planData);
          }
        }}
        isSubmitting={createCustomPlanMutation.isPending || updateCustomPlanMutation.isPending}
      />

      <CustomPaymentPlansList
        plans={customPlans}
        players={players}
        onEdit={(plan) => {
          const player = players.find(p => p.id === plan.jugador_id);
          setSelectedPlayer(player);
          setEditingPlan(plan);
        }}
        onDelete={(planId) => {
          if (confirm("¿Desactivar este plan personalizado?\n\nEl jugador volverá al sistema de cuotas estándar.")) {
            deleteCustomPlanMutation.mutate(planId);
          }
        }}
      />
    </div>
  );
}

import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AnimatePresence } from "framer-motion";

import PlayerCard from "../components/players/PlayerCard";
import PlayerForm from "../components/players/PlayerForm";
import ContactCard from "../components/ContactCard";

export default function ParentPlayers() {
  const [showForm, setShowForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: players, isLoading } = useQuery({
    queryKey: ['myPlayers', user?.email],
    queryFn: async () => {
      const allPlayers = await base44.entities.Player.list();
      return allPlayers.filter(p => 
        p.email_padre === user?.email || p.email === user?.email
      );
    },
    enabled: !!user?.email,
    initialData: [],
  });

  const createPlayerMutation = useMutation({
    mutationFn: (playerData) => base44.entities.Player.create(playerData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myPlayers'] });
      setShowForm(false);
      setEditingPlayer(null);
    },
  });

  const updatePlayerMutation = useMutation({
    mutationFn: ({ id, playerData }) => base44.entities.Player.update(id, playerData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myPlayers'] });
      setShowForm(false);
      setEditingPlayer(null);
    },
  });

  const handleSubmit = async (playerData) => {
    if (editingPlayer) {
      updatePlayerMutation.mutate({ id: editingPlayer.id, playerData });
    } else {
      createPlayerMutation.mutate(playerData);
    }
  };

  const handleEdit = (player) => {
    setEditingPlayer(player);
    setShowForm(true);
  };

  const futbolPlayers = players.filter(p => p.deporte === "Fútbol");
  const baloncestoPlayers = players.filter(p => p.deporte === "Baloncesto");

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Mis Jugadores</h1>
          <p className="text-slate-600 mt-1">Gestiona la información de tus jugadores</p>
        </div>
        <Button
          onClick={() => {
            setEditingPlayer(null);
            setShowForm(!showForm);
          }}
          className="bg-orange-600 hover:bg-orange-700 shadow-lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          Registrar Jugador
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Total Jugadores</p>
              <p className="text-3xl font-bold text-slate-900">{players.length}</p>
            </div>
            <span className="text-4xl">👥</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Fútbol</p>
              <p className="text-3xl font-bold text-green-700">{futbolPlayers.length}</p>
            </div>
            <span className="text-4xl">⚽</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Baloncesto</p>
              <p className="text-3xl font-bold text-orange-700">{baloncestoPlayers.length}</p>
            </div>
            <span className="text-4xl">🏀</span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <PlayerForm
            player={editingPlayer}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingPlayer(null);
            }}
            isSubmitting={createPlayerMutation.isPending || updatePlayerMutation.isPending}
          />
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div>
        </div>
      ) : players.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-lg">
          <div className="text-6xl mb-4">⚽🏀</div>
          <p className="text-slate-500 text-lg mb-2">No tienes jugadores registrados</p>
          <p className="text-slate-400 text-sm">Haz clic en "Registrar Jugador" para añadir a tu hijo/a</p>
        </div>
      ) : (
        <>
          {/* Jugadores de Fútbol */}
          {futbolPlayers.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <span>⚽</span> Fútbol
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <AnimatePresence>
                  {futbolPlayers.map((player) => (
                    <PlayerCard key={player.id} player={player} onEdit={handleEdit} />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Jugadores de Baloncesto */}
          {baloncestoPlayers.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <span>🏀</span> Baloncesto
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <AnimatePresence>
                  {baloncestoPlayers.map((player) => (
                    <PlayerCard key={player.id} player={player} onEdit={handleEdit} />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </>
      )}

      <ContactCard />
    </div>
  );
}

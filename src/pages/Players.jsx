import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";

import PlayerCard from "../components/players/PlayerCard";
import PlayerForm from "../components/players/PlayerForm";

export default function Players() {
  const [showForm, setShowForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sportFilter, setSportFilter] = useState("all");
  
  const queryClient = useQueryClient();

  const { data: players, isLoading } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list('-created_date'),
    initialData: [],
  });

  const createPlayerMutation = useMutation({
    mutationFn: (playerData) => base44.entities.Player.create(playerData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      setShowForm(false);
      setEditingPlayer(null);
    },
  });

  const updatePlayerMutation = useMutation({
    mutationFn: ({ id, playerData }) => base44.entities.Player.update(id, playerData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
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

  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.nombre?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || player.categoria === categoryFilter;
    const matchesSport = sportFilter === "all" || player.deporte === sportFilter;
    return matchesSearch && matchesCategory && matchesSport;
  });

  const categories = ["all", "Prebenjamín", "Benjamín", "Alevín", "Infantil", "Cadete", "Juvenil", "Senior"];

  // Contar jugadores por deporte
  const futbolMasculinoCount = players.filter(p => p.deporte === "Fútbol Masculino").length;
  const futbolFemeninoCount = players.filter(p => p.deporte === "Fútbol Femenino").length;
  const baloncestoCount = players.filter(p => p.deporte === "Baloncesto").length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Jugadores</h1>
          <p className="text-slate-600 mt-1">Gestión de fichas y plantilla</p>
        </div>
        <Button
          onClick={() => {
            setEditingPlayer(null);
            setShowForm(!showForm);
          }}
          className="bg-orange-600 hover:bg-orange-700 shadow-lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nuevo Jugador
        </Button>
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

      {/* Filtro por Deporte */}
      <div className="flex flex-wrap gap-3">
        <Button
          variant={sportFilter === "all" ? "default" : "outline"}
          onClick={() => setSportFilter("all")}
          className={sportFilter === "all" ? "bg-orange-600 hover:bg-orange-700" : ""}
        >
          Todos ({players.length})
        </Button>
        <Button
          variant={sportFilter === "Fútbol Masculino" ? "default" : "outline"}
          onClick={() => setSportFilter("Fútbol Masculino")}
          className={sportFilter === "Fútbol Masculino" ? "bg-blue-600 hover:bg-blue-700" : ""}
        >
          ⚽ Fútbol Masculino ({futbolMasculinoCount})
        </Button>
        <Button
          variant={sportFilter === "Fútbol Femenino" ? "default" : "outline"}
          onClick={() => setSportFilter("Fútbol Femenino")}
          className={sportFilter === "Fútbol Femenino" ? "bg-pink-600 hover:bg-pink-700" : ""}
        >
          ⚽ Fútbol Femenino ({futbolFemeninoCount})
        </Button>
        <Button
          variant={sportFilter === "Baloncesto" ? "default" : "outline"}
          onClick={() => setSportFilter("Baloncesto")}
          className={sportFilter === "Baloncesto" ? "bg-orange-600 hover:bg-orange-700" : ""}
        >
          🏀 Baloncesto ({baloncestoCount})
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Buscar jugador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white shadow-sm"
          />
        </div>
        <Tabs value={categoryFilter} onValueChange={setCategoryFilter} className="w-full md:w-auto">
          <TabsList className="bg-white shadow-sm">
            {categories.map((cat) => (
              <TabsTrigger key={cat} value={cat} className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700">
                {cat === "all" ? "Todas" : cat}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div>
        </div>
      ) : filteredPlayers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-500">No se encontraron jugadores</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {filteredPlayers.map((player) => (
              <PlayerCard key={player.id} player={player} onEdit={handleEdit} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
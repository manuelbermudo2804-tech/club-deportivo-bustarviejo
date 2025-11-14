import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Users, Calendar } from "lucide-react";

import RosterPlayerCard from "../components/players/RosterPlayerCard";

export default function TeamRosters() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [user, setUser] = useState(null);
  const [coachCategories, setCoachCategories] = useState([]);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      const categories = currentUser.categorias_entrena || [];
      setCoachCategories(categories);
      if (categories.length > 0) {
        setSelectedCategory(categories[0]);
      }
    };
    fetchUser();
  }, []);

  const { data: players, isLoading } = useQuery({
    queryKey: ['allPlayers'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
  });

  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.nombre?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || player.deporte === selectedCategory;
    const isInMyTeams = coachCategories.includes(player.deporte);
    return matchesSearch && matchesCategory && isInMyTeams && player.activo;
  });

  const activePlayers = filteredPlayers.length;

  if (!user || coachCategories.length === 0) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-lg">No tienes equipos asignados</p>
          <p className="text-sm text-slate-400 mt-2">Contacta con el administrador</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">🎓 Plantillas</h1>
        <p className="text-slate-600 mt-1 text-sm lg:text-base">Jugadores de tus equipos</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6">
        <Card className="border-none shadow-lg bg-white">
          <CardContent className="pt-4 lg:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm text-slate-600 mb-1">Equipos</p>
                <p className="text-2xl lg:text-3xl font-bold text-blue-600">{coachCategories.length}</p>
              </div>
              <Users className="w-8 h-8 lg:w-12 lg:h-12 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white">
          <CardContent className="pt-4 lg:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm text-slate-600 mb-1">Jugadores</p>
                <p className="text-2xl lg:text-3xl font-bold text-green-600">{activePlayers}</p>
              </div>
              <Users className="w-8 h-8 lg:w-12 lg:h-12 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white col-span-2 lg:col-span-1">
          <CardContent className="pt-4 lg:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm text-slate-600 mb-1">Categoría</p>
                <p className="text-sm lg:text-lg font-bold text-orange-600 truncate">
                  {selectedCategory === "all" ? "Todas" : selectedCategory.split(" ")[1]}
                </p>
              </div>
              <Calendar className="w-8 h-8 lg:w-12 lg:h-12 text-orange-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="border-none shadow-lg bg-white">
        <CardContent className="pt-4 lg:pt-6 space-y-3 lg:space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 lg:w-5 lg:h-5 text-slate-400" />
            <Input
              placeholder="Buscar jugador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 lg:pl-10 text-sm lg:text-base"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge
              onClick={() => setSelectedCategory("all")}
              className={`cursor-pointer px-3 py-1 text-xs lg:text-sm ${
                selectedCategory === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Todos ({players.filter(p => coachCategories.includes(p.deporte) && p.activo).length})
            </Badge>
            {coachCategories.map((categoria) => {
              const count = players.filter(p => p.deporte === categoria && p.activo).length;
              return (
                <Badge
                  key={categoria}
                  onClick={() => setSelectedCategory(categoria)}
                  className={`cursor-pointer px-3 py-1 text-xs lg:text-sm ${
                    selectedCategory === categoria
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {categoria} ({count})
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Players Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
        </div>
      ) : filteredPlayers.length === 0 ? (
        <Card className="border-none shadow-lg bg-white">
          <CardContent className="py-12 text-center">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">No hay jugadores en este equipo</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4">
          {filteredPlayers.map((player) => (
            <RosterPlayerCard key={player.id} player={player} />
          ))}
        </div>
      )}
    </div>
  );
}
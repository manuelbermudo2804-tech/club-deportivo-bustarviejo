import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Star, TrendingUp, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import EvaluationForm from "../components/evaluations/EvaluationForm";
import EvaluationCard from "../components/evaluations/EvaluationCard";

export default function PlayerEvaluations() {
  const [showForm, setShowForm] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [user, setUser] = useState(null);
  const [isCoach, setIsCoach] = useState(false);
  const [coachCategories, setCoachCategories] = useState([]);

  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setIsCoach(currentUser.es_entrenador === true || currentUser.role === "admin");
        
        if (currentUser.categorias_entrena) {
          setCoachCategories(currentUser.categorias_entrena);
          if (currentUser.categorias_entrena.length === 1) {
            setSelectedCategory(currentUser.categorias_entrena[0]);
          }
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const { data: players } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
  });

  const { data: evaluations } = useQuery({
    queryKey: ['evaluations'],
    queryFn: () => base44.entities.PlayerEvaluation.list('-fecha_evaluacion'),
    initialData: [],
  });

  const createEvaluationMutation = useMutation({
    mutationFn: (data) => base44.entities.PlayerEvaluation.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluations'] });
      setShowForm(false);
      setSelectedPlayer(null);
      toast.success("Evaluación guardada correctamente");
    },
  });

  const handleSubmit = (data) => {
    createEvaluationMutation.mutate(data);
  };

  const filteredPlayers = players.filter(p => {
    if (selectedCategory === "all") {
      return user?.role === "admin" ? true : coachCategories.includes(p.deporte);
    }
    return p.deporte === selectedCategory && p.activo;
  });

  const filteredEvaluations = evaluations.filter(e => {
    if (selectedCategory === "all") {
      return user?.role === "admin" ? true : coachCategories.includes(e.categoria);
    }
    return e.categoria === selectedCategory;
  });

  // Calculate stats
  const avgTecnica = filteredEvaluations.length > 0 
    ? (filteredEvaluations.reduce((sum, e) => sum + e.tecnica, 0) / filteredEvaluations.length).toFixed(1)
    : 0;
  const avgActitud = filteredEvaluations.length > 0 
    ? (filteredEvaluations.reduce((sum, e) => sum + e.actitud, 0) / filteredEvaluations.length).toFixed(1)
    : 0;
  const totalEvaluated = new Set(filteredEvaluations.map(e => e.jugador_id)).size;

  // Modo menor/jugador: mostrar solo sus evaluaciones
  const isMinorOrPlayer = user && !isCoach && (user.tipo_panel === 'jugador_menor' || user.es_menor === true || user.tipo_panel === 'jugador_adulto' || user.es_jugador === true);

  const { data: myPlayerForEvals } = useQuery({
    queryKey: ['myPlayerForEvals', user?.email],
    queryFn: async () => {
      // Buscar ficha vinculada como menor o jugador adulto
      let linked = await base44.entities.Player.filter({ acceso_menor_email: user.email, acceso_menor_autorizado: true, activo: true });
      if (linked.length === 0) {
        linked = await base44.entities.Player.filter({ email_jugador: user.email, acceso_jugador_autorizado: true, activo: true });
      }
      return linked[0] || null;
    },
    enabled: !!user?.email && isMinorOrPlayer,
  });

  const myEvaluations = isMinorOrPlayer && myPlayerForEvals
    ? evaluations.filter(e => e.jugador_id === myPlayerForEvals.id && e.visible_para_padres === true)
    : [];

  if (isMinorOrPlayer) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">📊 Mis Evaluaciones</h1>
          <p className="text-slate-600 mt-1">Lo que dice tu entrenador de ti</p>
        </div>
        {myEvaluations.length === 0 ? (
          <Card className="border-none shadow-lg">
            <CardContent className="p-12 text-center">
              <div className="text-6xl mb-4">📋</div>
              <p className="text-slate-500">Aún no tienes evaluaciones publicadas</p>
              <p className="text-slate-400 text-sm mt-2">Tu entrenador las publicará cuando las tenga listas</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnimatePresence>
              {myEvaluations.map((evaluation) => (
                <EvaluationCard key={evaluation.id} evaluation={evaluation} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    );
  }

  if (!isCoach) {
    return (
      <div className="p-6 lg:p-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-12 text-center">
            <p className="text-red-700">Solo entrenadores tienen acceso a esta sección</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">👥 Evaluaciones de Jugadores</h1>
          <p className="text-slate-600 mt-1">Seguimiento del progreso de tus jugadores</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-orange-600 hover:bg-orange-700"
          disabled={!selectedCategory || selectedCategory === "all"}
        >
          <Plus className="w-5 h-5 mr-2" />
          Nueva Evaluación
        </Button>
      </div>

      {coachCategories.length > 1 && (
        <Card className="border-2 border-blue-300 bg-blue-50">
          <CardContent className="pt-6">
            <label className="text-sm font-medium text-blue-900 mb-2 block">
              Selecciona una categoría:
            </label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">📊 Ver todas las categorías</SelectItem>
                {coachCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat.includes("Fútbol") ? "⚽" : "🏀"} {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Jugadores Evaluados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{totalEvaluated}</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Star className="w-4 h-4" />
              Media Técnica
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{avgTecnica}/5</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Media Actitud
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{avgActitud}/5</div>
          </CardContent>
        </Card>
      </div>

      <AnimatePresence>
        {showForm && (
          <EvaluationForm
            players={filteredPlayers}
            coachName={user.full_name}
            coachEmail={user.email}
            category={selectedCategory}
            onSubmit={handleSubmit}
            onCancel={() => setShowForm(false)}
            isSubmitting={createEvaluationMutation.isPending}
          />
        )}
      </AnimatePresence>

      {filteredEvaluations.length === 0 ? (
        <Card className="border-none shadow-lg">
          <CardContent className="p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <p className="text-slate-500 mb-4">No hay evaluaciones registradas</p>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-orange-600 hover:bg-orange-700"
              disabled={!selectedCategory || selectedCategory === "all"}
            >
              <Plus className="w-4 h-4 mr-2" />
              Crear Primera Evaluación
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnimatePresence>
            {filteredEvaluations.map((evaluation) => (
              <EvaluationCard key={evaluation.id} evaluation={evaluation} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
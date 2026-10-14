import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, Filter, Clock, Users, Zap, Star, Sparkles, Dumbbell, Target, ChevronDown, ChevronUp, Heart, BookOpen } from "lucide-react";
import { toast } from "sonner";

import ExerciseCard from "../components/exercises/ExerciseCard";
import ExerciseForm from "../components/exercises/ExerciseForm";
import AITrainingPlanner from "../components/exercises/AITrainingPlanner";
import AIExerciseGenerator from "../components/exercises/AIExerciseGenerator";
import ExerciseVariantGenerator from "../components/exercises/ExerciseVariantGenerator";

export default function ExerciseLibrary() {
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sportFilter, setSportFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [intensityFilter, setIntensityFilter] = useState("all");
  const [durationFilter, setDurationFilter] = useState("all");
  const [playersFilter, setPlayersFilter] = useState("all");
  const [equipmentFilter, setEquipmentFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);
  const [showAIPlanner, setShowAIPlanner] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [variantExercise, setVariantExercise] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  const { data: exercises, isLoading } = useQuery({
    queryKey: ['exercises'],
    queryFn: () => base44.entities.Exercise.list('-created_date'),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Exercise.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      setShowForm(false);
      toast.success("Ejercicio creado correctamente");
    },
  });

  const createVariantMutation = useMutation({
    mutationFn: (data) => base44.entities.Exercise.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      setVariantExercise(null);
      toast.success("Variante guardada en la biblioteca");
    },
    onError: (error) => {
      console.error("Error guardando variante:", error);
      toast.error("No se ha podido guardar la variante");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Exercise.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      setShowForm(false);
      setEditingExercise(null);
      toast.success("Ejercicio actualizado");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Exercise.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      toast.success("Ejercicio eliminado");
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: ({ id, favorito }) => base44.entities.Exercise.update(id, { favorito }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
    },
  });

  const filteredExercises = exercises.filter(ex => {
    const matchesSearch = ex.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          ex.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSport = sportFilter === "all" || ex.deporte === sportFilter;
    const matchesCategory = categoryFilter === "all" || ex.categoria_ejercicio === categoryFilter;
    const matchesIntensity = intensityFilter === "all" || ex.intensidad === intensityFilter;
    
    // Filtro de duración
    let matchesDuration = true;
    if (durationFilter !== "all") {
      const duration = ex.duracion_minutos || 0;
      if (durationFilter === "short") matchesDuration = duration < 10;
      else if (durationFilter === "medium") matchesDuration = duration >= 10 && duration <= 20;
      else if (durationFilter === "long") matchesDuration = duration > 20;
    }
    
    // Filtro de jugadores
    let matchesPlayers = true;
    if (playersFilter !== "all") {
      const jugadores = ex.jugadores_necesarios?.toLowerCase() || "";
      if (playersFilter === "1x1") matchesPlayers = jugadores.includes("1x1") || jugadores.includes("parejas");
      else if (playersFilter === "small") matchesPlayers = jugadores.includes("3x3") || jugadores.includes("4x4") || jugadores.includes("5x5") || jugadores.includes("6 jugadores");
      else if (playersFilter === "medium") matchesPlayers = jugadores.includes("7x7") || jugadores.includes("8x8") || jugadores.includes("10x10") || jugadores.includes("12") || jugadores.includes("14");
      else if (playersFilter === "full") matchesPlayers = jugadores.includes("11x11") || jugadores.includes("22");
    }
    
    // Filtro de equipamiento
    let matchesEquipment = true;
    if (equipmentFilter !== "all") {
      const material = ex.material_necesario?.toLowerCase() || "";
      if (equipmentFilter === "conos") matchesEquipment = material.includes("cono");
      else if (equipmentFilter === "vallas") matchesEquipment = material.includes("valla") || material.includes("vaya");
      else if (equipmentFilter === "porterias") matchesEquipment = material.includes("porter");
      else if (equipmentFilter === "aros") matchesEquipment = material.includes("aro");
      else if (equipmentFilter === "picas") matchesEquipment = material.includes("pica");
      else if (equipmentFilter === "minimal") matchesEquipment = material.includes("balones") || material.includes("bal\u00f3n");
    }
    
    return matchesSearch && matchesSport && matchesCategory && matchesIntensity && matchesDuration && matchesPlayers && matchesEquipment;
  });

  const favoriteExercises = filteredExercises.filter(ex => ex.favorito);
  const categories = [...new Set(exercises.map(ex => ex.categoria_ejercicio).filter(Boolean))];

  const stats = {
    total: exercises.length,
    futbol: exercises.filter(ex => ex.deporte === "Fútbol").length,
    baloncesto: exercises.filter(ex => ex.deporte === "Baloncesto").length,
    favoritos: exercises.filter(ex => ex.favorito).length,
  };

  const isCoachOrAdmin = user?.role === "admin" || user?.es_entrenador || user?.es_coordinador;

  return (
    <div className="mx-auto box-border w-full min-w-0 max-w-[1600px] space-y-5 overflow-x-hidden px-3 pb-24 pt-4 sm:space-y-6 sm:px-5 lg:px-8 lg:pt-7 [&_*]:min-w-0">
      <header className="relative isolate flex min-w-0 flex-col gap-4 overflow-hidden rounded-3xl border border-orange-500/20 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-lg sm:p-7 md:flex-row md:items-center md:justify-between">
        <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="relative min-w-0">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-orange-300">Entrenadores · Recursos</p>
          <h1 className="flex items-center gap-2 break-words text-2xl font-bold tracking-tight text-white sm:text-3xl"><BookOpen className="h-7 w-7 shrink-0 text-orange-400" />Biblioteca de ejercicios</h1>
          <p className="mt-2 text-sm text-slate-300 sm:text-base">{stats.total} ejercicios disponibles · {stats.futbol} fútbol · {stats.baloncesto} baloncesto</p>
        </div>
        <div className="relative z-10 grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 md:w-auto md:min-w-[440px] md:grid-cols-1 lg:grid-cols-3">
          <Button onClick={() => setShowAIPlanner(true)} className="h-11 w-full justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 text-sm font-semibold text-white shadow-md hover:from-purple-700 hover:to-indigo-700">
            <Sparkles className="h-4 w-4 shrink-0" /> Planificar con IA
          </Button>
          {isCoachOrAdmin && (
            <>
              <Button onClick={() => setShowAIGenerator(true)} className="h-11 w-full justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 text-sm font-semibold text-white shadow-md hover:from-cyan-700 hover:to-blue-700">
                <Sparkles className="h-4 w-4 shrink-0" /> Crear con IA
              </Button>
              <Button onClick={() => { setEditingExercise(null); setShowForm(true); }} className="h-11 w-full justify-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-semibold text-white shadow-md hover:bg-orange-700">
                <Plus className="h-4 w-4 shrink-0" /> Nuevo ejercicio
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-orange-700">Total</p>
                <p className="text-2xl font-bold text-orange-600">{stats.total}</p>
              </div>
              <Dumbbell className="w-8 h-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-700">Fútbol ⚽</p>
                <p className="text-2xl font-bold text-green-600">{stats.futbol}</p>
              </div>
              <Target className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-amber-100">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-700">Baloncesto 🏀</p>
                <p className="text-2xl font-bold text-amber-600">{stats.baloncesto}</p>
              </div>
              <Target className="w-8 h-8 text-amber-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-lg bg-gradient-to-br from-pink-50 to-pink-100">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-pink-700">Favoritos ❤️</p>
                <p className="text-2xl font-bold text-pink-600">{stats.favoritos}</p>
              </div>
              <Heart className="w-8 h-8 text-pink-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="border-none shadow-lg">
        <CardContent className="pt-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar ejercicios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="w-4 h-4" />
              Filtros
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>

          {showFilters && (
            <div className="space-y-3 pt-2 border-t">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Select value={sportFilter} onValueChange={setSportFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Deporte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los deportes</SelectItem>
                    <SelectItem value="Fútbol">⚽ Fútbol</SelectItem>
                    <SelectItem value="Baloncesto">🏀 Baloncesto</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={intensityFilter} onValueChange={setIntensityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Intensidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las intensidades</SelectItem>
                    <SelectItem value="Baja">🟢 Baja</SelectItem>
                    <SelectItem value="Media">🟡 Media</SelectItem>
                    <SelectItem value="Alta">🟠 Alta</SelectItem>
                    <SelectItem value="Muy Alta">🔴 Muy Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Select value={durationFilter} onValueChange={setDurationFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Duración" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las duraciones</SelectItem>
                    <SelectItem value="short">⏱️ Corta (&lt;10 min)</SelectItem>
                    <SelectItem value="medium">⏱️ Media (10-20 min)</SelectItem>
                    <SelectItem value="long">⏱️ Larga (&gt;20 min)</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={playersFilter} onValueChange={setPlayersFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Nº Jugadores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los formatos</SelectItem>
                    <SelectItem value="1x1">👤 1x1 / Parejas</SelectItem>
                    <SelectItem value="small">👥 Reducido (3x3 a 6x6)</SelectItem>
                    <SelectItem value="medium">👥👥 Medio (7x7 a 10x10)</SelectItem>
                    <SelectItem value="full">👥👥👥 Partido (11x11)</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={equipmentFilter} onValueChange={setEquipmentFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Equipamiento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todo equipamiento</SelectItem>
                    <SelectItem value="minimal">⚽ Mínimo (solo balones)</SelectItem>
                    <SelectItem value="conos">🔶 Conos</SelectItem>
                    <SelectItem value="vallas">🚧 Vallas/Obstáculos</SelectItem>
                    <SelectItem value="porterias">🥅 Porterías</SelectItem>
                    <SelectItem value="aros">⭕ Aros</SelectItem>
                    <SelectItem value="picas">📏 Picas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-100/90 p-2 shadow-sm sm:grid-cols-3 lg:grid-cols-5">
          <TabsTrigger value="all" className="min-h-10 rounded-xl px-3 py-2 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-orange-700 data-[state=active]:shadow-sm">
            Todos <span className="ml-1 text-xs opacity-75">({filteredExercises.length})</span>
          </TabsTrigger>
          <TabsTrigger value="favorites" className="min-h-10 rounded-xl px-3 py-2 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-orange-700 data-[state=active]:shadow-sm">
            ❤️ Favoritos <span className="ml-1 text-xs opacity-75">({favoriteExercises.length})</span>
          </TabsTrigger>
          <TabsTrigger value="capacidad" className="min-h-10 rounded-xl px-3 py-2 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-orange-700 data-[state=active]:shadow-sm">
            Capacidad
          </TabsTrigger>
          <TabsTrigger value="potencia" className="min-h-10 rounded-xl px-3 py-2 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-orange-700 data-[state=active]:shadow-sm">
            Potencia
          </TabsTrigger>
          <TabsTrigger value="tecnica" className="min-h-10 rounded-xl px-3 py-2 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-orange-700 data-[state=active]:shadow-sm">
            Técnica
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <ExerciseGrid
            exercises={filteredExercises}
            isLoading={isLoading}
            onEdit={(ex) => { setEditingExercise(ex); setShowForm(true); }}
            onDelete={(id) => deleteMutation.mutate(id)}
            onToggleFavorite={(id, fav) => toggleFavoriteMutation.mutate({ id, favorito: fav })}
            isCoachOrAdmin={isCoachOrAdmin}
            onCreateVariant={(exercise) => setVariantExercise(exercise)}
          />
        </TabsContent>

        <TabsContent value="favorites" className="mt-4">
          <ExerciseGrid
            exercises={favoriteExercises}
            isLoading={isLoading}
            onEdit={(ex) => { setEditingExercise(ex); setShowForm(true); }}
            onDelete={(id) => deleteMutation.mutate(id)}
            onToggleFavorite={(id, fav) => toggleFavoriteMutation.mutate({ id, favorito: fav })}
            isCoachOrAdmin={isCoachOrAdmin}
            onCreateVariant={(exercise) => setVariantExercise(exercise)}
          />
        </TabsContent>

        <TabsContent value="capacidad" className="mt-4">
          <ExerciseGrid
            exercises={filteredExercises.filter(ex => ex.categoria_ejercicio?.includes("Capacidad"))}
            isLoading={isLoading}
            onEdit={(ex) => { setEditingExercise(ex); setShowForm(true); }}
            onDelete={(id) => deleteMutation.mutate(id)}
            onToggleFavorite={(id, fav) => toggleFavoriteMutation.mutate({ id, favorito: fav })}
            isCoachOrAdmin={isCoachOrAdmin}
            onCreateVariant={(exercise) => setVariantExercise(exercise)}
          />
        </TabsContent>

        <TabsContent value="potencia" className="mt-4">
          <ExerciseGrid
            exercises={filteredExercises.filter(ex => ex.categoria_ejercicio?.includes("Potencia"))}
            isLoading={isLoading}
            onEdit={(ex) => { setEditingExercise(ex); setShowForm(true); }}
            onDelete={(id) => deleteMutation.mutate(id)}
            onToggleFavorite={(id, fav) => toggleFavoriteMutation.mutate({ id, favorito: fav })}
            isCoachOrAdmin={isCoachOrAdmin}
            onCreateVariant={(exercise) => setVariantExercise(exercise)}
          />
        </TabsContent>

        <TabsContent value="tecnica" className="mt-4">
          <ExerciseGrid
            exercises={filteredExercises.filter(ex => ex.categoria_ejercicio?.includes("Técnica"))}
            isLoading={isLoading}
            onEdit={(ex) => { setEditingExercise(ex); setShowForm(true); }}
            onDelete={(id) => deleteMutation.mutate(id)}
            onToggleFavorite={(id, fav) => toggleFavoriteMutation.mutate({ id, favorito: fav })}
            isCoachOrAdmin={isCoachOrAdmin}
            onCreateVariant={(exercise) => setVariantExercise(exercise)}
          />
        </TabsContent>
      </Tabs>

      {/* Exercise Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingExercise ? "Editar Ejercicio" : "Nuevo Ejercicio"}
            </DialogTitle>
          </DialogHeader>
          <ExerciseForm
            exercise={editingExercise}
            onSubmit={(data) => {
              if (editingExercise) {
                updateMutation.mutate({ id: editingExercise.id, data });
              } else {
                createMutation.mutate(data);
              }
            }}
            onCancel={() => { setShowForm(false); setEditingExercise(null); }}
            isSubmitting={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* AI exercise variant dialog: saves into the existing exercise library */}
      <Dialog open={Boolean(variantExercise)} onOpenChange={(open) => { if (!open && !createVariantMutation.isPending) setVariantExercise(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-orange-600" />
              Crear una variante del ejercicio
            </DialogTitle>
          </DialogHeader>
          {variantExercise && (
            <ExerciseVariantGenerator
              exercise={variantExercise}
              existingExercises={exercises}
              isSaving={createVariantMutation.isPending}
              onSave={(data) => createVariantMutation.mutate(data)}
              onCancel={() => setVariantExercise(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* AI Planner Dialog */}
      <Dialog open={showAIPlanner} onOpenChange={setShowAIPlanner}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Planificador de Entrenamientos con IA
            </DialogTitle>
          </DialogHeader>
          <AITrainingPlanner
            exercises={exercises}
            onClose={() => setShowAIPlanner(false)}
          />
        </DialogContent>
      </Dialog>

      {/* AI Exercise Generator Dialog */}
      <Dialog open={showAIGenerator} onOpenChange={setShowAIGenerator}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-600" />
              Crear Ejercicio con IA
            </DialogTitle>
          </DialogHeader>
          <AIExerciseGenerator
            onExerciseGenerated={(exerciseData) => {
              createMutation.mutate(exerciseData);
              setShowAIGenerator(false);
            }}
            onCancel={() => setShowAIGenerator(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ExerciseGrid({ exercises, isLoading, onEdit, onDelete, onToggleFavorite, isCoachOrAdmin }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-4"></div>
              <div className="h-3 bg-slate-200 rounded w-full mb-2"></div>
              <div className="h-3 bg-slate-200 rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (exercises.length === 0) {
    return (
      <Card className="border-none shadow-lg">
        <CardContent className="py-12 text-center">
          <Dumbbell className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-lg">No hay ejercicios disponibles</p>
          <p className="text-slate-400 text-sm mt-1">
            Añade nuevos ejercicios o cambia los filtros
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {exercises.map(exercise => (
        <ExerciseCard
          key={exercise.id}
          exercise={exercise}
          onEdit={() => onEdit(exercise)}
          onDelete={() => onDelete(exercise.id)}
          onToggleFavorite={() => onToggleFavorite(exercise.id, !exercise.favorito)}
          canEdit={isCoachOrAdmin}
        />
      ))}
    </div>
  );
}
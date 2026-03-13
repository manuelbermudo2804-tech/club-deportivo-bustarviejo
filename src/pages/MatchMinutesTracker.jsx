import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Timer, Edit2, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import MatchMinutesForm from "../components/minutes/MatchMinutesForm";
import SeasonMinutesStats from "../components/minutes/SeasonMinutesStats";
import { useActiveSeason } from "../components/season/SeasonProvider";

export default function MatchMinutesTracker() {
  const [user, setUser] = useState(null);
  const [coachCategories, setCoachCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [editingCallupId, setEditingCallupId] = useState(null);
  const queryClient = useQueryClient();
  const { activeSeason } = useActiveSeason();

  useEffect(() => {
    const fetchUser = async () => {
      const u = await base44.auth.me();
      setUser(u);
      if (!u.es_entrenador && !u.es_coordinador && u.role !== "admin") return;

      let cats = u.categorias_entrena || [];
      if (u.role === "admin" && cats.length === 0) {
        try {
          const cfgs = await base44.entities.CategoryConfig.filter({ activa: true });
          cats = [...new Set(cfgs.map(c => c.nombre).filter(Boolean))];
        } catch {}
      }
      setCoachCategories(cats);
      if (cats.length === 1) setSelectedCategory(cats[0]);
    };
    fetchUser();
  }, []);

  // Season range
  const getSeasonRange = (s) => {
    if (!s || !s.includes('/')) return { start: new Date(2000, 0, 1), end: new Date(2999, 11, 31) };
    const [y1, y2] = s.split('/').map(n => parseInt(n, 10));
    return { start: new Date(y1, 8, 1), end: new Date(y2, 7, 31) };
  };
  const { start: seasonStart, end: seasonEnd } = getSeasonRange(activeSeason);

  // Fetch closed callups (partidos ya jugados)
  const { data: allCallups = [] } = useQuery({
    queryKey: ['convocatorias-minutes'],
    queryFn: () => base44.entities.Convocatoria.list('-fecha_partido'),
  });

  const { data: allMinutes = [] } = useQuery({
    queryKey: ['match-minutes'],
    queryFn: () => base44.entities.MatchMinutes.list('-fecha_partido'),
  });

  // Filter callups: closed, in season, in selected category
  const closedCallups = allCallups.filter(c => {
    if (!c.cerrada) return false;
    const d = new Date(c.fecha_partido);
    if (isNaN(d) || d < seasonStart || d > seasonEnd) return false;
    if (selectedCategory && selectedCategory !== "all") return c.categoria === selectedCategory;
    if (user?.role === "admin") return true;
    return coachCategories.includes(c.categoria);
  });

  // Filter minutes records for selected category
  const categoryMinutes = allMinutes.filter(r => {
    if (selectedCategory && selectedCategory !== "all") return r.categoria === selectedCategory;
    if (user?.role === "admin") return true;
    return coachCategories.includes(r.categoria);
  });

  const minutesByCallup = {};
  allMinutes.forEach(r => { minutesByCallup[r.convocatoria_id] = r; });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const existing = minutesByCallup[data.convocatoria_id];
      if (existing) {
        return base44.entities.MatchMinutes.update(existing.id, { ...data, entrenador_email: user.email });
      }
      return base44.entities.MatchMinutes.create({ ...data, entrenador_email: user.email });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['match-minutes'] });
      setEditingCallupId(null);
      toast.success("Minutos guardados correctamente");
    },
  });

  if (!user || (!user.es_entrenador && !user.es_coordinador && user.role !== "admin")) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-900 mb-2">Acceso Restringido</h2>
            <p className="text-red-700">Solo los entrenadores pueden acceder a esta sección</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Timer className="w-5 h-5 text-white" />
          </div>
          <div className="text-white">
            <h1 className="text-xl lg:text-2xl font-bold">Minutos de Juego</h1>
            <p className="text-blue-100 text-xs">Registra y consulta los minutos jugados por cada jugador</p>
          </div>
        </div>
      </div>

      {/* Category selector */}
      {coachCategories.length > 0 && (
        <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white text-lg shadow">⚽</div>
              <div className="flex-1">
                <label className="text-sm font-semibold text-blue-900 mb-1.5 block">Categoría:</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="bg-white border-blue-200">
                    <SelectValue placeholder="Selecciona categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {coachCategories.length > 1 && <SelectItem value="all">📊 Todas las categorías</SelectItem>}
                    {coachCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {cat.includes("Fútbol") ? "⚽" : "🏀"} {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedCategory ? (
        <div className="text-center py-12 bg-white rounded-xl shadow">
          <Timer className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500">Selecciona una categoría para empezar</p>
        </div>
      ) : (
        <>
          {/* Estadísticas acumuladas */}
          <SeasonMinutesStats records={categoryMinutes} />

          {/* Lista de partidos cerrados */}
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Partidos ({closedCallups.length})
          </h2>

          {closedCallups.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-xl shadow">
              <p className="text-slate-500">No hay partidos cerrados en esta categoría</p>
              <p className="text-sm text-slate-400 mt-1">Los partidos aparecen aquí cuando se cierra la convocatoria</p>
            </div>
          ) : (
            <div className="space-y-4">
              {closedCallups.map(callup => {
                const record = minutesByCallup[callup.id];
                const isEditing = editingCallupId === callup.id;

                if (isEditing) {
                  return (
                    <MatchMinutesForm
                      key={callup.id}
                      callup={callup}
                      existingRecord={record}
                      onSave={(data) => saveMutation.mutate(data)}
                      onCancel={() => setEditingCallupId(null)}
                      isSaving={saveMutation.isPending}
                    />
                  );
                }

                return (
                  <Card key={callup.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">
                              {callup.rival ? `vs ${callup.rival}` : callup.titulo}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {callup.categoria}
                            </Badge>
                            {record && (
                              <Badge className="bg-green-100 text-green-700 text-xs">
                                <Check className="w-3 h-3 mr-1" /> Registrado
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            {format(new Date(callup.fecha_partido), "EEEE d 'de' MMMM yyyy", { locale: es })}
                            {callup.local_visitante ? ` · ${callup.local_visitante}` : ''}
                          </p>
                          {record && (
                            <p className="text-xs text-blue-600 mt-1">
                              {record.minutos_jugadores.filter(j => j.minutos > 0).length} jugadores · {record.minutos_jugadores.reduce((s, j) => s + (j.minutos || 0), 0)}' totales
                            </p>
                          )}
                        </div>
                        <Button
                          variant={record ? "outline" : "default"}
                          size="sm"
                          onClick={() => setEditingCallupId(callup.id)}
                          className={!record ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
                        >
                          {record ? <><Edit2 className="w-3 h-3 mr-1" /> Editar</> : <><Clock className="w-3 h-3 mr-1" /> Registrar</>}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
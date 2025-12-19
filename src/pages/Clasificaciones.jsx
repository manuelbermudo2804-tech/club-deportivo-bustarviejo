import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, BarChart3, Eye, Trash2, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

import UploadStandingsForm from "../components/standings/UploadStandingsForm";
import ReviewStandingsTable from "../components/standings/ReviewStandingsTable";
import StandingsDisplay from "../components/standings/StandingsDisplay";

const CATEGORIES = [
  { id: "prebenjamin", name: "Pre-Benjamín", fullName: "Fútbol Pre-Benjamín (Mixto)" },
  { id: "benjamin", name: "Benjamín", fullName: "Fútbol Benjamín (Mixto)" },
  { id: "alevin", name: "Alevín", fullName: "Fútbol Alevín (Mixto)" },
  { id: "infantil", name: "Infantil", fullName: "Fútbol Infantil (Mixto)" },
  { id: "cadete", name: "Cadete", fullName: "Fútbol Cadete" },
  { id: "juvenil", name: "Juvenil", fullName: "Fútbol Juvenil" },
  { id: "aficionado", name: "Aficionado", fullName: "Fútbol Aficionado" },
  { id: "femenino", name: "Femenino", fullName: "Fútbol Femenino" },
  { id: "baloncesto", name: "Baloncesto", fullName: "Baloncesto (Mixto)" }
];

export default function Clasificaciones() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [reviewData, setReviewData] = useState(null);
  const [selectedView, setSelectedView] = useState(null);
  const [userCategories, setUserCategories] = useState([]);
  const [activeTab, setActiveTab] = useState("prebenjamin");

  const queryClient = useQueryClient();

  React.useEffect(() => {
    const checkAdmin = async () => {
      const user = await base44.auth.me();
      setIsAdmin(user.role === "admin");

      // Si no es admin, obtener categorías de sus jugadores
      if (user.role !== "admin") {
        const allPlayers = await base44.entities.Player.list();
        const myPlayers = allPlayers.filter(p => 
          p.email_padre === user.email || 
          p.email_tutor_2 === user.email ||
          (p.email_jugador === user.email && p.acceso_jugador_autorizado)
        );
        const categories = [...new Set(myPlayers.map(p => p.deporte).filter(Boolean))];
        setUserCategories(categories);
      }
    };
    checkAdmin();
  }, []);

  const { data: standings } = useQuery({
    queryKey: ['clasificaciones'],
    queryFn: () => base44.entities.Clasificacion.list('-jornada'),
    initialData: [],
  });

  const saveStandingsMutation = useMutation({
    mutationFn: async (data) => {
      const { temporada, categoria, jornada, standings } = data;
      
      // Borrar clasificaciones anteriores de la misma jornada
      const existing = await base44.entities.Clasificacion.filter({ 
        temporada, 
        categoria, 
        jornada 
      });
      
      for (const record of existing) {
        await base44.entities.Clasificacion.delete(record.id);
      }
      
      // Guardar nuevas clasificaciones
      const recordsToCreate = standings.map(s => ({
        temporada,
        categoria,
        jornada,
        posicion: s.posicion,
        nombre_equipo: s.nombre_equipo,
        puntos: s.puntos,
        partidos_jugados: s.partidos_jugados,
        ganados: s.ganados,
        empatados: s.empatados,
        perdidos: s.perdidos,
        goles_favor: s.goles_favor,
        goles_contra: s.goles_contra,
        fecha_actualizacion: new Date().toISOString()
      }));
      
      await base44.entities.Clasificacion.bulkCreate(recordsToCreate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clasificaciones'] });
      setReviewData(null);
      setShowUploadForm(false);
      setSelectedCategory(null);
      toast.success("✅ Clasificación guardada correctamente");
    },
    onError: (error) => {
      toast.error("Error al guardar la clasificación");
      console.error(error);
    }
  });

  const deleteStandingsMutation = useMutation({
    mutationFn: async ({ temporada, categoria, jornada }) => {
      const toDelete = await base44.entities.Clasificacion.filter({ 
        temporada, 
        categoria, 
        jornada 
      });
      
      for (const record of toDelete) {
        await base44.entities.Clasificacion.delete(record.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clasificaciones'] });
      toast.success("Clasificación eliminada");
    }
  });

  const handleConfirmStandings = (data) => {
    saveStandingsMutation.mutate(data);
  };

  const handleNewUpload = (categoryFullName, prefillData = null) => {
    setSelectedCategory(categoryFullName);
    setReviewData(null);
    setShowUploadForm(true);
    
    // Si hay datos pre-rellenados, pasarlos al formulario
    if (prefillData) {
      setReviewData({ ...prefillData, isPrefilled: true });
    }
  };

  // Agrupar clasificaciones por categoría
  const standingsByCategory = CATEGORIES.reduce((acc, cat) => {
    const categoryStandings = standings.filter(s => s.categoria === cat.fullName);
    
    // Agrupar por temporada/jornada dentro de cada categoría
    const grouped = categoryStandings.reduce((groupAcc, standing) => {
      const key = `${standing.temporada}|${standing.jornada}`;
      if (!groupAcc[key]) {
        groupAcc[key] = {
          temporada: standing.temporada,
          categoria: standing.categoria,
          jornada: standing.jornada,
          fecha_actualizacion: standing.fecha_actualizacion,
          data: []
        };
      }
      groupAcc[key].data.push(standing);
      return groupAcc;
    }, {});

    acc[cat.id] = Object.values(grouped).sort((a, b) => 
      new Date(b.fecha_actualizacion) - new Date(a.fecha_actualizacion)
    );
    
    return acc;
  }, {});

  // Filtrar categorías según permisos de usuario
  const visibleCategories = isAdmin 
    ? CATEGORIES 
    : CATEGORIES.filter(cat => userCategories.includes(cat.fullName));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
          <BarChart3 className="w-8 h-8 text-orange-600" />
          Clasificaciones
        </h1>
        <p className="text-slate-600 mt-1">Gestión de clasificaciones por equipos</p>
      </div>

      {showUploadForm && (
        <UploadStandingsForm
          onDataExtracted={(data) => {
            setReviewData(data);
            setShowUploadForm(false);
          }}
          onCancel={() => {
            setShowUploadForm(false);
            setSelectedCategory(null);
            setReviewData(null);
          }}
          preselectedCategory={selectedCategory}
          prefillData={reviewData?.isPrefilled ? reviewData : null}
        />
      )}

      {reviewData && !reviewData.isPrefilled && (
        <ReviewStandingsTable
          data={reviewData}
          onConfirm={handleConfirmStandings}
          onCancel={() => {
            setReviewData(null);
            setSelectedCategory(null);
          }}
          isSubmitting={saveStandingsMutation.isPending}
        />
      )}

      {!showUploadForm && !reviewData && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2 h-auto bg-white p-2 rounded-xl shadow-sm mb-6">
            {visibleCategories.map((cat) => (
              <TabsTrigger
                key={cat.id}
                value={cat.id}
                className="data-[state=active]:bg-orange-600 data-[state=active]:text-white rounded-lg py-3"
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="font-semibold text-sm">{cat.name}</span>
                  {standingsByCategory[cat.id]?.length > 0 && (
                    <Badge className="bg-green-500 text-white text-xs">
                      {standingsByCategory[cat.id].length}
                    </Badge>
                  )}
                </div>
              </TabsTrigger>
            ))}
          </TabsList>

          {visibleCategories.map((cat) => (
            <TabsContent key={cat.id} value={cat.id} className="space-y-6">
              {/* Header con botón de subir */}
              <Card className="border-2 border-orange-500 bg-gradient-to-r from-orange-50 to-orange-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-orange-700">{cat.name}</h2>
                      <p className="text-slate-600 mt-1">
                        {standingsByCategory[cat.id]?.length || 0} clasificaciones guardadas
                      </p>
                    </div>
                    {isAdmin && (
                      <Button
                        onClick={() => handleNewUpload(cat.fullName)}
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Subir Nueva
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Lista de clasificaciones */}
              {standingsByCategory[cat.id]?.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {standingsByCategory[cat.id].map((group, index) => (
                    <Card key={index} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span className="text-lg">Jornada {group.jornada}</span>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm("¿Eliminar esta clasificación?")) {
                                  deleteStandingsMutation.mutate({
                                    temporada: group.temporada,
                                    categoria: group.categoria,
                                    jornada: group.jornada
                                  });
                                }
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </CardTitle>
                        <div className="text-sm text-slate-600 space-y-1">
                          <p>Temporada: {group.temporada}</p>
                          <p className="text-xs">Actualizado: {new Date(group.fecha_actualizacion).toLocaleDateString('es-ES')}</p>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <Button
                          onClick={() => setSelectedView(group)}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Clasificación
                        </Button>
                        {isAdmin && index === 0 && (
                          <Button
                            onClick={() => handleNewUpload(cat.fullName, {
                              temporada: group.temporada,
                              categoria: group.categoria,
                              jornada: group.jornada + 1
                            })}
                            variant="outline"
                            className="w-full border-orange-500 text-orange-600 hover:bg-orange-50"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Actualizar Jornada {group.jornada + 1}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-2 border-dashed border-slate-300">
                  <CardContent className="p-12 text-center">
                    <p className="text-slate-500 text-lg mb-4">
                      No hay clasificaciones para {cat.name} todavía
                    </p>
                    {isAdmin && (
                      <Button
                        onClick={() => handleNewUpload(cat.fullName)}
                        variant="outline"
                        className="border-orange-500 text-orange-600 hover:bg-orange-50"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Subir Primera Clasificación
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}

      {selectedView && (
        <StandingsDisplay
          data={selectedView}
          onClose={() => setSelectedView(null)}
        />
      )}
    </div>
  );
}
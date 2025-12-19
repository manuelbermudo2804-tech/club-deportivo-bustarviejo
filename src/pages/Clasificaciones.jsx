import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Upload, BarChart3, Eye, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

import UploadStandingsForm from "../components/standings/UploadStandingsForm";
import ReviewStandingsTable from "../components/standings/ReviewStandingsTable";
import StandingsDisplay from "../components/standings/StandingsDisplay";

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-8 h-8 text-orange-600" />
            Clasificaciones
          </h1>
          <p className="text-slate-600 mt-1">Gestión de clasificaciones por equipos</p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => {
              setShowUploadForm(!showUploadForm);
              setReviewData(null);
            }}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Upload className="w-5 h-5 mr-2" />
            Subir Clasificación
          </Button>
        )}
      </div>

      {showUploadForm && isAdmin && (
        <UploadStandingsForm
          onDataExtracted={(data) => {
            setReviewData(data);
            setShowUploadForm(false);
          }}
          onCancel={() => setShowUploadForm(false)}
        />
      )}

      {reviewData && isAdmin && (
        <ReviewStandingsTable
          data={reviewData}
          onConfirm={handleConfirmStandings}
          onCancel={() => setReviewData(null)}
          isSubmitting={saveStandingsMutation.isPending}
        />
      )}

      {!showUploadForm && !reviewData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {standingsList.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white rounded-xl shadow-lg">
              <BarChart3 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg">No hay clasificaciones disponibles</p>
              {isAdmin && (
                <p className="text-slate-400 text-sm mt-2">
                  Sube la primera imagen de clasificación para empezar
                </p>
              )}
            </div>
          ) : (
            standingsList.map((group, idx) => (
              <Card key={idx} className="hover:shadow-xl transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>{group.categoria}</span>
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
                  <div className="text-xs text-slate-500 space-y-1">
                    <p>Temporada: {group.temporada}</p>
                    <p>Jornada: {group.jornada}</p>
                    <p>Actualizado: {new Date(group.fecha_actualizacion).toLocaleDateString('es-ES')}</p>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => setSelectedView(group)}
                    variant="outline"
                    className="w-full"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Ver Clasificación
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
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
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, MessageCircle } from "lucide-react";
import { AnimatePresence } from "framer-motion";

import SurveyForm from "../components/surveys/SurveyForm";
import SurveyCard from "../components/surveys/SurveyCard";
import SurveyResults from "../components/surveys/SurveyResults";
import { toast } from "sonner";

export default function Surveys() {
  const [showForm, setShowForm] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState(null);
  const [viewingResults, setViewingResults] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState(null);
  const [myPlayersSports, setMyPlayersSports] = useState([]);

  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAdmin = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAdmin(currentUser.role === "admin");

      if (currentUser.role !== "admin") {
        const allPlayers = await base44.entities.Player.list();
        const sports = new Set();

        // Padres / tutores
        const myPlayers = allPlayers.filter(p =>
          p.email_padre === currentUser.email ||
          p.email_tutor_2 === currentUser.email ||
          p.email_jugador === currentUser.email
        );
        myPlayers.forEach(p => {
          if (p.deporte) sports.add(p.deporte);
          if (Array.isArray(p.categorias)) p.categorias.forEach(c => c && sports.add(c));
          if (p.categoria_principal) sports.add(p.categoria_principal);
        });

        // Entrenadores / coordinadores: incluir las categorías que entrenan
        if (Array.isArray(currentUser.categorias_entrena)) {
          currentUser.categorias_entrena.forEach(c => c && sports.add(c));
        }

        setMyPlayersSports([...sports]);
      }
    };
    checkAdmin();
  }, []);

  const { data: surveys } = useQuery({
    queryKey: ['surveys'],
    queryFn: () => base44.entities.Survey.list('-created_date'),
    initialData: [],
  });

  const createSurveyMutation = useMutation({
    mutationFn: async (surveyData) => {
      const newSurvey = await base44.entities.Survey.create(surveyData);
      // Notificación push automática a destinatarios (best-effort)
      try {
        await base44.functions.invoke('notifySurveyCreated', { survey_id: newSurvey.id });
      } catch (err) {
        console.warn('No se pudo enviar push de encuesta:', err);
      }
      return newSurvey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      setShowForm(false);
      setEditingSurvey(null);
      toast.success("📋 Encuesta creada y notificada a los destinatarios");
    },
  });

  const updateSurveyMutation = useMutation({
    mutationFn: ({ id, surveyData }) => base44.entities.Survey.update(id, surveyData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      setShowForm(false);
      setEditingSurvey(null);
    },
  });

  const handleSubmit = (surveyData) => {
    if (editingSurvey) {
      updateSurveyMutation.mutate({ id: editingSurvey.id, surveyData });
    } else {
      createSurveyMutation.mutate(surveyData);
    }
  };

  // Filtrar encuestas según el rol
  const filteredSurveys = isAdmin 
    ? surveys 
    : surveys.filter(s => {
        // Encuesta debe estar activa y no vencida
        if (!s.activa || new Date(s.fecha_fin) < new Date()) return false;
        
        // Si es para "Todos", mostrar
        if (s.destinatarios === "Todos") return true;
        
        // Si es para un deporte específico, ver si el padre/entrenador tiene jugadores en ese deporte
        return myPlayersSports.includes(s.destinatarios);
      });

  const activeSurveys = filteredSurveys.filter(s => s.activa && new Date(s.fecha_fin) >= new Date());
  const closedSurveys = filteredSurveys.filter(s => !s.activa || new Date(s.fecha_fin) < new Date());

  if (viewingResults) {
    return <SurveyResults survey={viewingResults} onBack={() => setViewingResults(null)} />;
  }

  return (
    <div className="p-4 lg:p-8 space-y-4 lg:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 lg:gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <MessageCircle className="w-6 h-6 lg:w-8 lg:h-8 text-orange-600" />
            Encuestas y Feedback
          </h1>
          <p className="text-slate-600 mt-1 text-sm lg:text-base">
            {isAdmin ? "Gestiona encuestas y consulta resultados" : "Participa en las encuestas del club"}
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => {
              setEditingSurvey(null);
              setShowForm(!showForm);
            }}
            className="bg-orange-600 hover:bg-orange-700 w-full md:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Encuesta
          </Button>
        )}
      </div>

      <AnimatePresence>
        {showForm && isAdmin && (
          <SurveyForm
            survey={editingSurvey}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingSurvey(null);
            }}
            isSubmitting={createSurveyMutation.isPending || updateSurveyMutation.isPending}
          />
        )}
      </AnimatePresence>

      <div className="space-y-4 lg:space-y-6">
        {activeSurveys.length > 0 && (
          <div>
            <h2 className="text-lg lg:text-xl font-bold text-slate-900 mb-3 lg:mb-4">Encuestas Activas</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
              {activeSurveys.map(survey => (
                <SurveyCard
                  key={survey.id}
                  survey={survey}
                  onEdit={isAdmin ? (s) => { setEditingSurvey(s); setShowForm(true); } : null}
                  onViewResults={isAdmin ? setViewingResults : null}
                  isAdmin={isAdmin}
                  userEmail={user?.email}
                />
              ))}
            </div>
          </div>
        )}

        {closedSurveys.length > 0 && isAdmin && (
          <div>
            <h2 className="text-lg lg:text-xl font-bold text-slate-500 mb-3 lg:mb-4">Encuestas Cerradas</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4 opacity-60">
              {closedSurveys.map(survey => (
                <SurveyCard
                  key={survey.id}
                  survey={survey}
                  onEdit={(s) => { setEditingSurvey(s); setShowForm(true); }}
                  onViewResults={setViewingResults}
                  isAdmin={isAdmin}
                  userEmail={user?.email}
                />
              ))}
            </div>
          </div>
        )}

        {activeSurveys.length === 0 && !isAdmin && (
          <div className="text-center py-12 bg-white rounded-xl shadow-md">
            <MessageCircle className="w-12 h-12 lg:w-16 lg:h-16 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm lg:text-base">No hay encuestas activas en este momento</p>
          </div>
        )}
      </div>
    </div>
  );
}
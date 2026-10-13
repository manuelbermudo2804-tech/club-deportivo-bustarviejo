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
    <div className="mx-auto w-full min-w-0 max-w-[1600px] space-y-5 overflow-x-hidden px-3 pb-24 pt-4 sm:px-5 lg:space-y-6 lg:px-8 lg:pt-7">
      <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-lg sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="relative flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-400/15 ring-1 ring-orange-200/20 sm:h-14 sm:w-14">
              <MessageCircle className="h-6 w-6 text-orange-300 sm:h-7 sm:w-7" />
            </div>
            <div className="min-w-0">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">Participación · Club Deportivo Bustarviejo</p>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Encuestas y Feedback</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">{isAdmin ? "Gestiona encuestas, consulta resultados y escucha a las familias del club." : "Participa en las encuestas y comparte tu opinión con el club."}</p>
            </div>
          </div>
          {isAdmin && (
            <Button onClick={() => { setEditingSurvey(null); setShowForm(!showForm); }} className="w-full shrink-0 bg-orange-500 text-white hover:bg-orange-600 sm:w-auto">
              <Plus className="mr-2 h-4 w-4" /> Nueva encuesta
            </Button>
          )}
        </div>
      </section>

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
            <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-2">
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
            <div className="grid min-w-0 grid-cols-1 gap-3 opacity-70 xl:grid-cols-2">
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
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center shadow-sm">
            <MessageCircle className="w-12 h-12 lg:w-16 lg:h-16 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm lg:text-base">No hay encuestas activas en este momento</p>
          </div>
        )}
      </div>
    </div>
  );
}
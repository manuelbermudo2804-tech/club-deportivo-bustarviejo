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

const localDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

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
  const todayKey = localDateKey();
  const filteredSurveys = isAdmin 
    ? surveys 
    : surveys.filter(s => {
        // Solo mostrar encuestas activas dentro de su periodo de respuesta
        if (!s.activa || !s.fecha_inicio || !s.fecha_fin || todayKey < s.fecha_inicio || todayKey > s.fecha_fin) return false;
        
        // Si es para "Todos", mostrar
        if (s.destinatarios === "Todos") return true;
        
        // Si es para un deporte específico, ver si el padre/entrenador tiene jugadores en ese deporte
        return myPlayersSports.includes(s.destinatarios);
      });

  const activeSurveys = filteredSurveys.filter(s => s.activa && s.fecha_inicio && s.fecha_fin && todayKey >= s.fecha_inicio && todayKey <= s.fecha_fin);
  const closedSurveys = filteredSurveys.filter(s => !s.activa || !s.fecha_fin || todayKey > s.fecha_fin);

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
            <div className="mb-3 flex items-center gap-2 lg:mb-4"><span className="h-5 w-1.5 rounded-full bg-orange-500" /><h2 className="text-lg font-bold tracking-tight text-slate-900 lg:text-xl">Encuestas activas</h2><span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">{activeSurveys.length}</span></div>
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
            <div className="mb-3 flex items-center gap-2 lg:mb-4"><span className="h-5 w-1.5 rounded-full bg-slate-400" /><h2 className="text-lg font-bold tracking-tight text-slate-600 lg:text-xl">Encuestas cerradas</h2><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{closedSurveys.length}</span></div>
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
          <div className="rounded-3xl border border-dashed border-slate-300 bg-gradient-to-b from-white to-slate-50 px-5 py-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 ring-1 ring-orange-100"><MessageCircle className="h-8 w-8 text-orange-400" /></div>
            <p className="text-base font-semibold text-slate-800">No hay encuestas activas</p><p className="mt-1 text-sm text-slate-500">Cuando el club publique una encuesta, aparecerá aquí.</p>
          </div>
        )}
      </div>
    </div>
  );
}
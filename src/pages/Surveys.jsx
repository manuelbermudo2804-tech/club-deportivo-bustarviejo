import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, MessageCircle } from "lucide-react";
import { AnimatePresence } from "framer-motion";

import SurveyForm from "../components/surveys/SurveyForm";
import SurveyCard from "../components/surveys/SurveyCard";
import SurveyResults from "../components/surveys/SurveyResults";

export default function Surveys() {
  const [showForm, setShowForm] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState(null);
  const [viewingResults, setViewingResults] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAdmin = async () => {
      const user = await base44.auth.me();
      setIsAdmin(user.role === "admin");
    };
    checkAdmin();
  }, []);

  const { data: surveys } = useQuery({
    queryKey: ['surveys'],
    queryFn: () => base44.entities.Survey.list('-created_date'),
    initialData: [],
  });

  const createSurveyMutation = useMutation({
    mutationFn: (surveyData) => base44.entities.Survey.create(surveyData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      setShowForm(false);
      setEditingSurvey(null);
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

  const activeSurveys = surveys.filter(s => s.activa && new Date(s.fecha_fin) >= new Date());
  const closedSurveys = surveys.filter(s => !s.activa || new Date(s.fecha_fin) < new Date());

  if (viewingResults) {
    return <SurveyResults survey={viewingResults} onBack={() => setViewingResults(null)} />;
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <MessageCircle className="w-8 h-8 text-orange-600" />
            Encuestas y Feedback
          </h1>
          <p className="text-slate-600 mt-1">
            {isAdmin ? "Gestiona encuestas y consulta resultados" : "Participa en las encuestas del club"}
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => {
              setEditingSurvey(null);
              setShowForm(!showForm);
            }}
            className="bg-orange-600 hover:bg-orange-700"
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

      <div className="space-y-6">
        {activeSurveys.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-4">Encuestas Activas</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {activeSurveys.map(survey => (
                <SurveyCard
                  key={survey.id}
                  survey={survey}
                  onEdit={isAdmin ? (s) => { setEditingSurvey(s); setShowForm(true); } : null}
                  onViewResults={isAdmin ? setViewingResults : null}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          </div>
        )}

        {closedSurveys.length > 0 && isAdmin && (
          <div>
            <h2 className="text-xl font-bold text-slate-500 mb-4">Encuestas Cerradas</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 opacity-60">
              {closedSurveys.map(survey => (
                <SurveyCard
                  key={survey.id}
                  survey={survey}
                  onEdit={(s) => { setEditingSurvey(s); setShowForm(true); }}
                  onViewResults={setViewingResults}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          </div>
        )}

        {activeSurveys.length === 0 && !isAdmin && (
          <div className="text-center py-12 bg-white rounded-xl shadow-md">
            <MessageCircle className="w-16 h-16 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No hay encuestas activas en este momento</p>
          </div>
        )}
      </div>
    </div>
  );
}
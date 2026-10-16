import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Calendar, Users, Eye, MessageSquare, CheckCircle2, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

import SurveyResponseForm from "./SurveyResponseForm";

export default function SurveyCard({ survey, onEdit, onViewResults, isAdmin, userEmail }) {
  const [showResponse, setShowResponse] = useState(false);
  const [hasResponded, setHasResponded] = useState(false);

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const hasStarted = !!survey.fecha_inicio && todayKey >= survey.fecha_inicio;
  const isScheduled = survey.activa && !!survey.fecha_inicio && todayKey < survey.fecha_inicio;
  const isActive = survey.activa && hasStarted && !!survey.fecha_fin && todayKey <= survey.fecha_fin;
  const daysLeft = survey.fecha_fin ? Math.max(0, Math.round((new Date(`${survey.fecha_fin}T12:00:00`) - new Date(`${todayKey}T12:00:00`)) / (1000 * 60 * 60 * 24))) : 0;

  // Filtrar por survey_id directamente en BD (mucho más eficiente)
  const { data: responses } = useQuery({
    queryKey: ['surveyResponses', survey.id, userEmail],
    queryFn: () => {
      const marker = survey.anonima ? `anon_${btoa(userEmail).slice(0, 12)}` : userEmail;
      return base44.entities.SurveyResponse.filter({ survey_id: survey.id, respondente_email: marker });
    },
    initialData: [],
    enabled: !isAdmin && !!userEmail,
    staleTime: 60000,
  });

  useEffect(() => {
    if (!isAdmin && userEmail) {
      const userResponse = (responses || []).find(r => r.survey_id === survey.id);
      let anonResponded = false;
      try {
        if (survey.anonima) {
          anonResponded = localStorage.getItem(`survey_${survey.id}_responded_${userEmail}`) === 'true';
        }
      } catch {}
      setHasResponded(!!userResponse || anonResponded);
    }
  }, [responses, userEmail, survey.id, survey.anonima, isAdmin]);

  useEffect(() => {
    const handler = (e) => {
      if (e?.detail?.surveyId === survey.id) {
        setHasResponded(true);
      }
    };
    window.addEventListener('survey-responded', handler);
    return () => window.removeEventListener('survey-responded', handler);
  }, [survey.id]);

  if (showResponse) {
    return <SurveyResponseForm survey={survey} onClose={() => setShowResponse(false)} />;
  }

  const hasNewResponses = isAdmin && (survey.respuestas_nuevas || 0) > 0;

  return (
    <Card className={`group min-w-0 overflow-hidden rounded-2xl border shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${hasResponded ? 'border-green-200 bg-gradient-to-br from-green-50 to-white' : isActive ? 'border-slate-200 bg-white hover:border-orange-200' : 'border-slate-200 bg-slate-50/70'} ${hasNewResponses ? 'ring-2 ring-red-300' : ''}`}>
      <CardHeader className="space-y-2 border-b border-slate-100 bg-white/70 pb-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="flex-1">
            <CardTitle className="flex min-w-0 items-center gap-2 break-words text-base font-bold leading-snug tracking-tight text-slate-900 sm:text-lg">
              {survey.titulo}
              {hasNewResponses && (
                <Badge className="bg-red-500 text-white animate-pulse">
                  🔴 {survey.respuestas_nuevas} nueva{survey.respuestas_nuevas > 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
            <p className="text-sm text-slate-600 mt-1">{survey.descripcion}</p>
          </div>
          <Badge className={isActive ? 'bg-green-600' : isScheduled ? 'border border-blue-200 bg-blue-50 text-blue-800' : 'bg-slate-500'}>
            {isActive ? 'Activa' : isScheduled ? 'Programada' : 'Cerrada'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-x-3 gap-y-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-600 sm:text-sm">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {survey.destinatarios}
          </div>
          <div className="flex items-center gap-1">
            <MessageSquare className="w-4 h-4" />
            {survey.preguntas.length} preguntas
          </div>
          <div className="flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4 text-orange-600" />
            <span className="font-semibold text-orange-700">{survey.respuestas_count || 0} respuestas</span>
          </div>
        </div>

        {isAdmin && (survey.respuestas_count || 0) > 0 && (
          <div className={`${hasNewResponses ? 'bg-red-50 border-red-300' : 'bg-blue-50 border-blue-200'} border-2 rounded-lg p-3`}>
            <p className={`text-xs ${hasNewResponses ? 'text-red-900' : 'text-blue-800'} font-medium text-center`}>
              {hasNewResponses && (
                <AlertCircle className="w-4 h-4 inline mr-1 animate-pulse" />
              )}
              📊 {survey.respuestas_count} respuesta{survey.respuestas_count !== 1 ? 's' : ''} total{survey.respuestas_count !== 1 ? 'es' : ''}
              {hasNewResponses && ` • 🔴 ${survey.respuestas_nuevas} sin revisar`}
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-slate-500" />
          <span>
            {isScheduled ? `Empieza el ${new Date(`${survey.fecha_inicio}T12:00:00`).toLocaleDateString('es-ES')}` : `Hasta ${survey.fecha_fin ? new Date(`${survey.fecha_fin}T12:00:00`).toLocaleDateString('es-ES') : '—'}`}
            {isActive && ` · ${daysLeft} días restantes`}
          </span>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          {!isAdmin && isActive && !hasResponded && (
            <Button
              onClick={() => setShowResponse(true)}
              className="h-11 w-full rounded-xl bg-orange-600 font-semibold shadow-sm hover:bg-orange-700 sm:flex-1"
            >
              Responder
            </Button>
          )}
          {!isAdmin && hasResponded && (
            <div className="w-full flex-1 rounded-xl border border-green-200 bg-green-50 p-4 text-center sm:w-auto">
              <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-green-800">¡Gracias por responder!</p>
              <p className="text-xs text-green-600 mt-1">Tu opinión es muy valiosa para nosotros</p>
            </div>
          )}
          {isAdmin && (
            <>
              <Button variant="outline" onClick={() => onEdit(survey)} className="h-11 w-full rounded-xl border-slate-200 font-semibold hover:border-orange-300 hover:bg-orange-50 sm:flex-1">
                Editar
              </Button>
              <Button 
                onClick={() => onViewResults(survey)} 
                className="h-11 w-full rounded-xl bg-slate-900 font-semibold text-white shadow-sm hover:bg-orange-700 sm:flex-1"
              >
                <BarChart3 className="w-5 h-5 mr-2" />
                📊 Ver Gráficos
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
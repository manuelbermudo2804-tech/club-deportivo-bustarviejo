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

  const daysLeft = Math.ceil((new Date(survey.fecha_fin) - new Date()) / (1000 * 60 * 60 * 24));
  const isActive = survey.activa && daysLeft > 0;

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
    <Card className={`border-2 ${hasResponded ? 'border-green-300 bg-green-50' : isActive ? 'border-green-200' : 'border-slate-200'} ${hasNewResponses ? 'ring-2 ring-red-400' : ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {survey.titulo}
              {hasNewResponses && (
                <Badge className="bg-red-500 text-white animate-pulse">
                  🔴 {survey.respuestas_nuevas} nueva{survey.respuestas_nuevas > 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
            <p className="text-sm text-slate-600 mt-1">{survey.descripcion}</p>
          </div>
          <Badge className={isActive ? 'bg-green-500' : 'bg-slate-500'}>
            {isActive ? 'Activa' : 'Cerrada'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 text-sm text-slate-600">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {survey.destinatarios}
          </div>
          <div className="flex items-center gap-1">
            <MessageSquare className="w-4 h-4" />
            {survey.preguntas.length} preguntas
          </div>
          <div className="flex items-center gap-1">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-blue-600">{survey.respuestas_count || 0} respuestas</span>
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
            Hasta {new Date(survey.fecha_fin).toLocaleDateString('es-ES')}
            {isActive && ` (${daysLeft} días)`}
          </span>
        </div>

        <div className="flex gap-2">
          {!isAdmin && isActive && !hasResponded && (
            <Button
              onClick={() => setShowResponse(true)}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              Responder
            </Button>
          )}
          {!isAdmin && hasResponded && (
            <div className="flex-1 bg-green-100 border-2 border-green-500 rounded-lg p-4 text-center">
              <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-green-800">¡Gracias por responder!</p>
              <p className="text-xs text-green-600 mt-1">Tu opinión es muy valiosa para nosotros</p>
            </div>
          )}
          {isAdmin && (
            <>
              <Button variant="outline" onClick={() => onEdit(survey)} className="flex-1">
                Editar
              </Button>
              <Button 
                onClick={() => onViewResults(survey)} 
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg"
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
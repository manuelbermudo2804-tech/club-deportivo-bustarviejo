import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Calendar, Users, Eye, MessageSquare } from "lucide-react";

import SurveyResponseForm from "./SurveyResponseForm";

export default function SurveyCard({ survey, onEdit, onViewResults, isAdmin }) {
  const [showResponse, setShowResponse] = useState(false);

  const daysLeft = Math.ceil((new Date(survey.fecha_fin) - new Date()) / (1000 * 60 * 60 * 24));
  const isActive = survey.activa && daysLeft > 0;

  if (showResponse) {
    return <SurveyResponseForm survey={survey} onClose={() => setShowResponse(false)} />;
  }

  return (
    <Card className={`border-2 ${isActive ? 'border-green-200' : 'border-slate-200'}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{survey.titulo}</CardTitle>
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
            <BarChart3 className="w-4 h-4" />
            {survey.respuestas_count || 0} respuestas
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-slate-500" />
          <span>
            Hasta {new Date(survey.fecha_fin).toLocaleDateString('es-ES')}
            {isActive && ` (${daysLeft} días)`}
          </span>
        </div>

        <div className="flex gap-2">
          {!isAdmin && isActive && (
            <Button
              onClick={() => setShowResponse(true)}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              Responder
            </Button>
          )}
          {isAdmin && (
            <>
              <Button variant="outline" onClick={() => onEdit(survey)} className="flex-1">
                Editar
              </Button>
              <Button onClick={() => onViewResults(survey)} className="flex-1 bg-blue-600 hover:bg-blue-700">
                <Eye className="w-4 h-4 mr-2" />
                Ver Resultados
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function SurveyResults({ survey, onBack }) {
  const [responses, setResponses] = useState([]);

  useEffect(() => {
    const fetchResponses = async () => {
      const allResponses = await base44.entities.SurveyResponse.list();
      const surveyResponses = allResponses.filter(r => r.survey_id === survey.id);
      setResponses(surveyResponses);
    };
    fetchResponses();
  }, [survey.id]);

  const exportToCSV = () => {
    let csv = "Fecha,Respondente,";
    csv += survey.preguntas.map(q => `"${q.pregunta}"`).join(",") + "\n";

    responses.forEach(r => {
      csv += `${new Date(r.fecha_respuesta).toLocaleDateString()},`;
      csv += `${r.respondente_nombre || "Anónimo"},`;
      csv += r.respuestas.map(resp => `"${resp.respuesta}"`).join(",") + "\n";
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resultados_${survey.titulo.replace(/\s+/g, '_')}.csv`;
    a.click();
  };

  const getRatingData = (questionIndex) => {
    const ratings = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
    responses.forEach(r => {
      const answer = r.respuestas[questionIndex]?.respuesta;
      if (answer && ratings[answer] !== undefined) {
        ratings[answer]++;
      }
    });
    return Object.entries(ratings).map(([key, value]) => ({
      rating: `${key} estrellas`,
      count: value
    }));
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
        <Button onClick={exportToCSV} className="bg-green-600 hover:bg-green-700">
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{survey.titulo}</CardTitle>
          <p className="text-slate-600">Total de respuestas: {responses.length}</p>
        </CardHeader>
        <CardContent className="space-y-8">
          {survey.preguntas.map((q, index) => (
            <div key={index} className="space-y-4">
              <h3 className="font-semibold text-lg">{index + 1}. {q.pregunta}</h3>
              
              {q.tipo_respuesta === "rating" && (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={getRatingData(index)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="rating" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#ea580c" />
                  </BarChart>
                </ResponsiveContainer>
              )}

              {q.tipo_respuesta === "texto" && (
                <div className="space-y-2">
                  {responses.map((r, i) => (
                    <div key={i} className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-600">
                        {!survey.anonima && <strong>{r.respondente_nombre}: </strong>}
                        {r.respuestas[index]?.respuesta}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
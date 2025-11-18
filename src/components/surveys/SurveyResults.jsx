import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, TrendingUp, Star } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];

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
      const answerStr = String(answer).trim();
      if (answerStr && ratings[answerStr] !== undefined) {
        ratings[answerStr]++;
      }
    });
    return Object.entries(ratings).map(([key, value]) => ({
      rating: `${key}★`,
      estrellas: key,
      count: value,
      name: `${key} estrellas`
    }));
  };

  const getRatingAverage = (questionIndex) => {
    let total = 0;
    let count = 0;
    responses.forEach(r => {
      const answer = r.respuestas[questionIndex]?.respuesta;
      const answerNum = parseInt(String(answer).trim());
      if (!isNaN(answerNum) && answerNum >= 1 && answerNum <= 5) {
        total += answerNum;
        count++;
      }
    });
    return count > 0 ? (total / count).toFixed(2) : 0;
  };

  const getTextResponses = (questionIndex) => {
    return responses
      .map(r => ({
        respuesta: r.respuestas[questionIndex]?.respuesta,
        nombre: r.respondente_nombre,
        fecha: r.fecha_respuesta
      }))
      .filter(r => r.respuesta && r.respuesta.trim() !== '')
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  };

  const overallStats = survey.preguntas
    .map((q, idx) => {
      if (q.tipo_respuesta === "rating") {
        return {
          pregunta: q.pregunta,
          promedio: getRatingAverage(idx),
          tipo: "rating"
        };
      }
      return null;
    })
    .filter(Boolean)
    .sort((a, b) => b.promedio - a.promedio);

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-slate-600 mb-2">Total Respuestas</p>
              <p className="text-4xl font-bold text-orange-600">{responses.length}</p>
            </div>
          </CardContent>
        </Card>
        
        {overallStats.length > 0 && (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-slate-600 mb-2">Promedio Global</p>
                  <div className="flex items-center justify-center gap-2">
                    <p className="text-4xl font-bold text-green-600">
                      {(overallStats.reduce((sum, s) => sum + parseFloat(s.promedio), 0) / overallStats.length).toFixed(2)}
                    </p>
                    <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-slate-600 mb-2">Aspecto Mejor Valorado</p>
                  <p className="text-lg font-bold text-blue-600">
                    {overallStats[0].promedio} ⭐
                  </p>
                  <p className="text-xs text-slate-500 mt-1 truncate">
                    {overallStats[0].pregunta.substring(0, 40)}...
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {overallStats.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-600" />
              Resumen de Valoraciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overallStats.map((stat, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <Badge className={`${
                    parseFloat(stat.promedio) >= 4.5 ? 'bg-green-500' :
                    parseFloat(stat.promedio) >= 3.5 ? 'bg-blue-500' :
                    parseFloat(stat.promedio) >= 2.5 ? 'bg-yellow-500' :
                    'bg-red-500'
                  } min-w-[60px] justify-center`}>
                    {stat.promedio} ⭐
                  </Badge>
                  <p className="text-sm flex-1">{stat.pregunta}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Análisis Detallado por Pregunta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {survey.preguntas.map((q, index) => (
            <div key={index} className="space-y-4 pb-6 border-b last:border-b-0">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-lg">{index + 1}. {q.pregunta}</h3>
                {q.tipo_respuesta === "rating" && (
                  <Badge className="bg-orange-100 text-orange-700">
                    Promedio: {getRatingAverage(index)} ⭐
                  </Badge>
                )}
              </div>
              
              {q.tipo_respuesta === "rating" && (
                <>
                  <div className="grid grid-cols-5 gap-2 mb-4">
                    {[1, 2, 3, 4, 5].map(star => {
                      const data = getRatingData(index);
                      const starData = data.find(d => d.estrellas === String(star));
                      const count = starData?.count || 0;
                      const total = responses.length;
                      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                      
                      return (
                        <div key={star} className="text-center p-3 bg-slate-50 rounded-lg border-2 border-slate-200">
                          <div className="text-2xl mb-1">{"⭐".repeat(star)}</div>
                          <div className="font-bold text-lg text-slate-900">{count}</div>
                          <div className="text-xs text-slate-600">{percentage}%</div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm font-medium text-slate-600 mb-3">📊 Distribución de Valoraciones</p>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={getRatingData(index)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="rating" />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#ea580c" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-slate-600 mb-3">🥧 Proporción</p>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={getRatingData(index).filter(d => d.count > 0)}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ estrellas, count, percent }) => 
                              `${estrellas}★: ${count} (${(percent * 100).toFixed(0)}%)`
                            }
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="count"
                          >
                            {getRatingData(index).map((entry, idx) => (
                              <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}

              {q.tipo_respuesta === "texto" && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-600">
                    {getTextResponses(index).length} respuesta(s)
                  </p>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {getTextResponses(index).map((r, i) => (
                      <div key={i} className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          {!survey.anonima && (
                            <p className="text-sm font-semibold text-slate-700">{r.nombre}</p>
                          )}
                          <p className="text-xs text-slate-500">
                            {new Date(r.fecha).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">{r.respuesta}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
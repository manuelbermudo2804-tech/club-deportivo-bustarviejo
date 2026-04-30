import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download, TrendingUp, Star, FileText, User, Filter } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

const COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];

export default function SurveyResults({ survey, onBack }) {
  const [responses, setResponses] = useState([]);
  const [selectedUser, setSelectedUser] = useState("all");
  const [showUserResponses, setShowUserResponses] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchResponses = async () => {
      const allResponses = await base44.entities.SurveyResponse.list();
      const surveyResponses = allResponses.filter(r => r.survey_id === survey.id);
      setResponses(surveyResponses);
      
      // Marcar encuesta como revisada por admin
      if (user?.role === "admin" && survey.respuestas_nuevas > 0) {
        await base44.entities.Survey.update(survey.id, {
          respuestas_nuevas: 0,
          ultima_revision_admin: new Date().toISOString()
        });
        toast.success("✅ Respuestas marcadas como revisadas");
      }
    };
    if (user) {
      fetchResponses();
    }
  }, [survey.id, user]);

  // Lista de usuarios únicos que respondieron (NUNCA si es anónima)
  const uniqueUsers = useMemo(() => {
    if (survey.anonima) return [];
    const users = {};
    responses.forEach(r => {
      // Excluir marcadores anónimos por seguridad
      if (r.respondente_email && !r.respondente_email.startsWith('anon_') && !users[r.respondente_email]) {
        users[r.respondente_email] = {
          email: r.respondente_email,
          nombre: r.respondente_nombre,
          fecha: r.fecha_respuesta
        };
      }
    });
    return Object.values(users).sort((a, b) => a.nombre?.localeCompare(b.nombre || ''));
  }, [responses, survey.anonima]);

  // Respuesta del usuario seleccionado
  const selectedUserResponse = useMemo(() => {
    if (selectedUser === "all") return null;
    return responses.find(r => r.respondente_email === selectedUser);
  }, [responses, selectedUser]);

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

  const exportToPDF = async () => {
    // Generar HTML para el reporte
    const ratingStats = survey.preguntas
      .map((q, idx) => {
        if (q.tipo_respuesta === "rating") {
          return { pregunta: q.pregunta, promedio: getRatingAverage(idx) };
        }
        return null;
      })
      .filter(Boolean);

    const globalAvg = ratingStats.length > 0 
      ? (ratingStats.reduce((sum, s) => sum + parseFloat(s.promedio), 0) / ratingStats.length).toFixed(2)
      : 'N/A';

    let htmlContent = `
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          h1 { color: #ea580c; border-bottom: 3px solid #ea580c; padding-bottom: 10px; }
          h2 { color: #475569; margin-top: 30px; }
          .stats { display: flex; gap: 20px; margin: 20px 0; }
          .stat-box { background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; flex: 1; }
          .stat-value { font-size: 32px; font-weight: bold; color: #ea580c; }
          .stat-label { font-size: 14px; color: #64748b; }
          .question { background: #f8fafc; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #ea580c; }
          .question-title { font-weight: bold; margin-bottom: 10px; }
          .rating-bar { display: flex; align-items: center; gap: 10px; margin: 5px 0; }
          .rating-label { width: 80px; }
          .rating-count { font-weight: bold; }
          .text-response { background: white; padding: 10px; margin: 5px 0; border-radius: 4px; border: 1px solid #e2e8f0; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
          th { background: #f8fafc; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>📊 Reporte de Encuesta</h1>
        <h2>${survey.titulo}</h2>
        <p>${survey.descripcion || ''}</p>
        <p><strong>Destinatarios:</strong> ${survey.destinatarios}</p>
        <p><strong>Periodo:</strong> ${format(new Date(survey.fecha_inicio), 'dd/MM/yyyy')} - ${format(new Date(survey.fecha_fin), 'dd/MM/yyyy')}</p>
        
        <div class="stats">
          <div class="stat-box">
            <div class="stat-value">${responses.length}</div>
            <div class="stat-label">Total Respuestas</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${globalAvg} ⭐</div>
            <div class="stat-label">Promedio Global</div>
          </div>
        </div>

        <h2>Resumen de Valoraciones</h2>
        <table>
          <tr><th>Pregunta</th><th>Promedio</th></tr>
          ${ratingStats.map(s => `<tr><td>${s.pregunta}</td><td>${s.promedio} ⭐</td></tr>`).join('')}
        </table>

        <h2>Detalle por Pregunta</h2>
    `;

    survey.preguntas.forEach((q, idx) => {
      htmlContent += `<div class="question"><div class="question-title">${idx + 1}. ${q.pregunta}</div>`;
      
      if (q.tipo_respuesta === "rating") {
        const data = getRatingData(idx);
        htmlContent += `<p><strong>Promedio: ${getRatingAverage(idx)} ⭐</strong></p>`;
        data.forEach(d => {
          htmlContent += `<div class="rating-bar"><span class="rating-label">${d.estrellas} estrella(s):</span> <span class="rating-count">${d.count} respuestas</span></div>`;
        });
      } else if (q.tipo_respuesta === "texto") {
        const textResponses = getTextResponses(idx);
        htmlContent += `<p><strong>${textResponses.length} respuestas</strong></p>`;
        textResponses.slice(0, 10).forEach(r => {
          htmlContent += `<div class="text-response">"${r.respuesta}" ${!survey.anonima ? `<em>- ${r.nombre}</em>` : ''}</div>`;
        });
        if (textResponses.length > 10) {
          htmlContent += `<p><em>... y ${textResponses.length - 10} respuestas más</em></p>`;
        }
      }
      htmlContent += `</div>`;
    });

    htmlContent += `
        <div class="footer">
          <p>Reporte generado el ${format(new Date(), "d 'de' MMMM yyyy 'a las' HH:mm", { locale: es })}</p>
          <p>CD Bustarviejo - Sistema de Gestión</p>
        </div>
      </body>
      </html>
    `;

    // Abrir en nueva ventana para imprimir como PDF
    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
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
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
        <div className="flex gap-2">
          <Button onClick={exportToPDF} className="bg-orange-600 hover:bg-orange-700">
            <FileText className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
          <Button onClick={exportToCSV} className="bg-green-600 hover:bg-green-700">
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filtro por usuario */}
      {!survey.anonima && uniqueUsers.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">Ver respuesta individual:</span>
              </div>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="w-full md:w-[300px] bg-white">
                  <SelectValue placeholder="Seleccionar usuario..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">📊 Ver resumen general</SelectItem>
                  {uniqueUsers.map(user => (
                    <SelectItem key={user.email} value={user.email}>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {user.nombre || user.email}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vista de respuesta individual */}
      {selectedUser !== "all" && selectedUserResponse && (
        <Card className="border-2 border-blue-300">
          <CardHeader className="bg-blue-50">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Respuesta de: {selectedUserResponse.respondente_nombre || selectedUserResponse.respondente_email}
              </CardTitle>
              <Badge className="bg-blue-600">
                {format(new Date(selectedUserResponse.fecha_respuesta), "dd/MM/yyyy HH:mm")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {selectedUserResponse.respuestas.map((resp, idx) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-lg">
                <p className="font-semibold text-slate-900 mb-2">
                  {idx + 1}. {survey.preguntas[idx]?.pregunta || resp.pregunta}
                </p>
                <div className="mt-2">
                  {survey.preguntas[idx]?.tipo_respuesta === "rating" ? (
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star 
                          key={star} 
                          className={`w-6 h-6 ${parseInt(resp.respuesta) >= star ? 'text-yellow-500 fill-yellow-500' : 'text-slate-300'}`} 
                        />
                      ))}
                      <span className="ml-2 font-bold text-orange-600">{resp.respuesta}/5</span>
                    </div>
                  ) : (
                    <p className="text-slate-700 bg-white p-3 rounded border">
                      {resp.respuesta || <span className="text-slate-400 italic">Sin respuesta</span>}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Vista general (solo si no hay usuario seleccionado) */}
      {selectedUser === "all" && (
        <>

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
      </>
      )}
    </div>
  );
}
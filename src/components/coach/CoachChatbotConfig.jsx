import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Bot, Plus, Trash2, Save, TrendingUp, MessageSquare, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CoachChatbotConfig({ categoria, entrenadorEmail }) {
  const [faqs, setFaqs] = useState([]);
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ['chatbotConfig', categoria],
    queryFn: async () => {
      const all = await base44.entities.ChatbotConfig.list();
      const found = all.find(c => c.categoria === categoria && c.entrenador_email === entrenadorEmail);
      if (found && found.faqs_personalizadas) {
        setFaqs(found.faqs_personalizadas);
      }
      return found;
    }
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['chatbotLogs', categoria],
    queryFn: async () => {
      const all = await base44.entities.ChatbotLog.list();
      return all.filter(l => l.categoria === categoria).slice(0, 50);
    },
    enabled: !!config?.chatbot_activo
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (config) {
        return await base44.entities.ChatbotConfig.update(config.id, data);
      }
      return await base44.entities.ChatbotConfig.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatbotConfig'] });
      toast.success('Configuración guardada');
    }
  });

  const handleSave = (formData) => {
    saveMutation.mutate({
      entrenador_email: entrenadorEmail,
      categoria,
      ...formData,
      faqs_personalizadas: faqs
    });
  };

  const addFaq = () => {
    setFaqs([...faqs, { pregunta: "", respuesta: "", categoria: "General" }]);
  };

  const removeFaq = (index) => {
    setFaqs(faqs.filter((_, i) => i !== index));
  };

  const updateFaq = (index, field, value) => {
    const updated = [...faqs];
    updated[index][field] = value;
    setFaqs(updated);
  };

  const stats = {
    total: logs.length,
    escalados: logs.filter(l => l.escalado).length,
    satisfactorios: logs.filter(l => l.satisfactorio).length,
    tiempoPromedio: logs.length > 0 ? Math.round(logs.reduce((sum, l) => sum + (l.tiempo_respuesta_ms || 0), 0) / logs.length / 1000) : 0
  };

  if (isLoading) {
    return <div className="text-center py-4">Cargando configuración...</div>;
  }

  return (
    <div className="space-y-6">
      <Alert className="bg-blue-50 border-blue-200">
        <Bot className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          El chatbot responde automáticamente preguntas frecuentes sobre horarios, pagos, convocatorias y normas del club. 
          Escala mensajes urgentes al entrenador.
        </AlertDescription>
      </Alert>

      {/* Estadísticas */}
      {config?.chatbot_activo && logs.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-xs text-slate-600">Mensajes respondidos</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">{stats.escalados}</div>
              <div className="text-xs text-slate-600">Escalados a humano</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.satisfactorios}</div>
              <div className="text-xs text-slate-600">Consultas resueltas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">{stats.tiempoPromedio}s</div>
              <div className="text-xs text-slate-600">Tiempo respuesta</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-600" />
            Configuración del Chatbot
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Activación */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Activar Chatbot</Label>
                <p className="text-xs text-slate-500">Respuestas automáticas para padres</p>
              </div>
              <Switch
                checked={config?.chatbot_activo || false}
                onCheckedChange={(checked) => handleSave({ ...config, chatbot_activo: checked })}
              />
            </div>

            {config?.chatbot_activo && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Solo fuera de horario</Label>
                    <p className="text-xs text-slate-500">Activar solo cuando no estés disponible</p>
                  </div>
                  <Switch
                    checked={config?.solo_fuera_horario !== false}
                    onCheckedChange={(checked) => handleSave({ ...config, solo_fuera_horario: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Modo transparente</Label>
                    <p className="text-xs text-slate-500">Mostrar badge 🤖 a los padres</p>
                  </div>
                  <Switch
                    checked={config?.modo_transparente !== false}
                    onCheckedChange={(checked) => handleSave({ ...config, modo_transparente: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Notificarme siempre</Label>
                    <p className="text-xs text-slate-500">Recibir notificación de cada respuesta del bot</p>
                  </div>
                  <Switch
                    checked={config?.notificar_todas_conversaciones || false}
                    onCheckedChange={(checked) => handleSave({ ...config, notificar_todas_conversaciones: checked })}
                  />
                </div>
              </>
            )}
          </div>

          {config?.chatbot_activo && (
            <>
              {/* Mensaje de bienvenida */}
              <div>
                <Label>Mensaje de Bienvenida (opcional)</Label>
                <Textarea
                  defaultValue={config?.mensaje_bienvenida}
                  onBlur={(e) => handleSave({ ...config, mensaje_bienvenida: e.target.value })}
                  rows={2}
                  placeholder="Hola, soy el asistente del entrenador..."
                />
              </div>

              {/* FAQs Personalizadas */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Preguntas Frecuentes Personalizadas</Label>
                  <Button size="sm" onClick={addFaq}>
                    <Plus className="w-4 h-4 mr-1" />
                    Añadir FAQ
                  </Button>
                </div>

                {faqs.map((faq, index) => (
                  <Card key={index} className="bg-slate-50">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-2">
                          <Input
                            placeholder="Pregunta (ej: ¿Cuándo es el próximo partido?)"
                            value={faq.pregunta}
                            onChange={(e) => updateFaq(index, 'pregunta', e.target.value)}
                          />
                          <Textarea
                            placeholder="Respuesta..."
                            value={faq.respuesta}
                            onChange={(e) => updateFaq(index, 'respuesta', e.target.value)}
                            rows={2}
                          />
                          <select
                            value={faq.categoria}
                            onChange={(e) => updateFaq(index, 'categoria', e.target.value)}
                            className="w-full p-2 border rounded-lg text-sm"
                          >
                            <option value="Horarios">Horarios</option>
                            <option value="Pagos">Pagos</option>
                            <option value="Normas">Normas</option>
                            <option value="Equipación">Equipación</option>
                            <option value="General">General</option>
                          </select>
                        </div>
                        <Button size="icon" variant="ghost" onClick={() => removeFaq(index)}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {faqs.length > 0 && (
                  <Button onClick={() => handleSave({ ...config, faqs_personalizadas: faqs })} className="w-full">
                    <Save className="w-4 h-4 mr-2" />
                    Guardar FAQs
                  </Button>
                )}
              </div>

              {/* Palabras de escalación */}
              <div>
                <Label>Palabras que activan escalación inmediata</Label>
                <p className="text-xs text-slate-500 mb-2">
                  Si el padre usa estas palabras, se notifica inmediatamente al entrenador
                </p>
                <Textarea
                  defaultValue={config?.palabras_escalacion?.join(', ')}
                  onBlur={(e) => handleSave({ 
                    ...config, 
                    palabras_escalacion: e.target.value.split(',').map(p => p.trim()) 
                  })}
                  rows={2}
                  placeholder="lesión, urgente, grave, hospital, accidente..."
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Últimas interacciones */}
      {config?.chatbot_activo && logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Últimas Interacciones del Chatbot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {logs.slice(0, 10).map(log => (
              <div key={log.id} className="bg-slate-50 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{log.padre_nombre}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{log.tipo_consulta}</Badge>
                    {log.escalado && <Badge className="bg-orange-100 text-orange-700">Escalado</Badge>}
                  </div>
                </div>
                <div className="text-sm text-slate-600">
                  <div className="font-medium">Pregunta:</div>
                  <div className="text-xs">{log.mensaje_padre}</div>
                </div>
                <div className="text-sm text-slate-600">
                  <div className="font-medium">Respuesta:</div>
                  <div className="text-xs">{log.respuesta_bot}</div>
                </div>
                {log.razon_escalacion && (
                  <div className="flex items-center gap-2 text-xs text-orange-600">
                    <AlertTriangle className="w-3 h-3" />
                    {log.razon_escalacion}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
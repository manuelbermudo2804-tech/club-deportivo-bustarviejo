import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sparkles,
  Send,
  Mail,
  MessageCircle,
  Users,
  Filter,
  Copy,
  Check,
  Loader2,
  History,
  Bell,
  Calendar,
  CreditCard,
  Gift,
  AlertTriangle,
  UserCheck,
  Clock,
  TrendingUp,
  RefreshCw,
  Eye,
  ChevronRight,
  Search
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

// Plantillas predefinidas
const MESSAGE_TEMPLATES = {
  event_invitation: {
    id: "event_invitation",
    name: "Invitación a Evento",
    icon: Calendar,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    description: "Invitar a eventos del club",
    variables: ["nombre_evento", "fecha", "hora", "ubicacion"]
  },
  seasonal_greeting: {
    id: "seasonal_greeting",
    name: "Felicitación de Temporada",
    icon: Gift,
    color: "text-green-600",
    bgColor: "bg-green-50",
    description: "Mensajes de felicitación (Navidad, fin de temporada...)",
    variables: ["temporada", "logros"]
  },
  welcome_new_member: {
    id: "welcome_new_member",
    name: "Bienvenida Nuevo Miembro",
    icon: UserCheck,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    description: "Dar la bienvenida a nuevas familias",
    variables: ["nombre_padre", "nombre_jugador", "categoria"]
  },
  training_update: {
    id: "training_update",
    name: "Actualización Entrenamientos",
    icon: Clock,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    description: "Comunicar cambios en horarios o entrenamientos",
    variables: ["categoria", "cambio", "fecha_efectiva"]
  },
  feedback_request: {
    id: "feedback_request",
    name: "Solicitud de Feedback",
    icon: MessageCircle,
    color: "text-cyan-600",
    bgColor: "bg-cyan-50",
    description: "Pedir opinión a las familias",
    variables: ["tema", "enlace_encuesta"]
  }
};

// Segmentos predefinidos
const MEMBER_SEGMENTS = {
  all_active: {
    id: "all_active",
    name: "Todos los Activos",
    description: "Todas las familias con jugadores activos",
    icon: Users,
    filter: (players) => players.filter(p => p.activo)
  },
  pending_payments: {
    id: "pending_payments",
    name: "Pagos Pendientes",
    description: "Familias con pagos sin completar",
    icon: AlertTriangle,
    filter: (players, payments) => {
      const pendingPlayerIds = payments
        .filter(p => p.estado === "Pendiente")
        .map(p => p.jugador_id);
      return players.filter(p => pendingPlayerIds.includes(p.id));
    }
  },
  new_members: {
    id: "new_members",
    name: "Nuevos Miembros",
    description: "Familias que se unieron en los últimos 30 días",
    icon: UserCheck,
    filter: (players) => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return players.filter(p => new Date(p.created_date) >= thirtyDaysAgo);
    }
  },
  high_engagement: {
    id: "high_engagement",
    name: "Alta Participación",
    description: "Familias con alta asistencia a entrenamientos",
    icon: TrendingUp,
    filter: (players, _, attendances) => {
      const highAttendanceIds = [];
      const attendanceCount = {};
      attendances.forEach(a => {
        a.asistencias?.forEach(asist => {
          if (asist.estado === "presente") {
            attendanceCount[asist.jugador_id] = (attendanceCount[asist.jugador_id] || 0) + 1;
          }
        });
      });
      Object.entries(attendanceCount).forEach(([id, count]) => {
        if (count >= 5) highAttendanceIds.push(id);
      });
      return players.filter(p => highAttendanceIds.includes(p.id));
    }
  },
  by_category: {
    id: "by_category",
    name: "Por Categoría",
    description: "Filtrar por categoría deportiva",
    icon: Filter,
    filter: (players, _, __, category) => players.filter(p => p.deporte === category)
  }
};

export default function AICommunicationAssistant({ open, onClose }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [generatedSubject, setGeneratedSubject] = useState("");
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [sendMethod, setSendMethod] = useState("email");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState(null);

  // Fetch data
  const { data: players = [] } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list(),
  });

  const { data: attendances = [] } = useQuery({
    queryKey: ['attendances'],
    queryFn: () => base44.entities.Attendance.list(),
  });

  const { data: communicationHistory = [] } = useQuery({
    queryKey: ['communicationHistory'],
    queryFn: () => base44.entities.CommunicationLog.list('-created_date', 50),
  });

  // Categorías únicas
  const categories = [...new Set(players.map(p => p.deporte))].filter(Boolean);

  // Filtrar destinatarios según segmento
  const getFilteredRecipients = () => {
    if (!selectedSegment) return [];
    
    const segment = MEMBER_SEGMENTS[selectedSegment];
    if (!segment) return [];

    let filtered = [];
    if (selectedSegment === "by_category" && selectedCategory) {
      filtered = segment.filter(players, payments, attendances, selectedCategory);
    } else if (selectedSegment === "pending_payments") {
      filtered = segment.filter(players, payments);
    } else if (selectedSegment === "high_engagement") {
      filtered = segment.filter(players, payments, attendances);
    } else {
      filtered = segment.filter(players);
    }

    // Agrupar por email de padre para evitar duplicados
    const uniqueEmails = {};
    filtered.forEach(player => {
      if (player.email_padre && !uniqueEmails[player.email_padre]) {
        uniqueEmails[player.email_padre] = {
          email: player.email_padre,
          nombre_padre: player.nombre_tutor_legal || "Familia",
          jugadores: [player]
        };
      } else if (player.email_padre) {
        uniqueEmails[player.email_padre].jugadores.push(player);
      }
    });

    return Object.values(uniqueEmails);
  };

  const filteredRecipients = getFilteredRecipients();

  // Generar mensaje con IA
  const generateMessage = async () => {
    if (!selectedTemplate && !customPrompt) {
      toast.error("Selecciona una plantilla o escribe instrucciones");
      return;
    }

    setLoading(true);
    try {
      const template = MESSAGE_TEMPLATES[selectedTemplate];
      const recipientsSample = selectedRecipients.slice(0, 3).map(r => ({
        nombre_padre: r.nombre_padre,
        jugadores: r.jugadores.map(j => j.nombre).join(", "),
        categoria: r.jugadores[0]?.deporte
      }));

      // Obtener datos relevantes según la plantilla
      let contextData = {};

      const prompt = `Eres un asistente de comunicación para un club deportivo (CD Bustarviejo). 
Genera un mensaje ${sendMethod === "email" ? "de correo electrónico" : "para chat/WhatsApp"} profesional pero cercano.

${template ? `TIPO DE MENSAJE: ${template.name}
DESCRIPCIÓN: ${template.description}` : ''}

${customPrompt ? `INSTRUCCIONES ADICIONALES: ${customPrompt}` : ''}

DESTINATARIOS (muestra): ${JSON.stringify(recipientsSample)}

${Object.keys(contextData).length > 0 ? `DATOS RELEVANTES: ${JSON.stringify(contextData)}` : ''}

REQUISITOS:
- Tono amigable y profesional
- Usar "vosotros" para grupos, "tú" para individuales
- Incluir llamada a la acción clara
- ${sendMethod === "email" ? "Formato HTML ligero con párrafos" : "Formato texto plano con emojis apropiados"}
- Firma como "CD Bustarviejo"
- NO incluir datos ficticios, usar [VARIABLE] donde corresponda`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            asunto: {
              type: "string",
              description: "Asunto del correo (solo para email)"
            },
            mensaje: {
              type: "string",
              description: "Cuerpo del mensaje"
            },
            variables_detectadas: {
              type: "array",
              items: { type: "string" },
              description: "Variables que deben personalizarse por destinatario"
            },
            sugerencias_mejora: {
              type: "array",
              items: { type: "string" },
              description: "Sugerencias para mejorar el mensaje o la comunicación"
            }
          }
        }
      });

      setGeneratedSubject(response.asunto || "");
      setGeneratedMessage(response.mensaje || "");
      setAiSuggestions(response.sugerencias_mejora || []);
      setStep(4);
      toast.success("Mensaje generado");
    } catch (error) {
      console.error("Error generando mensaje:", error);
      toast.error("Error al generar el mensaje");
    } finally {
      setLoading(false);
    }
  };

  // Enviar mensajes
  const sendMessages = async () => {
    if (selectedRecipients.length === 0) {
      toast.error("Selecciona al menos un destinatario");
      return;
    }

    setLoading(true);
    try {
      let successCount = 0;
      
      for (const recipient of selectedRecipients) {
        // Personalizar mensaje
        let personalizedMessage = generatedMessage
          .replace(/\[NOMBRE_PADRE\]/g, recipient.nombre_padre)
          .replace(/\[NOMBRE_JUGADOR\]/g, recipient.jugadores.map(j => j.nombre).join(", "))
          .replace(/\[CATEGORIA\]/g, recipient.jugadores[0]?.deporte || "");

        if (sendMethod === "email") {
          await base44.functions.invoke('sendEmail', {
            to: recipient.email,
            subject: generatedSubject,
            html: personalizedMessage
          });
        } else {
          // Enviar por chat interno
          await base44.entities.ChatMessage.create({
            remitente_email: "admin@cdbustarviejo.com",
            remitente_nombre: "CD Bustarviejo",
            destinatario_email: recipient.email,
            mensaje: personalizedMessage,
            tipo: "admin_a_grupo",
            grupo_id: recipient.jugadores[0]?.deporte || "general",
            prioridad: "Normal"
          });
        }

        successCount++;
      }

      // Guardar en historial
      await base44.entities.CommunicationLog.create({
        tipo: sendMethod,
        plantilla: selectedTemplate,
        asunto: generatedSubject,
        mensaje_preview: generatedMessage.substring(0, 200),
        destinatarios_count: selectedRecipients.length,
        segmento: selectedSegment,
        enviado_por: (await base44.auth.me()).email,
        estado: "enviado"
      });

      toast.success(`${successCount} mensaje(s) enviado(s)`);
      queryClient.invalidateQueries({ queryKey: ['communicationHistory'] });
      resetForm();
      onClose();
    } catch (error) {
      console.error("Error enviando mensajes:", error);
      toast.error("Error al enviar algunos mensajes");
    } finally {
      setLoading(false);
    }
  };

  // Obtener sugerencias de seguimiento con IA
  const getFollowUpSuggestions = async () => {
    setLoading(true);
    try {
      const recentComms = communicationHistory.slice(0, 10);
      const pendingPaymentsCount = payments.filter(p => p.estado === "Pendiente").length;
      const newMembersCount = players.filter(p => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return new Date(p.created_date) >= thirtyDaysAgo;
      }).length;

      const prompt = `Analiza el historial de comunicaciones y datos del club para sugerir acciones de seguimiento.

COMUNICACIONES RECIENTES:
${JSON.stringify(recentComms.map(c => ({
  tipo: c.tipo,
  plantilla: c.plantilla,
  fecha: c.created_date,
  destinatarios: c.destinatarios_count
})))}

DATOS ACTUALES:
- Pagos pendientes: ${pendingPaymentsCount}
- Nuevos miembros (30 días): ${newMembersCount}
- Total jugadores activos: ${players.filter(p => p.activo).length}

Sugiere 3-5 acciones de comunicación prioritarias con justificación.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            sugerencias: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  accion: { type: "string" },
                  prioridad: { type: "string", enum: ["alta", "media", "baja"] },
                  segmento_sugerido: { type: "string" },
                  plantilla_sugerida: { type: "string" },
                  justificacion: { type: "string" }
                }
              }
            }
          }
        }
      });

      setAiSuggestions(response.sugerencias || []);
      setShowHistory(true);
    } catch (error) {
      console.error("Error obteniendo sugerencias:", error);
      toast.error("Error al obtener sugerencias");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setSelectedTemplate(null);
    setSelectedSegment(null);
    setSelectedCategory("");
    setCustomPrompt("");
    setGeneratedMessage("");
    setGeneratedSubject("");
    setSelectedRecipients([]);
    setAiSuggestions(null);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copiado al portapapeles");
  };

  return (
    <Dialog open={open} onOpenChange={() => { resetForm(); onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Asistente de Comunicación IA
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="compose" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="compose" className="flex-1">
              <Mail className="h-4 w-4 mr-2" />
              Redactar
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1">
              <History className="h-4 w-4 mr-2" />
              Historial
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="flex-1">
              <Sparkles className="h-4 w-4 mr-2" />
              Sugerencias IA
            </TabsTrigger>
          </TabsList>

          {/* Tab Redactar */}
          <TabsContent value="compose" className="space-y-6 mt-4">
            {/* Progress Steps */}
            <div className="flex items-center justify-between mb-4">
              {[
                { num: 1, label: "Plantilla" },
                { num: 2, label: "Destinatarios" },
                { num: 3, label: "Personalizar" },
                { num: 4, label: "Revisar y Enviar" }
              ].map((s, i) => (
                <div key={s.num} className="flex items-center">
                  <div 
                    className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold cursor-pointer transition-all ${
                      step >= s.num 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-slate-200 text-slate-500'
                    }`}
                    onClick={() => step > s.num && setStep(s.num)}
                  >
                    {step > s.num ? <Check className="h-4 w-4" /> : s.num}
                  </div>
                  <span className={`ml-2 text-xs hidden md:inline ${step >= s.num ? 'text-purple-600 font-medium' : 'text-slate-500'}`}>
                    {s.label}
                  </span>
                  {i < 3 && <ChevronRight className="h-4 w-4 mx-2 text-slate-300" />}
                </div>
              ))}
            </div>

            {/* Step 1: Seleccionar Plantilla */}
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900">¿Qué tipo de mensaje quieres enviar?</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.values(MESSAGE_TEMPLATES).map(template => {
                    const Icon = template.icon;
                    return (
                      <Card 
                        key={template.id}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          selectedTemplate === template.id 
                            ? 'border-purple-500 ring-2 ring-purple-200' 
                            : 'hover:border-purple-300'
                        }`}
                        onClick={() => setSelectedTemplate(template.id)}
                      >
                        <CardContent className="p-4">
                          <div className={`w-10 h-10 rounded-lg ${template.bgColor} flex items-center justify-center mb-2`}>
                            <Icon className={`h-5 w-5 ${template.color}`} />
                          </div>
                          <p className="font-medium text-sm">{template.name}</p>
                          <p className="text-xs text-slate-500 mt-1">{template.description}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <div className="pt-4 border-t">
                  <Label>O describe tu mensaje personalizado:</Label>
                  <Textarea
                    placeholder="Ej: Quiero informar a los padres sobre el cambio de horario del partido del sábado..."
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    rows={3}
                    className="mt-2"
                  />
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={() => setStep(2)}
                    disabled={!selectedTemplate && !customPrompt}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Seleccionar Destinatarios */}
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900">¿A quién quieres enviar el mensaje?</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.values(MEMBER_SEGMENTS).map(segment => {
                    const Icon = segment.icon;
                    return (
                      <Card 
                        key={segment.id}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          selectedSegment === segment.id 
                            ? 'border-purple-500 ring-2 ring-purple-200' 
                            : 'hover:border-purple-300'
                        }`}
                        onClick={() => setSelectedSegment(segment.id)}
                      >
                        <CardContent className="p-4">
                          <Icon className="h-6 w-6 text-purple-600 mb-2" />
                          <p className="font-medium text-sm">{segment.name}</p>
                          <p className="text-xs text-slate-500 mt-1">{segment.description}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {selectedSegment === "by_category" && (
                  <div>
                    <Label>Selecciona la categoría:</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Elige categoría..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectedSegment && (
                  <Card className="bg-slate-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-medium text-sm">
                          Destinatarios encontrados: <Badge>{filteredRecipients.length}</Badge>
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedRecipients(
                            selectedRecipients.length === filteredRecipients.length 
                              ? [] 
                              : [...filteredRecipients]
                          )}
                        >
                          {selectedRecipients.length === filteredRecipients.length ? "Deseleccionar todos" : "Seleccionar todos"}
                        </Button>
                      </div>
                      
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {filteredRecipients.map((recipient, idx) => (
                          <div 
                            key={idx}
                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${
                              selectedRecipients.some(r => r.email === recipient.email)
                                ? 'bg-purple-100 border border-purple-300'
                                : 'bg-white border border-slate-200 hover:border-purple-200'
                            }`}
                            onClick={() => {
                              if (selectedRecipients.some(r => r.email === recipient.email)) {
                                setSelectedRecipients(selectedRecipients.filter(r => r.email !== recipient.email));
                              } else {
                                setSelectedRecipients([...selectedRecipients, recipient]);
                              }
                            }}
                          >
                            <Checkbox 
                              checked={selectedRecipients.some(r => r.email === recipient.email)}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{recipient.nombre_padre}</p>
                              <p className="text-xs text-slate-500 truncate">{recipient.email}</p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {recipient.jugadores.length} jugador(es)
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Atrás
                  </Button>
                  <Button 
                    onClick={() => setStep(3)}
                    disabled={selectedRecipients.length === 0}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Siguiente ({selectedRecipients.length} seleccionados)
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Personalizar */}
            {step === 3 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900">Personaliza tu mensaje</h3>

                <div>
                  <Label>Método de envío</Label>
                  <div className="flex gap-3 mt-2">
                    <Button
                      variant={sendMethod === "email" ? "default" : "outline"}
                      className={sendMethod === "email" ? "bg-purple-600" : ""}
                      onClick={() => setSendMethod("email")}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </Button>
                    <Button
                      variant={sendMethod === "chat" ? "default" : "outline"}
                      className={sendMethod === "chat" ? "bg-purple-600" : ""}
                      onClick={() => setSendMethod("chat")}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Chat Interno
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Instrucciones adicionales para la IA (opcional)</Label>
                  <Textarea
                    placeholder="Ej: Menciona que el plazo límite es el viernes, usa un tono más formal..."
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    rows={3}
                    className="mt-2"
                  />
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    Atrás
                  </Button>
                  <Button 
                    onClick={generateMessage}
                    disabled={loading}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generar Mensaje
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Revisar y Enviar */}
            {step === 4 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900">Revisa y envía tu mensaje</h3>

                {sendMethod === "email" && (
                  <div>
                    <Label>Asunto</Label>
                    <Input
                      value={generatedSubject}
                      onChange={(e) => setGeneratedSubject(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label>Mensaje</Label>
                    <Button variant="ghost" size="sm" onClick={copyToClipboard}>
                      {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Textarea
                    value={generatedMessage}
                    onChange={(e) => setGeneratedMessage(e.target.value)}
                    rows={10}
                    className="font-mono text-sm"
                  />
                </div>

                {aiSuggestions && aiSuggestions.length > 0 && (
                  <Card className="bg-purple-50 border-purple-200">
                    <CardContent className="p-4">
                      <p className="font-medium text-purple-900 mb-2 flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Sugerencias de la IA
                      </p>
                      <ul className="text-sm text-purple-800 space-y-1">
                        {aiSuggestions.map((s, i) => (
                          <li key={i}>• {typeof s === 'string' ? s : s.accion}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                <Card className="bg-slate-50">
                  <CardContent className="p-4">
                    <p className="text-sm text-slate-600 mb-2">
                      <strong>Resumen del envío:</strong>
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Método: <Badge>{sendMethod === "email" ? "Email" : "Chat"}</Badge></div>
                      <div>Destinatarios: <Badge>{selectedRecipients.length}</Badge></div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(3)}>
                      Atrás
                    </Button>
                    <Button variant="outline" onClick={generateMessage} disabled={loading}>
                      <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Regenerar
                    </Button>
                  </div>
                  <Button 
                    onClick={sendMessages}
                    disabled={loading || !generatedMessage}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Enviar a {selectedRecipients.length} destinatario(s)
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Tab Historial */}
          <TabsContent value="history" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Buscar en historial..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {communicationHistory
                  .filter(c => 
                    !searchTerm || 
                    c.asunto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    c.plantilla?.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((comm, idx) => (
                    <Card key={idx} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {comm.tipo === "email" ? (
                                <Mail className="h-4 w-4 text-blue-600" />
                              ) : (
                                <MessageCircle className="h-4 w-4 text-green-600" />
                              )}
                              <span className="font-medium text-sm">
                                {comm.asunto || MESSAGE_TEMPLATES[comm.plantilla]?.name || "Mensaje"}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {comm.destinatarios_count} destinatarios
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-2">
                              {comm.mensaje_preview}
                            </p>
                          </div>
                          <div className="text-right text-xs text-slate-500">
                            {comm.created_date && format(new Date(comm.created_date), "dd/MM/yy HH:mm", { locale: es })}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                {communicationHistory.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <History className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                    <p>No hay comunicaciones anteriores</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Tab Sugerencias IA */}
          <TabsContent value="suggestions" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  La IA analiza tus datos y te sugiere acciones de comunicación prioritarias
                </p>
                <Button 
                  onClick={getFollowUpSuggestions}
                  disabled={loading}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Obtener Sugerencias
                    </>
                  )}
                </Button>
              </div>

              {aiSuggestions && aiSuggestions.length > 0 && (
                <div className="space-y-3">
                  {aiSuggestions.map((sug, idx) => (
                    <Card 
                      key={idx} 
                      className={`cursor-pointer hover:shadow-md transition-all ${
                        sug.prioridad === 'alta' 
                          ? 'border-l-4 border-l-red-500' 
                          : sug.prioridad === 'media'
                            ? 'border-l-4 border-l-yellow-500'
                            : 'border-l-4 border-l-green-500'
                      }`}
                      onClick={() => {
                        if (sug.plantilla_sugerida && MESSAGE_TEMPLATES[sug.plantilla_sugerida]) {
                          setSelectedTemplate(sug.plantilla_sugerida);
                        }
                        if (sug.segmento_sugerido && MEMBER_SEGMENTS[sug.segmento_sugerido]) {
                          setSelectedSegment(sug.segmento_sugerido);
                        }
                        setStep(1);
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{sug.accion}</p>
                            <p className="text-sm text-slate-600 mt-1">{sug.justificacion}</p>
                            <div className="flex gap-2 mt-2">
                              {sug.plantilla_sugerida && (
                                <Badge variant="outline" className="text-xs">
                                  {MESSAGE_TEMPLATES[sug.plantilla_sugerida]?.name || sug.plantilla_sugerida}
                                </Badge>
                              )}
                              {sug.segmento_sugerido && (
                                <Badge variant="outline" className="text-xs">
                                  {MEMBER_SEGMENTS[sug.segmento_sugerido]?.name || sug.segmento_sugerido}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Badge className={`${
                            sug.prioridad === 'alta' 
                              ? 'bg-red-100 text-red-800' 
                              : sug.prioridad === 'media'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                          }`}>
                            {sug.prioridad}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {!aiSuggestions && (
                <div className="text-center py-12 text-slate-500">
                  <Sparkles className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                  <p>Pulsa "Obtener Sugerencias" para que la IA analice tus datos</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
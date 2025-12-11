import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, Loader2, Sparkles, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function AppChatbot() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      // Mensaje de bienvenida personalizado
      const welcomeMessage = {
        role: "assistant",
        content: getWelcomeMessage(currentUser),
        timestamp: new Date().toISOString()
      };
      setMessages([welcomeMessage]);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getWelcomeMessage = (user) => {
    const role = user.role === "admin" ? "administrador" :
                 user.es_coordinador ? "coordinador" :
                 user.es_tesorero ? "tesorero" :
                 user.es_entrenador ? "entrenador" :
                 user.es_jugador ? "jugador" : "familia";
    
    return `¡Hola ${user.full_name}! 👋

Soy tu **Asistente Virtual del CD Bustarviejo**. Estoy aquí para ayudarte con cualquier duda sobre la aplicación.

Puedes preguntarme sobre:
${getRoleSuggestions(role)}

¿En qué puedo ayudarte hoy?`;
  };

  const getRoleSuggestions = (role) => {
    const suggestions = {
      familia: `- 💳 Cómo realizar pagos de cuotas
- 🏆 Dónde ver las convocatorias de tus hijos
- 📄 Cómo subir documentos
- 🛍️ Hacer pedidos de ropa
- 📅 Consultar horarios de entrenamientos
- 🖊️ Firmar documentos de federación`,
      
      entrenador: `- 🎓 Crear y gestionar convocatorias
- 📋 Registrar asistencias
- ⚽ Usar la biblioteca de ejercicios
- 📊 Enviar reportes a familias
- 🎯 Usar la pizarra táctica`,
      
      coordinador: `- 💬 Gestionar comunicaciones
- 📊 Ver reportes de entrenadores
- 🎓 Supervisar convocatorias
- 👥 Gestionar equipos`,
      
      tesorero: `- 💰 Gestionar pagos y cuotas
- 📁 Ver histórico de pagos
- 🔔 Enviar recordatorios
- 📊 Panel financiero`,
      
      jugador: `- 🏆 Ver tus convocatorias
- 💳 Consultar tus pagos
- 📅 Ver el calendario de partidos
- 📢 Leer anuncios del club`,
      
      administrador: `- 👥 Gestionar usuarios y jugadores
- 💰 Supervisar pagos
- 📊 Ver estadísticas del club
- ⚙️ Configurar temporadas`
    };
    
    return suggestions[role] || suggestions.familia;
  };

  const getContextForRole = (user) => {
    const role = user.role === "admin" ? "administrador" :
                 user.es_coordinador ? "coordinador" :
                 user.es_tesorero ? "tesorero" :
                 user.es_entrenador ? "entrenador" :
                 user.es_jugador ? "jugador" : "padre/madre";
    
    return `
INFORMACIÓN DEL USUARIO:
- Rol: ${role}
- Nombre: ${user.full_name}
- Email: ${user.email}

CONTEXTO DE LA APLICACIÓN CD BUSTARVIEJO:

FUNCIONALIDADES PRINCIPALES:

1. PAGOS Y CUOTAS:
   - Los pagos se realizan desde "💳 Pagos" o "💳 Pagos Mis Hijos"
   - Hay dos opciones: pago único (junio) o 3 pagos (junio, septiembre, diciembre)
   - Método: Transferencia bancaria al IBAN que aparece en la app
   - Concepto: [Nombre jugador] - [Temporada] - [Mes]
   - Después de hacer la transferencia, subir el justificante en la app
   - Estado: Pendiente → En revisión → Pagado

2. CONVOCATORIAS:
   - Se ven en "🏆 Convocatorias" o "Confirmar Mis Hijos"
   - Los entrenadores crean convocatorias desde "🎓 Convocatorias"
   - Los padres confirman asistencia de sus hijos
   - Incluyen: fecha, hora, ubicación, rival, instrucciones

3. FIRMAS FEDERACIÓN:
   - Acceso desde "🖊️ Firmas Federación"
   - Obligatorias para todos los jugadores
   - Incluye firma del jugador (>14 años) y del tutor legal
   - Se accede mediante enlace único por email

4. PEDIDOS DE ROPA:
   - Desde "🛍️ Pedidos Ropa" o "Pedidos de Equipación"
   - Disponible en periodo de inscripciones (junio-julio)
   - Productos: chaqueta partidos, pack entrenamiento, chubasquero, anorak, mochila
   - Pago: transferencia con concepto específico

5. CALENDARIO Y HORARIOS:
   - Ver en "📅 Calendario y Horarios"
   - Muestra entrenamientos, partidos y eventos
   - Colores por categoría

6. DOCUMENTOS:
   - Subir desde "📄 Documentos" (para padres)
   - Incluye: DNI, libro familia, certificado médico, autorizaciones
   - Recordatorios automáticos si faltan

7. BIBLIOTECA DE EJERCICIOS (Entrenadores):
   - "📚 Biblioteca Ejercicios"
   - Crear, buscar y filtrar ejercicios
   - Planificador con IA: genera sesiones completas
   - Categorías: capacidad, potencia, técnica, táctica

8. ASISTENCIA Y EVALUACIÓN (Entrenadores):
   - "📋 Asistencia y Evaluación"
   - Registrar asistencia por sesión
   - Evaluar jugadores (técnica, táctica, física, actitud)
   - Enviar reportes a familias

9. CHATS:
   - Chat Coordinador: comunicación general
   - Chat Entrenador: específico del equipo
   - Chat Administrador: casos críticos

10. ANUNCIOS:
    - "📢 Anuncios"
    - Información del club por categoría
    - Prioridades: Normal, Importante, Urgente

NAVEGACIÓN:
- Menú lateral en escritorio
- Menú hamburguesa en móvil
- Buscador global disponible

ROLES Y PERMISOS:
- Admin: acceso total
- Coordinador: gestión deportiva
- Tesorero: gestión financiera
- Entrenador: gestión de su equipo
- Padres: ver info de sus hijos
- Jugadores +18: acceso propio

INSTRUCCIONES PARA EL ASISTENTE:
- Responde de forma clara, concisa y amigable
- Usa emojis para hacer las respuestas más cercanas
- Si preguntan cómo hacer algo, da pasos específicos y detallados
- Menciona SIEMPRE la ubicación exacta en el menú (ej: "Ve a 💳 Pagos")
- Si te preguntan algo que no sabes con certeza, explica lo que sí sabes sobre temas relacionados
- Sé útil, empático y proactivo
- NUNCA digas "contacta con el administrador" - intenta ayudar con la información disponible
- Si no conoces algo exacto, ofrece alternativas o información relacionada que pueda ser útil
- Mantén un tono positivo y de apoyo`;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = {
      role: "user",
      content: input,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Log de la conversación
      await base44.entities.ChatbotLog.create({
        user_email: user.email,
        user_role: user.role || "parent",
        question: input,
        timestamp: new Date().toISOString()
      });

      const conversationHistory = messages.slice(-6).map(m => ({
        role: m.role,
        content: m.content
      }));

      const prompt = `${getContextForRole(user)}

HISTORIAL DE CONVERSACIÓN:
${JSON.stringify(conversationHistory, null, 2)}

PREGUNTA ACTUAL DEL USUARIO:
${input}

Responde de forma clara, útil y amigable. Si mencionas una funcionalidad, indica EXACTAMENTE dónde encontrarla en el menú de la app.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
      });

      const assistantMessage = {
        role: "assistant",
        content: response,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Log de la respuesta
      await base44.entities.ChatbotLog.update(
        (await base44.entities.ChatbotLog.filter({ user_email: user.email }))[0]?.id,
        { response: response }
      );

    } catch (error) {
      console.error("Error getting response:", error);
      toast.error("Error al obtener respuesta");
      
      const errorMessage = {
        role: "assistant",
        content: "Lo siento, hubo un error técnico al procesar tu pregunta. 😔\n\nPor favor, inténtalo de nuevo reformulando tu pregunta. Si el problema persiste, puedes usar los chats de coordinador o entrenador para consultas específicas.",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickQuestions = [
    "¿Cómo realizo un pago?",
    "¿Dónde veo las convocatorias?",
    "¿Cómo subo documentos?",
    "¿Cuándo se abre la tienda de ropa?"
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto">
      <Card className="flex-1 flex flex-col border-none shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Bot className="w-7 h-7" />
            </div>
            <div>
              <CardTitle className="text-xl">Asistente Virtual</CardTitle>
              <p className="text-sm text-purple-100 mt-1">
                Pregúntame cualquier duda sobre la app
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-4 overflow-hidden">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            <AnimatePresence mode="popLayout">
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === "user"
                        ? "bg-orange-600 text-white"
                        : "bg-purple-50 text-slate-900 border border-purple-200"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        <span className="text-xs font-medium text-purple-600">Asistente</span>
                      </div>
                    )}
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-purple-50 border border-purple-200 rounded-2xl px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                  <span className="text-sm text-slate-600">Pensando...</span>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions */}
          {messages.length <= 1 && (
            <div className="mb-4">
              <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                <HelpCircle className="w-3 h-3" />
                Preguntas frecuentes:
              </p>
              <div className="flex flex-wrap gap-2">
                {quickQuestions.map((q, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    onClick={() => setInput(q)}
                    className="text-xs"
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe tu pregunta..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>

          <p className="text-xs text-slate-400 text-center mt-3">
            💡 Este es un asistente automático. Para consultas más complejas, usa los chats de coordinador o entrenador.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
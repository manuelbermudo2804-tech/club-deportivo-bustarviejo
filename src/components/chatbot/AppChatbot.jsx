import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
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

  // Obtener datos del club en tiempo real
  const { data: trainingSchedules = [] } = useQuery({
    queryKey: ['trainingSchedules'],
    queryFn: () => base44.entities.TrainingSchedule.list(),
    enabled: !!user,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['eventsForChatbot'],
    queryFn: () => base44.entities.Event.list('-fecha'),
    enabled: !!user,
  });

  const { data: callups = [] } = useQuery({
    queryKey: ['callupsForChatbot'],
    queryFn: () => base44.entities.Convocatoria.list('-fecha_partido'),
    enabled: !!user,
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ['announcementsForChatbot'],
    queryFn: () => base44.entities.Announcement.list('-created_date'),
    enabled: !!user,
  });

  const { data: seasonConfig } = useQuery({
    queryKey: ['seasonConfigChatbot'],
    queryFn: async () => {
      const configs = await base44.entities.SeasonConfig.list();
      return configs.find(c => c.activa === true);
    },
    enabled: !!user,
  });

  const { data: players = [] } = useQuery({
    queryKey: ['playersForChatbot'],
    queryFn: () => base44.entities.Player.list(),
    enabled: !!user,
  });

  const { data: categoryConfigs = [] } = useQuery({
    queryKey: ['categoryConfigsChatbot'],
    queryFn: () => base44.entities.CategoryConfig.list(),
    enabled: !!user,
  });

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
    
    // Obtener jugadores del usuario si es padre
    const myPlayers = players.filter(p => 
      p.email_padre === user.email || p.email_tutor_2 === user.email
    );

    // Filtrar horarios relevantes para el usuario
    const relevantSchedules = myPlayers.length > 0
      ? trainingSchedules.filter(s => myPlayers.some(p => p.deporte === s.categoria))
      : trainingSchedules;

    // Filtrar eventos próximos (siguientes 30 días)
    const today = new Date();
    const next30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const upcomingEvents = events.filter(e => {
      const eventDate = new Date(e.fecha);
      return eventDate >= today && eventDate <= next30Days && e.publicado;
    }).slice(0, 10);

    // Filtrar convocatorias próximas
    const upcomingCallups = callups.filter(c => {
      const callupDate = new Date(c.fecha_partido);
      return callupDate >= today && c.publicada && !c.cerrada;
    }).slice(0, 10);

    // Anuncios importantes activos
    const activeAnnouncements = announcements.filter(a => {
      if (!a.publicado) return false;
      if (a.fecha_expiracion && new Date(a.fecha_expiracion) < today) return false;
      return a.prioridad === "Urgente" || a.prioridad === "Importante";
    }).slice(0, 5);

    // Construir información de horarios
    let schedulesInfo = "";
    if (relevantSchedules.length > 0) {
      schedulesInfo = "\nHORARIOS DE ENTRENAMIENTOS:\n";
      relevantSchedules.forEach(s => {
        schedulesInfo += `- ${s.categoria}: ${s.dia_semana} de ${s.hora_inicio} a ${s.hora_fin}${s.ubicacion ? ` en ${s.ubicacion}` : ''}\n`;
      });
    }

    // Construir información de eventos
    let eventsInfo = "";
    if (upcomingEvents.length > 0) {
      eventsInfo = "\nPRÓXIMOS EVENTOS DEL CLUB:\n";
      upcomingEvents.forEach(e => {
        eventsInfo += `- ${e.titulo} (${e.tipo}): ${e.fecha}${e.hora ? ` a las ${e.hora}` : ''}${e.ubicacion ? ` en ${e.ubicacion}` : ''}\n`;
      });
    }

    // Construir información de convocatorias
    let callupsInfo = "";
    if (upcomingCallups.length > 0) {
      callupsInfo = "\nPRÓXIMAS CONVOCATORIAS/PARTIDOS:\n";
      upcomingCallups.forEach(c => {
        callupsInfo += `- ${c.titulo} (${c.categoria}): ${c.fecha_partido} a las ${c.hora_partido} vs ${c.rival || 'rival'} - ${c.local_visitante}${c.ubicacion ? ` en ${c.ubicacion}` : ''}\n`;
      });
    }

    // Información de anuncios importantes
    let announcementsInfo = "";
    if (activeAnnouncements.length > 0) {
      announcementsInfo = "\nANUNCIOS IMPORTANTES ACTIVOS:\n";
      activeAnnouncements.forEach(a => {
        announcementsInfo += `- [${a.prioridad}] ${a.titulo}: ${a.contenido.substring(0, 150)}...\n`;
      });
    }

    // Información de configuración del club
    let clubPolicies = "";
    if (seasonConfig) {
      clubPolicies = `
POLÍTICAS Y CONFIGURACIÓN ACTUAL DEL CLUB:
- Temporada activa: ${seasonConfig.temporada}
- Cuota pago único: ${seasonConfig.cuota_unica}€
- Cuota fraccionada (cada pago): ${seasonConfig.cuota_tres_meses}€
- Renovaciones abiertas: ${seasonConfig.permitir_renovaciones ? 'Sí' : 'No'}
- Tienda de ropa: ${seasonConfig.tienda_ropa_abierta ? 'ABIERTA ✅' : 'CERRADA ❌'}
- Lotería navidad: ${seasonConfig.loteria_navidad_abierta ? 'ABIERTA ✅' : 'CERRADA ❌'}
- Precio décimo lotería: ${seasonConfig.precio_decimo_loteria}€
- Bizum activo: ${seasonConfig.bizum_activo ? 'SÍ' : 'NO'}${seasonConfig.bizum_activo ? ` (${seasonConfig.bizum_telefono})` : ''}
- Programa referidos: ${seasonConfig.programa_referidos_activo ? 'ACTIVO ✅' : 'INACTIVO ❌'}
`;
    }

    // Información de jugadores del usuario
    let playersInfo = "";
    if (myPlayers.length > 0) {
      playersInfo = `\nJUGADORES DEL USUARIO:\n`;
      myPlayers.forEach(p => {
        playersInfo += `- ${p.nombre} (${p.deporte}) - ${p.posicion || 'sin posición'}${p.lesionado ? ' - LESIONADO' : ''}${p.sancionado ? ' - SANCIONADO' : ''}\n`;
      });
    }

    // Información de plazas disponibles por categoría
    let categoryInfo = "";
    if (categoryConfigs.length > 0) {
      categoryInfo = `\nDISPONIBILIDAD DE PLAZAS POR CATEGORÍA:\n`;
      categoryConfigs
        .filter(c => c.activa)
        .forEach(c => {
          const totalPlayers = players.filter(p => p.deporte === c.nombre && p.activo).length;
          const plazasDisponibles = c.plazas_maximas ? c.plazas_maximas - totalPlayers : "Sin límite";
          const estado = c.plazas_maximas && totalPlayers >= c.plazas_maximas ? "COMPLETO ❌" : "DISPONIBLE ✅";
          categoryInfo += `- ${c.nombre}: ${totalPlayers} inscritos${c.plazas_maximas ? ` / ${c.plazas_maximas} plazas` : ''} - ${estado}\n`;
        });
    }

    // Información sobre proceso de inscripción y renovación
    const inscriptionInfo = `
PROCESO DE INSCRIPCIÓN Y RENOVACIÓN:

📝 NUEVA INSCRIPCIÓN:
1. Ve a "👥 Mis Jugadores" → Botón "Añadir Jugador"
2. Completa el formulario con datos del jugador y tutor
3. Sube la foto tipo carnet (OBLIGATORIA)
4. Sube documentos: DNI/Libro familia + DNI tutor
5. Acepta política de privacidad y autorización de fotos
6. El jugador aparecerá como "Nuevo" hasta revisión del admin
7. Recibirás enlaces de firma federativa por email
8. Completa las firmas federativas (jugador + tutor)
9. Realiza el pago de inscripción desde "💳 Pagos"

🔄 RENOVACIÓN (jugadores de temporadas anteriores):
1. Ve a "👥 Mis Jugadores"
2. Busca el jugador a renovar
3. Pulsa botón "Renovar para [Temporada]"
4. Actualiza datos si es necesario
5. Confirma la renovación
6. Realiza el pago desde "💳 Pagos"
7. Completa nuevas firmas federativas si es necesario

💰 OPCIONES DE PAGO:
- Pago único (junio): ${seasonConfig?.cuota_unica || 0}€ - Descuento aplicado
- Pago fraccionado (3 meses): ${seasonConfig?.cuota_tres_meses || 0}€ cada pago (junio, septiembre, diciembre)
- Descuento hermanos: 25€ de descuento para hermanos menores

⏰ PERIODO DE INSCRIPCIONES:
- Junio-Julio: Inscripciones y renovaciones abiertas
- Agosto: Vacaciones (app cerrada)
- Septiembre: Inicio de temporada
- Mayo: Cierre de temporada (app cerrada)

📋 DOCUMENTOS OBLIGATORIOS:
- Foto tipo carnet del jugador
- DNI del jugador (si >14 años) o Libro de familia
- DNI del tutor legal (si jugador <18 años)
- Firmas federativas (enlaces por email)
- Certificado médico (recomendado)

🔍 VERIFICAR ESTADO:
- En "👥 Mis Jugadores" verás el estado de cada jugador
- Estados: Nuevo, Activo, Pendiente documentos, etc.
- En "💳 Pagos" verás el estado de los pagos
`;

    
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
- Usa la información de HORARIOS, EVENTOS, CONVOCATORIAS y POLÍTICAS proporcionada arriba para dar respuestas precisas
- Si te preguntan por horarios de entrenamientos, usa la información de HORARIOS DE ENTRENAMIENTOS
- Si te preguntan por partidos o eventos, usa la información de PRÓXIMOS EVENTOS y CONVOCATORIAS
- Si te preguntan sobre pagos, inscripciones o normas, usa la información de POLÍTICAS Y CONFIGURACIÓN
- Sé útil, empático y proactivo
- NUNCA digas "contacta con el administrador" - siempre intenta ayudar con la información disponible
- Si no conoces algo exacto, ofrece alternativas o información relacionada que pueda ser útil
- Mantén un tono positivo y de apoyo
- Cuando menciones eventos o convocatorias, incluye FECHA, HORA y UBICACIÓN si están disponibles
- Si preguntan sobre inscripciones o renovaciones, usa la información de PROCESO DE INSCRIPCIÓN Y RENOVACIÓN
- Si preguntan sobre plazas disponibles, usa la información de DISPONIBILIDAD DE PLAZAS
${clubPolicies}${playersInfo}${schedulesInfo}${eventsInfo}${callupsInfo}${announcementsInfo}${categoryInfo}${inscriptionInfo}`;
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
      console.log('🤖 [Chatbot] Iniciando consulta...');
      
      // Historial reducido de conversación (solo últimos 3 mensajes)
      const conversationHistory = messages.slice(-3).map(m => ({
        role: m.role,
        content: m.content.substring(0, 500) // Limitar tamaño
      }));

      // Construir contexto compacto
      const contextData = getContextForRole(user);
      
      console.log('🤖 [Chatbot] Tamaño del contexto:', contextData.length, 'caracteres');
      console.log('🤖 [Chatbot] Pregunta:', input);

      const prompt = `Eres el Asistente Virtual del CD Bustarviejo. Responde de forma clara y concisa en español.

${contextData}

HISTORIAL RECIENTE:
${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')}

PREGUNTA: ${input}

IMPORTANTE: 
- Responde en 2-3 párrafos máximo
- Usa emojis
- Si mencionas una funcionalidad, indica la ubicación en el menú (ej: "Ve a 💳 Pagos")
- Sé útil y directo`;

      console.log('🤖 [Chatbot] Llamando a InvokeLLM...');

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
      });

      console.log('✅ [Chatbot] Respuesta recibida:', response.substring(0, 100));

      const assistantMessage = {
        role: "assistant",
        content: response || "Lo siento, no pude generar una respuesta. Por favor, intenta reformular tu pregunta.",
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Log (en segundo plano, sin bloquear)
      try {
        await base44.entities.ChatbotLog.create({
          user_email: user.email,
          user_role: user.role || "parent",
          question: input,
          response: response,
          timestamp: new Date().toISOString()
        });
      } catch (logError) {
        console.warn('⚠️ [Chatbot] Error al guardar log:', logError);
      }

    } catch (error) {
      console.error("❌ [Chatbot] Error completo:", error);
      console.error("❌ [Chatbot] Stack:", error.stack);
      
      const errorMessage = {
        role: "assistant",
        content: `¡Ups! Hubo un problema técnico. 😔

Mientras tanto, aquí tienes algunas opciones:

📋 **Preguntas frecuentes:**
- Pagos: Ve a 💳 Pagos → Registrar Pago → Sube justificante
- Convocatorias: Ve a 🏆 Convocatorias → Confirmar asistencia
- Horarios: Ve a 📅 Calendario y Horarios
- Documentos: Ve a 📄 Documentos → Subir archivo

💬 Para consultas complejas, usa:
- Chat Coordinador: Para consultas generales
- Chat Entrenador: Para temas del equipo`,
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

  const quickQuestions = user?.es_entrenador || user?.role === "admin" || user?.es_coordinador
    ? [
        "¿Cómo crear una convocatoria?",
        "¿Dónde veo los horarios de entrenamientos?",
        "¿Cómo registro asistencia?",
        "¿Qué eventos hay próximamente?"
      ]
    : [
        "¿Cuándo entrena mi hijo?",
        "¿Cómo realizo un pago?",
        "¿Cuándo es el próximo partido?",
        "¿Está abierta la tienda de ropa?"
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
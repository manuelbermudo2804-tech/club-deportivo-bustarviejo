import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, HelpCircle, Sparkles, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { generateAnswer } from "./faqEngine";

export default function AppChatbot() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

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
      setMessages([{
        role: "assistant",
        content: getWelcomeMessage(currentUser),
      }]);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getWelcomeMessage = (u) => {
    const role = u.role === "admin" ? "administrador" :
                 u.es_coordinador ? "coordinador" :
                 u.es_tesorero ? "tesorero" :
                 u.es_entrenador ? "entrenador" :
                 u.es_jugador ? "jugador" : "familia";
    return `¡Hola ${u.full_name}! 👋\n\nSoy el **Asistente del CD Bustarviejo**. Puedo ayudarte con:\n\n- 📅 Horarios de entrenamiento\n- 💳 Pagos y cuotas\n- 🏆 Convocatorias y partidos\n- 🖊️ Firmas de federación\n- 🛍️ Tienda de equipación\n- 📢 Anuncios y eventos\n- 📄 Documentos\n\n¿En qué puedo ayudarte?`;
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);

    const myPlayers = players.filter(p =>
      p.email_padre === user.email || p.email_tutor_2 === user.email ||
      p.email_jugador === user.email
    );

    const answer = generateAnswer({
      question: input,
      user,
      myPlayers,
      trainingSchedules,
      events,
      callups,
      announcements,
      seasonConfig,
      categoryConfigs,
      allPlayers: players,
    });

    setMessages(prev => [...prev, { role: "assistant", content: answer }]);
    setInput("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickQuestions = user?.es_entrenador || user?.role === "admin" || user?.es_coordinador
    ? [
        "¿Horarios de entrenamiento?",
        "¿Próximos partidos?",
        "¿Anuncios activos?",
        "¿Eventos próximos?"
      ]
    : [
        "¿Cuándo entrena mi hijo?",
        "¿Cómo realizo un pago?",
        "¿Próximo partido?",
        "¿Está abierta la tienda?"
      ];

  return (
    <div className="mx-auto flex h-[calc(100dvh-12rem)] min-h-[420px] w-full min-w-0 max-w-[1100px] flex-col sm:h-[calc(100dvh-13rem)] lg:h-[calc(100dvh-11rem)]">
      <Card className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-900/5">
        <CardHeader className="border-b border-orange-500/20 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 pb-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10">
              <Bot className="w-7 h-7" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold tracking-tight text-white sm:text-xl">Asistente del Club</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Zap className="w-3 h-3 text-yellow-300" />
                <p className="text-xs leading-5 text-slate-300 sm:text-sm">Respuestas sobre la información del club</p>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-3 sm:p-5">
          {/* Messages */}
          <div className="mb-4 min-h-0 min-w-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto overscroll-contain pr-1">
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
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      message.role === "user"
                        ? "bg-orange-600 text-white"
                        : "border border-slate-200 bg-slate-50 text-slate-800 shadow-sm"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-orange-600" />
                        <span className="text-xs font-semibold text-slate-600">Asistente del club</span>
                      </div>
                    )}
                    <div className="prose prose-sm min-w-0 max-w-none break-words text-sm leading-relaxed prose-strong:text-inherit">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
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
                    className="h-auto max-w-full whitespace-normal rounded-xl border-slate-200 px-3 py-2 text-left text-xs leading-4 hover:border-orange-300 hover:bg-orange-50"
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="flex shrink-0 gap-2 border-t border-slate-100 bg-white pt-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe tu pregunta..."
              className="h-11 min-w-0 flex-1 rounded-xl border-slate-200 bg-slate-50 text-sm focus-visible:ring-orange-500"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim()}
              className="h-11 shrink-0 rounded-xl bg-orange-600 px-4 text-white shadow-sm hover:bg-orange-700"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>

          <p className="mt-3 shrink-0 text-center text-[11px] leading-4 text-slate-400 sm:text-xs">
            ⚡ Respuestas instantáneas basadas en datos reales del club. Para consultas complejas, usa los chats.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
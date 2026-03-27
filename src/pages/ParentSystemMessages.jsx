import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle2, Clock, AlertCircle, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import SocialLinks from "../components/SocialLinks";
import { useChatUnreadCounts } from "../components/chat/useChatUnreadCounts";

// Renderiza texto con enlaces markdown [texto](ruta) como links internos de la app
function RenderMessageText({ text }) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  return (
    <span>
      {parts.map((part, i) => {
        const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (match) {
          const label = match[1];
          const href = match[2];
          // Rutas internas (empiezan con /)
          if (href.startsWith("/")) {
            // Mapear rutas conocidas a nombres de página
            const routeBase = href.split("?")[0].replace("/", "").toLowerCase();
            const query = href.includes("?") ? "?" + href.split("?")[1] : "";
            const pageMap = {
              voluntariado: "Voluntariado",
              parentdashboard: "ParentDashboard",
              parentpayments: "ParentPayments",
              parentplayers: "ParentPlayers",
              parentcallups: "ParentCallups",
              announcements: "Announcements",
              calendarandschedules: "CalendarAndSchedules",
              gallery: "Gallery",
              surveys: "Surveys",
            };
            const pageName = pageMap[routeBase] || routeBase;
            return (
              <Link
                key={i}
                to={createPageUrl(pageName) + query}
                className="inline-block mt-2 px-4 py-2 bg-green-600 text-white font-bold rounded-xl text-sm hover:bg-green-700 transition-colors no-underline"
              >
                {label}
              </Link>
            );
          }
          return <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-medium">{label}</a>;
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

export default function ParentSystemMessages() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNewMessageButton, setShowNewMessageButton] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error loading user:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  // Buscar conversaciones privadas donde el padre es el usuario actual
  const { data: conversations = [] } = useQuery({
    queryKey: ['parentPrivateConversations', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const allConvs = await base44.entities.PrivateConversation.list('-ultimo_mensaje_fecha');
      return allConvs.filter(c => 
        c.participante_familia_email === user.email &&
        (c.participante_staff_rol === 'admin' || c.participante_staff_rol === 'entrenador' || c.participante_staff_email === 'sistema@cdbustarviejo.com')
      );
    },
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: 30000,
    gcTime: 300000,
    enabled: !!user?.email,
  });

  // Obtener mensajes de todas las conversaciones
  const { data: allMessages = [] } = useQuery({
    queryKey: ['parentPrivateMessages', conversations.map(c => c.id)],
    queryFn: async () => {
      if (conversations.length === 0) return [];
      const messages = await base44.entities.PrivateMessage.list('created_date');
      return messages.filter(m => 
        conversations.some(c => c.id === m.conversacion_id)
      );
    },
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: 30000,
    gcTime: 300000,
    enabled: conversations.length > 0,
  });

  // Suscripciones en tiempo real (sin polling)
  useEffect(() => {
    if (!user?.email) return;
    const unsubConv = base44.entities.PrivateConversation.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['parentPrivateConversations', user.email] });
    });
    return unsubConv;
  }, [user?.email, queryClient]);

  useEffect(() => {
    const unsubMsg = base44.entities.PrivateMessage.subscribe((event) => {
      if (conversations.some(c => c.id === event.data?.conversacion_id)) {
        queryClient.invalidateQueries({ queryKey: ['parentPrivateMessages'] });
      }
    });
    return unsubMsg;
  }, [conversations, queryClient]);

  // Marcar como leído via backend persistente
  const { markRead } = useChatUnreadCounts(user);
  useEffect(() => {
    if (!user) return;
    markRead('system', 'all');
  }, [user?.email]);



  // Scroll tracking para botón de mensajes nuevos
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      if (isAtBottom) {
        setShowNewMessageButton(false);
        setUnreadCount(0);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Detectar nuevos mensajes mientras no estás al final
  useEffect(() => {
    if (!containerRef.current || !allMessages || allMessages.length === 0) return;
    
    const container = containerRef.current;
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    
    if (!isAtBottom) {
      const unreadStaffMessages = allMessages.filter(msg => 
        msg.remitente_tipo === 'staff' && !msg.leido
      );
      
      if (unreadStaffMessages.length > 0) {
        setUnreadCount(unreadStaffMessages.length);
        setShowNewMessageButton(true);
      }
    }
  }, [allMessages]);

  // Auto-scroll al final al montar
  useEffect(() => {
    if (messagesEndRef.current && allMessages.length > 0) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [allMessages.length]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      setShowNewMessageButton(false);
      setUnreadCount(0);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Error al cargar usuario</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:p-4 lg:max-w-4xl lg:mx-auto space-y-2" style={{ height: 'calc(100dvh - 156px)', minHeight: '300px' }}>
      <div className="hidden lg:block">
        <SocialLinks />
      </div>
      <Card className="border-orange-200 shadow-lg h-full flex flex-col overflow-hidden lg:rounded-lg rounded-none">
        <CardHeader className="bg-gradient-to-r from-orange-600 to-orange-700 text-white flex-shrink-0 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
                Mensajes del Club
              </CardTitle>
              <p className="text-xs sm:text-sm text-orange-100 mt-1">
                Recordatorios y comunicaciones privadas de la administración
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 flex flex-col overflow-hidden min-h-0 relative">
          <div ref={containerRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-slate-50">
            {allMessages.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No hay mensajes del sistema</p>
                <p className="text-slate-400 text-xs mt-1">
                  Aquí recibirás recordatorios de pagos y otras comunicaciones importantes del club
                </p>
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-xl p-3 mb-4">
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm">🔒</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-blue-900 mb-1">Mensajes Privados</p>
                      <p className="text-xs text-blue-800 leading-relaxed">
                        Estos mensajes son <strong>privados y personales</strong> para tu familia. 
                        Solo tú los ves. No aparecen en los chats de grupo.
                      </p>
                    </div>
                  </div>
                </div>

                {allMessages.map((msg, idx) => {
                  const showDateSeparator = idx === 0 || 
                    new Date(allMessages[idx - 1].created_date).toDateString() !== 
                    new Date(msg.created_date).toDateString();
                  const dateLabel = new Date(msg.created_date).toLocaleDateString('es-ES', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long'
                  });

                  const isSystem = msg.remitente_email === 'sistema@cdbustarviejo.com';

                  return (
                    <React.Fragment key={msg.id}>
                      {showDateSeparator && (
                        <div className="flex justify-center my-4">
                          <div className="bg-white px-4 py-1 rounded-full text-xs text-slate-600 shadow-sm">
                            {dateLabel}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex justify-start mb-1">
                        <div className="max-w-[85%] bg-gray-100 text-gray-900 rounded-3xl px-4 py-2 shadow-none font-roboto text-sm leading-relaxed" style={{fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu, Cantarell, sans-serif'}}>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-xs font-semibold opacity-70">
                              {isSystem ? '🤖 Sistema de Recordatorios' : msg.remitente_nombre}
                            </p>
                          </div>
                          <p className="whitespace-pre-wrap" style={{color: '#000000', fontSize: '14.2px', lineHeight: '19px'}}>
                            <RenderMessageText text={msg.mensaje} />
                          </p>
                          
                          {msg.archivos_adjuntos?.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {msg.archivos_adjuntos.map((file, idx) => (
                                <a
                                  key={idx}
                                  href={file.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-xs p-2 rounded bg-white/20"
                                >
                                  <span className="flex-1 truncate">{file.nombre}</span>
                                </a>
                              ))}
                            </div>
                          )}
                          
                          <div className="flex items-center gap-1 justify-end mt-1">
                            <p className="text-xs opacity-60">
                              {format(new Date(msg.created_date), "HH:mm", { locale: es })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Botón flotante de mensajes nuevos */}
          {showNewMessageButton && unreadCount > 0 && (
            <Button
              onClick={scrollToBottom}
              className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-orange-600 hover:bg-orange-700 text-white shadow-xl animate-bounce z-10"
              size="lg"
            >
              <ChevronDown className="w-5 h-5 mr-2" />
              {unreadCount} {unreadCount === 1 ? 'mensaje nuevo' : 'mensajes nuevos'}
            </Button>
          )}

          <div className="p-3 sm:p-4 bg-gradient-to-r from-orange-50 to-orange-100 border-t flex-shrink-0">
            <div className="flex items-center gap-3 bg-white rounded-xl p-3 border-2 border-orange-300">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-orange-900">📬 Solo Lectura</p>
                <p className="text-xs text-orange-700">
                  Esta sección es solo para mensajes del sistema. Para contactar con el club, usa el chat de coordinador o entrenador.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
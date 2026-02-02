import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import SocialLinks from "../components/SocialLinks";
import { UnifiedChatNotificationStore } from "../components/notifications/UnifiedChatNotificationStore";
import { useChatNotificationMenuSidebar } from "../components/notifications/useChatNotificationMenuSidebar";

export default function ParentSystemMessages() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();
  
  // Badge del menú sincronizado
  const { systemMessagesCount } = useChatNotificationMenuSidebar(user);

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

   // Marcar mensajes como leídos INMEDIATAMENTE + LIMPIAR NOTIFICACIONES
  useEffect(() => {
    const markAsRead = async () => {
      if (!user) return;
      
      console.log(`🔍 [ParentSystemMessages] Conversaciones:`, conversations.length);
      console.log(`🔍 [ParentSystemMessages] Mensajes:`, allMessages.length);
      
      // 1. Marcar MENSAJES como leídos
      if (allMessages.length > 0) {
        const unreadMessages = allMessages.filter(m => 
          m.remitente_tipo === 'staff' && !m.leido
        );
        
        console.log(`🔍 [ParentSystemMessages] Mensajes sin leer:`, unreadMessages.length);
        
        for (const msg of unreadMessages) {
          await base44.entities.PrivateMessage.update(msg.id, { leido: true });
        }
        
        // Actualizar contador de no leídos en conversaciones
        for (const conv of conversations) {
          if (conv.no_leidos_familia > 0) {
            await base44.entities.PrivateConversation.update(conv.id, {
              no_leidos_familia: 0
            });
          }
        }

        // CORRECCIÓN #3: Sincronizar con UnifiedChatNotificationStore
        UnifiedChatNotificationStore.clearChatOnly(user.email, 'systemMessages');
        // Sincronizar contador global (ChatCounter) para todas las conversaciones privadas
        try {
          await Promise.all((conversations || []).map(c => base44.functions.invoke('chatMarkRead', { chatType: 'private', conversationId: c.id })));
        } catch {}
      }

      // 2. MARCAR NOTIFICACIONES COMO VISTAS
      try {
        const allNotifications = await base44.entities.AppNotification.list();
        const notificationsToMark = allNotifications.filter(n => 
          n.usuario_email === user.email &&
          n.enlace === "ParentSystemMessages" &&
          n.vista === false
        );

        console.log(`🔔 [ParentSystemMessages] Notificaciones sin ver:`, notificationsToMark.length);

        for (const notif of notificationsToMark) {
          await base44.entities.AppNotification.update(notif.id, {
            vista: true,
            fecha_vista: new Date().toISOString()
          });
        }

        // 3. INVALIDAR queries GLOBALES para actualizar INMEDIATAMENTE el dashboard
        if (notificationsToMark.length > 0 || allMessages.some(m => !m.leido)) {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['privateConversationsParent'] }),
            queryClient.invalidateQueries({ queryKey: ['appNotifications'] }),
            queryClient.refetchQueries({ queryKey: ['privateConversationsParent'] }),
          ]);
        }
      } catch (error) {
        console.error("Error marking notifications as read:", error);
      }
    };
    
    markAsRead();
  }, [allMessages.length, user, conversations.length, queryClient]);



  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [allMessages]);

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
    <div className="h-[calc(100vh-100px)] lg:p-4 lg:max-w-4xl lg:mx-auto lg:h-[calc(100vh-110px)] space-y-2">
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
        <CardContent className="p-0 flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-slate-50">
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
                          <p className="whitespace-pre-wrap" style={{color: '#000000', fontSize: '14.2px', lineHeight: '19px'}}>{msg.mensaje}</p>
                          
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
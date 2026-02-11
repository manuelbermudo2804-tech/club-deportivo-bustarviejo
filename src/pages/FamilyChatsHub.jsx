import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { MessageCircle, ChevronRight, Bell, Users, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function FamilyChatsHub() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  // Cargar jugadores del usuario
  const { data: players = [] } = useQuery({
    queryKey: ['playersChat', user?.email],
    queryFn: async () => {
      const allPlayers = await base44.entities.Player.filter({
        $or: [
          { email_padre: user?.email },
          { email_tutor_2: user?.email },
          { email_jugador: user?.email }
        ],
        activo: true
      });
      return allPlayers;
    },
    enabled: !!user,
  });

  // Obtener categorías únicas de mis jugadores
  const myCategories = [...new Set(players.map(p => p.categoria_principal || p.deporte).filter(Boolean))];

  // Normalizar grupo_id
  const normalizeId = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\(.*?\)/g,'').trim().replace(/\s+/g,'_');

  // Cargar últimos mensajes por cada categoría (Chat Equipo)
  const { data: teamChats = [] } = useQuery({
    queryKey: ['teamChatsHub', user?.email],
    queryFn: async () => {
      if (myCategories.length === 0) return [];
      
      const allMessages = await base44.entities.ChatMessage.list('-created_date', 100);
      
      // Agrupar por grupo_id
      const groupedByTeam = {};
      myCategories.forEach(cat => {
        const groupId = normalizeId(cat);
        const messagesInGroup = allMessages.filter(m => m.grupo_id === groupId);
        if (messagesInGroup.length > 0) {
          groupedByTeam[groupId] = {
            categoryName: cat,
            groupId,
            lastMessage: messagesInGroup[0],
            unreadCount: 0 // TODO: Implementar con nuevo sistema
          };
        }
      });
      
      return Object.values(groupedByTeam).sort((a, b) => 
        new Date(b.lastMessage.created_date) - new Date(a.lastMessage.created_date)
      );
    },
    enabled: !!user && myCategories.length > 0,
  });

  // Conversación con Coordinador
  const { data: coordinatorConv = [] } = useQuery({
    queryKey: ['coordinatorConvHub', user?.email],
    queryFn: async () => {
      const convs = await base44.entities.CoordinatorConversation.filter({ 
        padre_email: user?.email 
      });
      return convs;
    },
    enabled: !!user,
  });

  // Conversación con Admin
  const { data: adminConv = [] } = useQuery({
    queryKey: ['adminConvHub', user?.email],
    queryFn: async () => {
      const convs = await base44.entities.AdminConversation.filter({ 
        padre_email: user?.email,
        resuelta: false
      });
      return convs;
    },
    enabled: !!user,
  });

  // Mensajes del Club (Sistema)
  const { data: systemConv = [] } = useQuery({
    queryKey: ['systemConvHub', user?.email],
    queryFn: async () => {
      const convs = await base44.entities.PrivateConversation.filter({ 
        participante_familia_email: user?.email 
      });
      return convs;
    },
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  const ConversationRow = ({ title, subtitle, lastMessage, lastMessageDate, unreadCount, url, icon: Icon, color, iconBg }) => (
    <Link to={url}>
      <Card className="hover:shadow-lg transition-all cursor-pointer border-l-4" style={{ borderLeftColor: color }}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 ${iconBg} rounded-full flex items-center justify-center flex-shrink-0`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-bold text-slate-900 text-sm truncate">{title}</p>
                {unreadCount > 0 && (
                  <Badge className="bg-red-500 text-white">{unreadCount}</Badge>
                )}
              </div>
              {subtitle && (
                <p className="text-xs text-slate-500 mb-1">{subtitle}</p>
              )}
              {lastMessage && (
                <p className="text-xs text-slate-600 truncate">{lastMessage}</p>
              )}
              {lastMessageDate && (
                <p className="text-xs text-slate-400 mt-1">
                  {format(new Date(lastMessageDate), "dd MMM, HH:mm", { locale: es })}
                </p>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-6 space-y-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">💬 Mis Conversaciones</h1>
            <p className="text-sm text-slate-600">Todos tus chats con el club</p>
          </div>
        </div>

        {/* SECCIÓN 1: EQUIPOS */}
        {teamChats.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-600" />
              <h2 className="font-bold text-slate-900">Chats de Equipo</h2>
            </div>
            {teamChats.map(chat => (
              <ConversationRow
                key={chat.groupId}
                title={chat.categoryName}
                subtitle="Chat grupal con entrenador y familias"
                lastMessage={chat.lastMessage.mensaje}
                lastMessageDate={chat.lastMessage.created_date}
                unreadCount={chat.unreadCount}
                url={createPageUrl("ParentCoachChat") + `?category=${encodeURIComponent(chat.categoryName)}`}
                icon={Users}
                color="#3b82f6"
                iconBg="bg-blue-600"
              />
            ))}
          </div>
        )}

        {/* SECCIÓN 2: CONVERSACIONES PRIVADAS */}
        <div className="space-y-3 mt-8">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-slate-600" />
            <h2 className="font-bold text-slate-900">Conversaciones Privadas</h2>
          </div>

          {/* Mensajes del Club - AGRUPADO */}
          {systemConv.length > 0 && (
            <ConversationRow
              title="🔔 Mensajes del Club"
              subtitle="Comunicación oficial del club"
              lastMessage={systemConv[0]?.ultimo_mensaje}
              lastMessageDate={systemConv[0]?.ultimo_mensaje_fecha}
              unreadCount={systemConv.reduce((sum, c) => sum + (c.no_leidos_familia || 0), 0)}
              url={createPageUrl("ParentSystemMessages")}
              icon={Bell}
              color="#a855f7"
              iconBg="bg-purple-600"
            />
          )}

          {/* Coordinador */}
          {coordinatorConv.map(conv => (
            <ConversationRow
              key={conv.id}
              title="🏟️ Coordinador Deportivo"
              subtitle="Conversación 1 a 1 con el coordinador"
              lastMessage={conv.ultimo_mensaje}
              lastMessageDate={conv.ultimo_mensaje_fecha}
              unreadCount={conv.no_leidos_padre || 0}
              url={createPageUrl("ParentCoordinatorChat")}
              icon={MessageCircle}
              color="#06b6d4"
              iconBg="bg-cyan-600"
            />
          ))}

          {/* Administración */}
          {adminConv.map(conv => (
            <ConversationRow
              key={conv.id}
              title="🛡️ Administración"
              subtitle="Chat directo con administración del club"
              lastMessage={conv.ultimo_mensaje}
              lastMessageDate={conv.ultimo_mensaje_fecha}
              unreadCount={conv.no_leidos_padre || 0}
              url={createPageUrl("AdminChat") + `?convId=${conv.id}`}
              icon={Shield}
              color="#ef4444"
              iconBg="bg-red-600"
            />
          ))}

          {/* Mensaje cuando no hay conversaciones privadas */}
          {systemConv.length === 0 && coordinatorConv.length === 0 && adminConv.length === 0 && (
            <Card className="bg-slate-50 border-slate-200">
              <CardContent className="p-6 text-center">
                <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No tienes conversaciones privadas activas</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Mensaje cuando no hay ningún chat */}
        {teamChats.length === 0 && systemConv.length === 0 && coordinatorConv.length === 0 && adminConv.length === 0 && (
          <Card className="bg-white border-orange-200 mt-8">
            <CardContent className="p-8 text-center">
              <MessageCircle className="w-16 h-16 text-orange-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-900 text-lg mb-2">Sin conversaciones</h3>
              <p className="text-sm text-slate-600">
                Tus conversaciones con entrenadores, coordinación y administración aparecerán aquí
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
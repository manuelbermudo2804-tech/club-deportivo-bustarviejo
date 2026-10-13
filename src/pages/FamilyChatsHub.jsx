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
import { parseChatDate } from "@/lib/chatDate";
import { useChatUnreadCounts } from "../components/chat/useChatUnreadCounts";

export default function FamilyChatsHub() {
  const [user, setUser] = useState(null);
  const { counts: chatCounts } = useChatUnreadCounts(user);

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
  // SIEMPRE mostrar una fila por categoría, aunque no haya mensajes
  const { data: teamChats = [] } = useQuery({
    queryKey: ['teamChatsHub', user?.email, myCategories.join(',')],
    queryFn: async () => {
      if (myCategories.length === 0) return [];
      
      const allMessages = await base44.entities.ChatMessage.list('-created_date', 100);
      
      // Crear una entrada por CADA categoría (tenga o no mensajes)
      return myCategories.map(cat => {
        const groupId = normalizeId(cat);
        const messagesInGroup = allMessages.filter(m => m.grupo_id === groupId);
        return {
          categoryName: cat,
          groupId,
          lastMessage: messagesInGroup.length > 0 ? messagesInGroup[0] : null,
          unreadCount: 0
        };
      }).sort((a, b) => {
        // Las que tienen mensajes primero, luego por fecha
        if (a.lastMessage && !b.lastMessage) return -1;
        if (!a.lastMessage && b.lastMessage) return 1;
        if (a.lastMessage && b.lastMessage) {
          return new Date(b.lastMessage.created_date) - new Date(a.lastMessage.created_date);
        }
        return 0;
      });
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
      <Card className="group cursor-pointer rounded-2xl border border-slate-200 border-l-4 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md" style={{ borderLeftColor: color }}>
        <CardContent className="p-3 sm:p-4">
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
                  {format(parseChatDate(lastMessageDate), "dd MMM, HH:mm", { locale: es })}
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
    <div className="mx-auto w-full min-w-0 max-w-[1600px] space-y-5 overflow-x-hidden px-3 pb-24 pt-4 sm:px-5 lg:space-y-6 lg:px-8 lg:pt-7">
      <div className="w-full min-w-0 space-y-6">
        <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-lg sm:p-7">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl" />
          <div className="relative flex min-w-0 items-start gap-3 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-400/15 ring-1 ring-orange-200/20 sm:h-14 sm:w-14"><MessageCircle className="h-6 w-6 text-orange-300 sm:h-7 sm:w-7" /></div>
            <div className="min-w-0"><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">Comunicación · Club Deportivo Bustarviejo</p><h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Mis Conversaciones</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">Todos tus chats con el club, equipos y coordinación.</p></div>
          </div>
        </section>

        {/* SECCIÓN 1: EQUIPOS - siempre una fila por cada categoría de mis hijos */}
        {myCategories.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-600" />
              <h2 className="font-bold text-slate-900">Chats de Equipo</h2>
              {myCategories.length > 1 && (
                <Badge variant="outline" className="text-xs">{myCategories.length} equipos</Badge>
              )}
            </div>
            {myCategories.map(cat => {
              const chatData = teamChats.find(c => c.categoryName === cat);
              const playersInCat = players.filter(p => (p.categoria_principal || p.deporte) === cat);
              const playerNames = playersInCat.map(p => p.nombre?.split(' ')[0]).join(', ');
              return (
                <ConversationRow
                  key={cat}
                  title={`⚽ ${cat}`}
                  subtitle={playerNames ? `${playerNames} · Chat grupal con entrenador` : "Chat grupal con entrenador y familias"}
                  lastMessage={chatData?.lastMessage?.mensaje || null}
                  lastMessageDate={chatData?.lastMessage?.created_date || null}
                  unreadCount={(chatCounts.team_chats || {})[normalizeId(cat)] || 0}
                  url={createPageUrl("ParentCoachChat") + `?category=${encodeURIComponent(cat)}`}
                  icon={Users}
                  color="#3b82f6"
                  iconBg="bg-blue-600"
                />
              );
            })}
          </div>
        )}

        {/* SECCIÓN 2: CONVERSACIONES PRIVADAS */}
        <div className="space-y-3 mt-8">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-slate-600" />
            <h2 className="font-bold text-slate-900">Conversaciones Privadas</h2>
          </div>

          {/* Mensajes del Club - SIEMPRE VISIBLE */}
          <ConversationRow
            title="🔔 Mensajes del Club"
            subtitle="Comunicación oficial del club"
            lastMessage={systemConv[0]?.ultimo_mensaje}
            lastMessageDate={systemConv[0]?.ultimo_mensaje_fecha}
            unreadCount={chatCounts.system || 0}
            url={createPageUrl("ParentSystemMessages")}
            icon={Bell}
            color="#a855f7"
            iconBg="bg-purple-600"
          />

          {/* Coordinador - SIEMPRE visible */}
          {coordinatorConv.length > 0 ? (
            coordinatorConv.map(conv => (
              <ConversationRow
                key={conv.id}
                title="🏟️ Coordinador Deportivo"
                subtitle="Conversación 1 a 1 con el coordinador"
                lastMessage={conv.ultimo_mensaje}
                lastMessageDate={conv.ultimo_mensaje_fecha}
                unreadCount={chatCounts.coordinator || 0}
                url={createPageUrl("ParentCoordinatorChat")}
                icon={MessageCircle}
                color="#06b6d4"
                iconBg="bg-cyan-600"
              />
            ))
          ) : (
            <ConversationRow
              title="🏟️ Coordinador Deportivo"
              subtitle="Escribe tu primera consulta al coordinador"
              lastMessage={null}
              lastMessageDate={null}
              unreadCount={0}
              url={createPageUrl("ParentCoordinatorChat")}
              icon={MessageCircle}
              color="#06b6d4"
              iconBg="bg-cyan-600"
            />
          )}

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

          {/* Mensaje eliminado - el coordinador siempre está visible */}
        </div>

        {/* Mensaje eliminado - el coordinador siempre está visible */}
      </div>
    </div>
  );
}
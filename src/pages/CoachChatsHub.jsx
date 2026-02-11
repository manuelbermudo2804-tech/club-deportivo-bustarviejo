import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Users, Briefcase, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useChatNotificationMenuSidebar } from "@/components/notifications/useChatNotificationMenuSidebar";
import { format } from "date-fns";
import { es } from "date-fns/locale";

function ConversationRow({ title, subtitle, lastMessage, lastMessageDate, unreadCount, url, icon: Icon, color, iconBg }) {
  return (
    <Link to={url} className="block">
      <Card className="p-4 hover:shadow-md transition-all border-l-4" style={{ borderLeftColor: color }}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-full ${iconBg} flex items-center justify-center flex-shrink-0`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="font-bold text-slate-900 truncate">{title}</h3>
              {unreadCount > 0 && (
                <Badge className="bg-red-500 text-white">{unreadCount}</Badge>
              )}
            </div>
            <p className="text-sm text-slate-600 truncate">{subtitle}</p>
            {lastMessage && (
              <p className="text-xs text-slate-500 truncate mt-1">{lastMessage}</p>
            )}
            {lastMessageDate && (
              <p className="text-xs text-slate-400 mt-1">
                {format(new Date(lastMessageDate), "d MMM HH:mm", { locale: es })}
              </p>
            )}
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
        </div>
      </Card>
    </Link>
  );
}

export default function CoachChatsHub() {
  const [user, setUser] = useState(null);
  const chatCounts = useChatNotificationMenuSidebar(user);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  // Obtener todas las categorías del entrenador
  const myCategories = user?.categorias_entrena || [];

  // Obtener últimos mensajes por categoría
  const { data: latestMessages = [] } = useQuery({
    queryKey: ['coachLatestMessages', user?.email],
    queryFn: async () => {
      if (!user?.email || myCategories.length === 0) return [];
      
      const normalizeId = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\(.*?\)/g,'').trim().replace(/\s+/g,'_');
      
      const messages = await base44.entities.ChatMessage.list('-created_date', 100);
      
      // Obtener último mensaje por cada categoría
      const latestByCategory = {};
      for (const cat of myCategories) {
        const groupId = normalizeId(cat);
        const catMessages = messages.filter(m => m.grupo_id === groupId);
        if (catMessages.length > 0) {
          latestByCategory[cat] = catMessages[0];
        }
      }
      
      return latestByCategory;
    },
    enabled: !!user && myCategories.length > 0,
    staleTime: 30000,
  });

  // Calcular no leídos por categoría
  const { data: unreadByCategory = {} } = useQuery({
    queryKey: ['coachUnreadByCategory', user?.email],
    queryFn: async () => {
      if (!user?.email || myCategories.length === 0) return {};
      
      const normalizeId = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\(.*?\)/g,'').trim().replace(/\s+/g,'_');
      
      const messages = await base44.entities.ChatMessage.list('-created_date', 200);
      
      const unreadCounts = {};
      for (const cat of myCategories) {
        const groupId = normalizeId(cat);
        const unread = messages.filter(m => 
          m.grupo_id === groupId &&
          m.tipo === 'padre_a_grupo' &&
          m.remitente_email !== user.email &&
          (!m.leido_por || !m.leido_por.some(r => r.email === user.email))
        ).length;
        unreadCounts[cat] = unread;
      }
      
      return unreadCounts;
    },
    enabled: !!user && myCategories.length > 0,
    staleTime: 30000,
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 pb-24">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">💬 Mis Chats</h1>
          <p className="text-slate-600">Todas tus conversaciones en un solo lugar</p>
        </div>

        {/* Chats de Equipos - Separados por categoría si tiene múltiples */}
        {myCategories.length > 1 ? (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800 px-2">⚽ Chats por Equipo</h2>
            {myCategories.map((categoria) => {
              const lastMsg = latestMessages[categoria];
              const unread = unreadByCategory[categoria] || 0;
              
              return (
                <ConversationRow
                  key={categoria}
                  title={categoria}
                  subtitle="Chat grupal con familias de este equipo"
                  lastMessage={lastMsg?.mensaje}
                  lastMessageDate={lastMsg?.created_date}
                  unreadCount={unread}
                  url={`${createPageUrl("CoachParentChat")}?categoria=${encodeURIComponent(categoria)}`}
                  icon={Users}
                  color="#3b82f6"
                  iconBg="bg-blue-600"
                />
              );
            })}
          </div>
        ) : (
          // Si solo tiene una categoría, mostrar un solo chat
          <ConversationRow
            title="⚽ Chat con Familias"
            subtitle="Comunicación grupal con los padres de tu equipo"
            unreadCount={chatCounts.coachCount || 0}
            url={createPageUrl("CoachParentChat")}
            icon={Users}
            color="#3b82f6"
            iconBg="bg-blue-600"
          />
        )}

        {/* Chat Staff */}
        <div className="space-y-4 mt-6">
          <h2 className="text-lg font-bold text-slate-800 px-2">💼 Chats Internos</h2>
          <ConversationRow
            title="💼 Chat Staff"
            subtitle="Conversaciones internas del personal del club"
            unreadCount={chatCounts.staffCount || 0}
            url={createPageUrl("StaffChat")}
            icon={Briefcase}
            color="#8b5cf6"
            iconBg="bg-purple-600"
          />
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { MessageCircle, Users, Briefcase, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useChatUnreadCounts } from "../components/chat/useChatUnreadCounts";
import MyKidsChatsSection from "@/components/chat/MyKidsChatsSection";
import useTeamChatCategories from "@/hooks/useTeamChatCategories";

// Normalización consistente con backend
import { toGroupId } from "@/lib/chatGroupId";

function ConversationRow({ title, subtitle, lastMessage, lastMessageDate, unreadCount, url, icon: Icon, color, iconBg }) {
  return (
    <Link to={url} className="block">
      <Card className="group min-w-0 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-4" style={{ borderLeftWidth: 4, borderLeftColor: color }}>
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg} shadow-sm sm:h-12 sm:w-12`}>
            <Icon className="h-5 w-5 text-white sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex min-w-0 items-center gap-2">
              <h3 className="min-w-0 flex-1 break-words font-bold text-slate-900">{title}</h3>
              {unreadCount > 0 && (
                <Badge className="shrink-0 rounded-full bg-red-500 px-2 text-white">{unreadCount}</Badge>
              )}
            </div>
            <p className="text-sm text-slate-600">{subtitle}</p>
            {lastMessage && (
              <p className="mt-1 truncate text-xs text-slate-500">{lastMessage}</p>
            )}
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
        </div>
      </Card>
    </Link>
  );
}

export default function CoordinatorChatsHub() {
  const [user, setUser] = useState(null);
  const { counts: chatCounts } = useChatUnreadCounts(user);
  const teamCats = useTeamChatCategories(user);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto box-border w-full min-w-0 max-w-[1600px] space-y-5 overflow-x-hidden px-3 pb-24 pt-4 sm:space-y-6 sm:px-5 lg:px-8 lg:pt-7 [&_*]:min-w-0">
      <div className="mx-auto w-full min-w-0 space-y-5 sm:space-y-6">
        <header className="relative isolate min-w-0 overflow-hidden rounded-3xl border border-orange-500/20 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-lg sm:p-7">
          <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-orange-500/10 blur-3xl" />
          <div className="relative min-w-0">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-orange-300">Coordinación · Comunicación</p>
            <h1 className="break-words text-2xl font-bold tracking-tight text-white sm:text-3xl">Mis chats</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-300 sm:text-base">Todas tus conversaciones en un solo lugar.</p>
          </div>
        </header>
        <div className="space-y-3 sm:space-y-4">
          <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 ring-1 ring-orange-100">
              <MessageCircle className="h-5 w-5 text-orange-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-slate-900">Tus conversaciones</h2>
              <p className="text-xs text-slate-500 sm:text-sm">Familias, equipos y personal del club</p>
            </div>
          </div>

        {/* Chat Familias - Coordinador */}
        <ConversationRow
          title="💬 Chat con Familias (1-a-1)"
          subtitle="Conversaciones privadas con los padres"
          unreadCount={chatCounts.coordinator || 0}
          url={createPageUrl("CoordinatorChat")}
          icon={MessageCircle}
          color="#06b6d4"
          iconBg="bg-cyan-600"
        />

        {/* Chats de ENTRENADOR por categoría (individuales) */}
        {teamCats.map((cat) => (
          <ConversationRow
            key={cat}
            title={`⚽ ${cat.replace('Fútbol ', '').replace(' (Mixto)', '')}`}
            subtitle="Chat grupal con familias"
            unreadCount={(chatCounts.team_chats || {})[toGroupId(cat)] || 0}
            url={createPageUrl(`CoachParentChat?category=${encodeURIComponent(cat)}`)}
            icon={Users}
            color="#3b82f6"
            iconBg="bg-blue-600"
          />
        ))}

        <MyKidsChatsSection
          user={user}
          excludeCategories={teamCats}
          hideCoordinator
        />

        {/* Chat Staff */}
        <ConversationRow
          title="💼 Chat Staff"
          subtitle="Conversaciones internas del personal del club"
          unreadCount={chatCounts.staff || 0}
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
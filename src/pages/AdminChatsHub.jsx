import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Briefcase, MessageCircle, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useChatUnreadCounts } from "../components/chat/useChatUnreadCounts";
import AdminTeamChatsSection from "@/components/chat/AdminTeamChatsSection";

function ConversationRow({ title, subtitle, unreadCount, url, icon: Icon, color, iconBg }) {
  return (
    <Link to={url} className="block">
      <Card className="group rounded-2xl border border-slate-200 border-l-4 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md" style={{ borderLeftColor: color }}>
        <div className="flex items-center gap-3 p-3 sm:p-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <h3 className="truncate text-sm font-bold text-slate-900">{title}</h3>
              {unreadCount > 0 && (
                <Badge className="bg-red-500 text-white">{unreadCount}</Badge>
              )}
            </div>
            <p className="truncate text-xs text-slate-500">{subtitle}</p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
        </div>
      </Card>
    </Link>
  );
}

export default function AdminChatsHub() {
  const [user, setUser] = useState(null);
  const { counts: chatCounts } = useChatUnreadCounts(user);

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
    <div className="mx-auto w-full min-w-0 max-w-[1600px] space-y-5 overflow-x-hidden px-3 pb-24 pt-4 sm:px-5 lg:space-y-6 lg:px-8 lg:pt-7">
      <div className="w-full min-w-0 space-y-6">
        <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-lg sm:p-7">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl" />
          <div className="relative flex min-w-0 items-start gap-3 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-400/15 ring-1 ring-orange-200/20 sm:h-14 sm:w-14">
              <MessageCircle className="h-6 w-6 text-orange-300 sm:h-7 sm:w-7" />
            </div>
            <div className="min-w-0">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">Comunicación · Club Deportivo Bustarviejo</p>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Mis Chats</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">Todas tus conversaciones en un solo lugar.</p>
            </div>
          </div>
        </section>

        {/* Chat Familias (Coordinador) */}
        <ConversationRow
          title="💬 Chat Familias (Coordinador)"
          subtitle="Conversaciones con familias del club"
          unreadCount={chatCounts.coordinator || 0}
          url={createPageUrl("CoordinatorChat")}
          icon={MessageCircle}
          color="#06b6d4"
          iconBg="bg-cyan-600"
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

        <div className="space-y-3 pt-2">
          <AdminTeamChatsSection />
        </div>
      </div>
    </div>
  );
}
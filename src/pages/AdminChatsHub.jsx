import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Briefcase, MessageCircle, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useChatUnreadCounts } from "../components/chat/useChatUnreadCounts";

function ConversationRow({ title, subtitle, unreadCount, url, icon: Icon, color, iconBg }) {
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
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">💬 Mis Chats</h1>
          <p className="text-slate-600">Todas tus conversaciones en un solo lugar</p>
        </div>

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
      </div>
    </div>
  );
}
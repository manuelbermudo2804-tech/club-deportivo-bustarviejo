import React from "react";
import { Link } from "react-router-dom";
import { MessageCircle, ChevronRight } from "lucide-react";
import { createPageUrl } from "@/utils";
import { useChatUnread } from "@/components/chat/ChatUnreadProvider";

export default function PanelInbox({ isCoordinator, isCoach, hasPlayers }) {
  const { counts } = useChatUnread();
  const teamTotal = Object.values(counts.team_chats || {}).reduce((s, v) => s + (v || 0), 0);

  const canales = [];
  if (isCoordinator) {
    canales.push({ ambito: "🧢 Como coordinadora", titulo: "Familias del club", url: createPageUrl("CoordinatorChat"), badge: counts.coordinator || 0 });
  }
  if (isCoach) {
    canales.push({ ambito: "🧢 Como entrenadora", titulo: "Familias de mi equipo", url: createPageUrl("CoachParentChat"), badge: teamTotal });
  }
  canales.push({ ambito: "💼 Cuerpo técnico", titulo: "Chat del staff", url: createPageUrl("StaffChat"), badge: counts.staff || 0 });
  if (hasPlayers) {
    canales.push({ ambito: "👨‍👩‍👧 Como familia", titulo: "Hablar con entrenador y coordinador", url: createPageUrl("FamilyChatsHub"), badge: 0 });
  }
  canales.push({ ambito: "📣 Del club", titulo: "Avisos para mi familia", url: createPageUrl("ParentSystemMessages"), badge: counts.system || 0 });

  return (
    <div className="bg-slate-800/60 border-2 border-slate-700 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <MessageCircle className="w-4 h-4 text-cyan-400" />
        <h2 className="text-white font-bold text-sm uppercase tracking-wide">Mensajes</h2>
        {counts.total > 0 && (
          <span className="ml-auto bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{counts.total}</span>
        )}
      </div>

      <div className="space-y-2">
        {canales.map((c, i) => (
          <Link key={i} to={c.url}>
            <div className="bg-slate-900/50 hover:bg-slate-900 rounded-xl p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-slate-400 text-[11px]">{c.ambito}</p>
                <p className="text-white font-semibold text-sm truncate">{c.titulo}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {c.badge > 0 && (
                  <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{c.badge}</span>
                )}
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
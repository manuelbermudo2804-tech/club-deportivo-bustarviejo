import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Card } from "@/components/ui/card";
import { Users, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { parseChatDate } from "@/lib/chatDate";


export default function AdminTeamChatsSection() {
  const { data, isLoading } = useQuery({
    queryKey: ["adminTeamChats"],
    queryFn: async () => {
      const players = await base44.entities.Player.filter({ activo: true }, "-created_date", 1000);
      const cats = [...new Set(players.flatMap(p => [
        p.categoria_principal, p.deporte, ...(Array.isArray(p.categorias) ? p.categorias : [])
      ]).filter(Boolean))].sort();
      // Usar la misma lectura autorizada que el chat: ChatMessage.list() puede quedar vacío por RLS.
      const groups = await Promise.all(cats.map(async cat => {
        const { data } = await base44.functions.invoke("chatGetTeamMessages", { categoria: cat });
        const messages = (data?.messages || []).filter(m => !m.eliminado)
          .sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));
        const familias = new Set(players.filter(p =>
          [p.categoria_principal, p.deporte, ...(Array.isArray(p.categorias) ? p.categorias : [])].includes(cat)
        ).flatMap(p => [p.email_padre, p.email_tutor_2].filter(Boolean))).size;
        return { cat, familias, last: messages[0] || null };
      }));
      return groups;
    },
    staleTime: 30000,
  });

  // Recordar la posición de la lista al entrar en un chat y restaurarla al volver
  React.useEffect(() => {
    if (!data) return;
    const y = Number(sessionStorage.getItem("adminChatsScroll") || 0);
    if (y > 0) requestAnimationFrame(() => window.scrollTo(0, y));
  }, [data]);
  const saveScroll = () => sessionStorage.setItem("adminChatsScroll", String(window.scrollY));

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-slate-800 px-2">⚽ Chats de los equipos</h2>
      {isLoading && <div className="flex justify-center py-6"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600" /></div>}
      {data?.map(({ cat, familias, last }) => (
        <Link key={cat} to={`${createPageUrl("CoachParentChat")}?categoria=${encodeURIComponent(cat)}`} className="block" onClick={saveScroll}>
          <Card className="p-4 hover:shadow-md transition-all border-l-4" style={{ borderLeftColor: "#3b82f6" }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-900 truncate">{cat}</h3>
                <p className="text-sm text-slate-600 truncate">{familias} familias</p>
                {last ? (
                  <p className="text-xs text-slate-500 truncate mt-1">
                    {format(parseChatDate(last.created_date), "d MMM HH:mm", { locale: es })} · {last.mensaje}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 mt-1">Sin mensajes recientes</p>
                )}
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
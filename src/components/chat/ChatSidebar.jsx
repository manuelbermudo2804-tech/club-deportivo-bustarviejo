import React from "react";
import { Badge } from "@/components/ui/badge";
import { MessageCircle } from "lucide-react";

const shortName = (cat) =>
  (cat || "").replace("Fútbol ", "").replace(" (Mixto)", "").replace("Todas las categorías", "📋 Todas");

export default function ChatSidebar({ categories, selectedCategory, onSelect, unreadByCategory, lastMessages }) {
  return (
    <div className="w-72 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col h-full overflow-hidden">
      <div className="p-3 border-b bg-slate-50">
        <h3 className="text-sm font-bold text-slate-700">Conversaciones</h3>
      </div>
      <div className="flex-1 overflow-y-auto">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat;
          const unread = unreadByCategory?.[cat] || 0;
          const last = lastMessages?.[cat];
          return (
            <button
              key={cat}
              onClick={() => onSelect(cat)}
              className={`w-full text-left px-3 py-3 border-b border-slate-100 transition-colors hover:bg-slate-50 ${
                isActive ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isActive ? "bg-blue-500 text-white" : "bg-slate-200 text-slate-600"
                  }`}>
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold truncate ${isActive ? "text-blue-700" : "text-slate-800"}`}>
                      {shortName(cat)}
                    </p>
                    {last && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {last.remitente_nombre?.split(" ")[0]}: {last.mensaje?.substring(0, 40)}{last.mensaje?.length > 40 ? "…" : ""}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {last?.created_date && (
                    <span className="text-[10px] text-slate-400">
                      {new Date(last.created_date).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                  {unread > 0 && (
                    <Badge className="bg-red-500 text-white text-[10px] px-1.5 py-0 h-4 min-w-[1rem] flex items-center justify-center">
                      {unread}
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
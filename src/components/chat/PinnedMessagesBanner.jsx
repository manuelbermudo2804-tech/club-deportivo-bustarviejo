import React from "react";
import { Pin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function PinnedMessagesBanner({ pinnedMessages, onUnpin, canUnpin = false }) {
  if (!pinnedMessages || pinnedMessages.length === 0) return null;

  return (
    <div className="bg-yellow-50 border-b-2 border-yellow-300 flex-shrink-0">
      <div className="px-3 py-2 space-y-2 max-h-[200px] overflow-y-auto">
        {pinnedMessages.map((msg) => (
          <div key={msg.id} className="flex items-start gap-2 bg-white rounded-lg p-2 shadow-sm">
            <Pin className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-bold text-yellow-900">{msg.remitente_nombre || msg.autor_nombre}</p>
                <p className="text-[10px] text-yellow-700">
                  {format(new Date(msg.created_date), "dd/MM HH:mm", { locale: es })}
                </p>
              </div>
              <p className="text-sm text-slate-700 line-clamp-2">{msg.mensaje}</p>
            </div>
            {canUnpin && onUnpin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onUnpin(msg.id)}
                className="h-6 w-6 p-0 text-yellow-600 hover:text-red-600 flex-shrink-0"
                title="Desanclar"
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
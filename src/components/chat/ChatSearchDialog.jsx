import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function ChatSearchDialog({ isOpen, onClose, messages, onSelectMessage }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredMessages = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return messages
      .filter(msg => 
        msg.mensaje?.toLowerCase().includes(term) ||
        msg.remitente_nombre?.toLowerCase().includes(term)
      )
      .slice(0, 20); // Limitar a 20 resultados
  }, [messages, searchTerm]);

  const handleClose = () => {
    setSearchTerm("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-orange-600" />
            Buscar en mensajes
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por texto o remitente..."
            className="pl-10 pr-10"
            autoFocus
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto mt-4 space-y-2">
          {searchTerm.trim() === "" ? (
            <p className="text-center text-slate-500 text-sm py-8">
              Escribe para buscar mensajes
            </p>
          ) : filteredMessages.length === 0 ? (
            <p className="text-center text-slate-500 text-sm py-8">
              No se encontraron mensajes
            </p>
          ) : (
            filteredMessages.map((msg) => (
              <button
                key={msg.id}
                onClick={() => {
                  onSelectMessage?.(msg);
                  handleClose();
                }}
                className="w-full text-left p-3 rounded-lg border hover:bg-orange-50 hover:border-orange-200 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-orange-600">
                    {msg.remitente_nombre}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {format(new Date(msg.created_date), "d MMM, HH:mm", { locale: es })}
                  </span>
                </div>
                <p className="text-sm text-slate-700 line-clamp-2">
                  {msg.mensaje}
                </p>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
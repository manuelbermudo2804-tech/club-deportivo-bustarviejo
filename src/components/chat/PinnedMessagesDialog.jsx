import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pin, PinOff, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import MessageAttachments from "./MessageAttachments";

export default function PinnedMessagesDialog({ 
  isOpen, 
  onClose, 
  messages, 
  onUnpin,
  isAdmin = false 
}) {
  const pinnedMessages = messages.filter(msg => msg.anclado === true);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pin className="w-5 h-5 text-orange-600" />
            Mensajes anclados
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3">
          {pinnedMessages.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay mensajes anclados</p>
              <p className="text-xs mt-1">Los entrenadores pueden anclar mensajes importantes</p>
            </div>
          ) : (
            pinnedMessages.map((msg) => (
              <div
                key={msg.id}
                className="p-3 rounded-lg border-2 border-orange-200 bg-orange-50"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Pin className="w-3 h-3 text-orange-600" />
                    <span className="text-xs font-semibold text-orange-700">
                      {msg.remitente_nombre}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500">
                      {format(new Date(msg.created_date), "d MMM, HH:mm", { locale: es })}
                    </span>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onUnpin?.(msg.id)}
                        className="h-6 px-2 text-xs text-slate-500 hover:text-red-600"
                      >
                        <PinOff className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-slate-800 whitespace-pre-wrap">
                  {msg.mensaje}
                </p>
                {msg.archivos_adjuntos?.length > 0 && (
                  <div className="mt-2">
                    <MessageAttachments attachments={msg.archivos_adjuntos} />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
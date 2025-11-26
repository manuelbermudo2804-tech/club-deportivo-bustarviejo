import React, { useState } from "react";
import { Check, CheckCheck, Eye } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function ReadConfirmation({ message, totalRecipients = 0, isAdmin = false }) {
  const [showDetails, setShowDetails] = useState(false);
  
  if (message.tipo !== "admin_a_grupo") return null;
  
  const readBy = message.leido_por || [];
  const readCount = readBy.length;
  const allRead = totalRecipients > 0 && readCount >= totalRecipients;
  const someRead = readCount > 0;

  // Vista simple para mensajes normales
  if (!isAdmin) {
    return (
      <span className="ml-1 inline-flex items-center">
        {allRead || message.leido ? (
          <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
        ) : someRead ? (
          <CheckCheck className="w-3.5 h-3.5 text-slate-300" />
        ) : (
          <Check className="w-3.5 h-3.5 text-slate-300" />
        )}
      </span>
    );
  }

  // Vista detallada para admin/entrenadores
  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              onClick={() => setShowDetails(true)}
              className="ml-1 inline-flex items-center gap-0.5 hover:opacity-80 transition-opacity"
            >
              {allRead ? (
                <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
              ) : someRead ? (
                <>
                  <CheckCheck className="w-3.5 h-3.5 text-slate-300" />
                  <span className="text-[9px] text-slate-300">{readCount}</span>
                </>
              ) : (
                <Check className="w-3.5 h-3.5 text-slate-300" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {allRead ? (
              "Leído por todos"
            ) : someRead ? (
              `Leído por ${readCount} de ${totalRecipients || '?'}`
            ) : (
              "Enviado"
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              Confirmaciones de Lectura
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            {readBy.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">
                Nadie ha leído este mensaje aún
              </p>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2">
                {readBy.map((reader, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <CheckCheck className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{reader.nombre}</p>
                        <p className="text-xs text-slate-500">{reader.email}</p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400">
                      {reader.fecha && format(new Date(reader.fecha), "d MMM HH:mm", { locale: es })}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 border-t text-center">
              <p className="text-xs text-slate-500">
                {readCount} de {totalRecipients || '?'} han leído el mensaje
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
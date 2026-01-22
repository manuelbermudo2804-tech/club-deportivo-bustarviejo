import React from "react";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Check, CheckCheck } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function ChatMessageItem({ message, currentUserEmail, showSenderName = true, showReadStatus = false }) {
  const isMine = message.remitente_email === currentUserEmail;
  const isCoach = message.tipo === "entrenador_a_grupo";
  const isBot = message.es_respuesta_bot === true;
  const isSystem = message.tipo === "sistema";

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1`}>
      <div className={`max-w-[85%] ${
        isMine ? 'bg-green-600 text-white' : 
        isBot ? 'bg-blue-100 text-blue-900 border-2 border-blue-300' :
        isCoach ? 'bg-green-100 text-slate-900' : 
        isSystem ? 'bg-orange-100 text-orange-900 border-2 border-orange-300' :
        'bg-slate-100 text-slate-900'
      } ${isMine ? 'rounded-[18px_4px_18px_18px]' : 'rounded-[4px_18px_18px_18px]'} px-3 py-1.5 shadow-none`}>
        {showSenderName && (
          <div className="flex items-center gap-1 mb-0.5">
            <p className="text-[11px] font-semibold opacity-75">
              {isBot ? '🤖 ' : isCoach ? '🏃 ' : isSystem ? '📢 ' : ''}{message.remitente_nombre}
            </p>
            {isBot && <Badge className="text-[10px] bg-blue-400 px-1 py-0 h-4">Bot</Badge>}
            {isCoach && !isBot && <Badge className="text-[10px] bg-green-500 px-1 py-0 h-4">Entrenador</Badge>}
            {isSystem && <Badge className="text-[10px] bg-orange-500 px-1 py-0 h-4">Sistema</Badge>}
          </div>
        )}
        <p className="text-[15px] whitespace-pre-wrap leading-tight">{message.mensaje}</p>

        {message.archivos_adjuntos?.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.archivos_adjuntos.map((file, idx) => (
              file.tipo?.startsWith('audio/') ? (
                <audio key={idx} controls className="max-w-full">
                  <source src={file.url} type={file.tipo} />
                </audio>
              ) : file.tipo?.startsWith('image/') ? (
                <img 
                  key={idx}
                  src={file.url}
                  alt={file.nombre}
                  className="rounded max-w-full h-auto"
                />
              ) : (
                <a
                  key={idx}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2 text-xs p-2 rounded ${
                    isMine || isCoach || isBot ? 'bg-black/20' : 'bg-slate-100'
                  }`}
                >
                  <FileText className="w-3 h-3" />
                  <span className="flex-1 truncate">{file.nombre}</span>
                  <Download className="w-3 h-3" />
                </a>
              )
            ))}
          </div>
        )}
        
        <div className="flex items-center gap-1 justify-end mt-0.5">
          <p className="text-[11px] opacity-70">
            {format(new Date(message.created_date), "HH:mm", { locale: es })}
          </p>
          
          {/* Doble check visual - solo en mensajes propios */}
          {showReadStatus && isMine && (
            <div className="flex items-center">
              {message.leido_por && message.leido_por.length > 0 ? (
                <CheckCheck className="w-3 h-3 text-white opacity-70" />
              ) : (
                <Check className="w-3 h-3 opacity-50" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
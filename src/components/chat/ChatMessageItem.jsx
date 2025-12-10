import React from "react";
import { Badge } from "@/components/ui/badge";
import { FileText, Download } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function ChatMessageItem({ message, currentUserEmail, showSenderName = true }) {
  const isMine = message.remitente_email === currentUserEmail;
  const isCoach = message.tipo === "entrenador_a_grupo";
  const isBot = message.es_respuesta_bot === true;
  const isSystem = message.tipo === "sistema";

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] sm:max-w-[70%] ${
        isMine ? 'bg-slate-700 text-white' : 
        isBot ? 'bg-blue-500 text-white border-2 border-blue-300' :
        isCoach ? 'bg-green-600 text-white' : 
        isSystem ? 'bg-orange-100 text-orange-900 border-2 border-orange-300' :
        'bg-white text-slate-900 border'
      } rounded-2xl p-2 sm:p-3 shadow-sm`}>
        {showSenderName && (
          <div className="flex items-center gap-1 sm:gap-2 mb-1 flex-wrap">
            <p className="text-[10px] sm:text-xs font-semibold opacity-70">
              {isBot ? '🤖 ' : isCoach ? '🏃 ' : isSystem ? '📢 ' : ''}{message.remitente_nombre}
            </p>
            {isBot && <Badge className="text-[10px] sm:text-xs bg-blue-400 px-1 py-0">Asistente IA</Badge>}
            {isCoach && !isBot && <Badge className="text-[10px] sm:text-xs bg-green-500 px-1 py-0">Entrenador</Badge>}
            {isSystem && <Badge className="text-[10px] sm:text-xs bg-orange-500 px-1 py-0">Sistema</Badge>}
          </div>
        )}
        <p className="text-xs sm:text-sm whitespace-pre-wrap">{message.mensaje}</p>

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
        
        <p className="text-[10px] sm:text-xs opacity-60 mt-1">
          {format(new Date(message.created_date), "HH:mm", { locale: es })}
        </p>
      </div>
    </div>
  );
}
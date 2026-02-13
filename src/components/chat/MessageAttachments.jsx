import React from "react";
import { FileText, Download } from "lucide-react";
import ChatImageBubble from "./ChatImageBubble";
import ChatAudioBubble from "./ChatAudioBubble";

export default function MessageAttachments({ attachments = [], isMine = false }) {
  if (!attachments || attachments.length === 0) return null;

  const images = attachments.filter(f => f.tipo?.startsWith('image/') || f.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i));
  const audios = attachments.filter(f => f.tipo?.startsWith('audio/'));
  const files = attachments.filter(f => !f.tipo?.startsWith('image/') && !f.tipo?.startsWith('audio/'));

  return (
    <div className="mt-2 space-y-1">
      {images.length > 0 && <ChatImageBubble images={images} isMine={isMine} />}
      {audios.map((file, idx) => (
        <ChatAudioBubble key={`audio-${idx}`} url={file.url} duration={file.duracion} isMine={isMine} />
      ))}
      {files.map((file, idx) => (
        <a
          key={idx}
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition-colors border border-slate-300"
        >
          <FileText className="w-4 h-4 text-slate-600" />
          <span className="text-sm text-slate-700 max-w-[150px] truncate">
            {file.nombre || 'Archivo'}
          </span>
          <Download className="w-3 h-3 text-slate-500 ml-1" />
        </a>
      ))}
    </div>
  );
}
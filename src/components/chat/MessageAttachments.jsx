import React from "react";
import { FileText, Image as ImageIcon, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MessageAttachments({ attachments = [] }) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {attachments.map((file, idx) => {
        const isImage = file.tipo?.startsWith('image/') || file.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
        
        return isImage ? (
          <a 
            key={idx} 
            href={file.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="relative group"
          >
            <img 
              src={file.url} 
              alt={file.nombre || 'Imagen'} 
              className="h-32 w-32 object-cover rounded-lg border-2 border-slate-200 hover:border-blue-500 transition-all"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-white" />
            </div>
          </a>
        ) : (
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
        );
      })}
    </div>
  );
}
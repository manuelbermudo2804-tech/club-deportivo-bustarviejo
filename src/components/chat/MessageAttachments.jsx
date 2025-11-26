import React from "react";
import { FileText, Download, Image as ImageIcon, Music, Video, MapPin, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const getFileIcon = (tipo) => {
  switch (tipo) {
    case 'imagen':
      return <ImageIcon className="w-4 h-4" />;
    case 'audio':
      return <Music className="w-4 h-4" />;
    case 'video':
      return <Video className="w-4 h-4" />;
    default:
      return <FileText className="w-4 h-4" />;
  }
};

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

export default function MessageAttachments({ attachments }) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="space-y-2 mt-2">
      {attachments.map((attachment, index) => {
        const isImage = attachment.tipo === 'imagen';
        const isAudio = attachment.tipo === 'audio';
        const isVideo = attachment.tipo === 'video';
        const isLocation = attachment.tipo === 'ubicacion';

        return (
          <div key={index}>
            {isImage && (
              <a
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <img
                  src={attachment.url}
                  alt={attachment.nombre}
                  className="max-w-xs rounded-lg border border-slate-200 hover:opacity-90 transition-opacity cursor-pointer"
                />
              </a>
            )}

            {isAudio && (
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <Music className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-slate-700 truncate flex-1">
                    {attachment.nombre}
                  </span>
                </div>
                <audio controls className="w-full max-w-xs">
                  <source src={attachment.url} />
                  Tu navegador no soporta el elemento de audio.
                </audio>
              </div>
            )}

            {isVideo && (
              <div className="bg-slate-50 rounded-lg p-2 border border-slate-200">
                <video controls className="w-full max-w-xs rounded">
                  <source src={attachment.url} />
                  Tu navegador no soporta el elemento de video.
                </video>
              </div>
            )}

            {isLocation && (
              <a
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-gradient-to-r from-teal-50 to-teal-100 rounded-lg p-3 border-2 border-teal-300 hover:border-teal-400 transition-colors max-w-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-teal-900">📍 Ubicación compartida</p>
                    <p className="text-xs text-teal-700">Toca para abrir en Google Maps</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-teal-600 flex-shrink-0" />
                </div>
              </a>
            )}

            {!isImage && !isAudio && !isVideo && !isLocation && (
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 flex items-center justify-between max-w-xs">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {getFileIcon(attachment.tipo)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">
                      {attachment.nombre}
                    </p>
                    {attachment.tamano && (
                      <p className="text-xs text-slate-500">
                        {formatFileSize(attachment.tamano)}
                      </p>
                    )}
                  </div>
                </div>
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                >
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </a>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
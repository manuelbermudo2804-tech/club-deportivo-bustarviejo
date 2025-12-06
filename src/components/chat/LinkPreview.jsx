import React from "react";
import { ExternalLink } from "lucide-react";

const extractUrls = (text) => {
  if (!text) return [];
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
};

export default function LinkPreview({ message }) {
  const urls = extractUrls(message);
  
  if (urls.length === 0) return null;

  return (
    <div className="space-y-2 mt-2">
      {urls.map((url, index) => {
        // Detectar tipo de contenido por URL
        const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
        const isDocs = url.includes('docs.google.com');
        const isMaps = url.includes('maps.google.com') || url.includes('goo.gl/maps');

        if (isYouTube) {
          const videoId = url.includes('youtu.be') 
            ? url.split('youtu.be/')[1]?.split('?')[0]
            : new URLSearchParams(url.split('?')[1]).get('v');
          
          return (
            <a
              key={index}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-slate-900 rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
            >
              <img 
                src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                alt="YouTube preview"
                className="w-full max-w-xs"
                onError={(e) => e.target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
              />
              <div className="p-2 bg-red-600 text-white text-xs flex items-center gap-2">
                <span className="font-bold">▶️ YouTube</span>
                <span className="truncate flex-1">{url}</span>
              </div>
            </a>
          );
        }

        if (isImage) {
          return (
            <a
              key={index}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <img 
                src={url}
                alt="Preview"
                className="max-w-[200px] rounded-lg border border-slate-200 hover:opacity-90 transition-opacity"
              />
            </a>
          );
        }

        if (isMaps) {
          return (
            <a
              key={index}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-teal-50 border-2 border-teal-300 rounded-lg p-3 hover:bg-teal-100 transition-colors max-w-xs"
            >
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center">
                  <span className="text-xl">📍</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-teal-900">Ubicación compartida</p>
                  <p className="text-xs text-teal-700 truncate">Abrir en Google Maps</p>
                </div>
                <ExternalLink className="w-4 h-4 text-teal-600" />
              </div>
            </a>
          );
        }

        // Link genérico
        return (
          <a
            key={index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-blue-50 border border-blue-200 rounded-lg p-3 hover:bg-blue-100 transition-colors max-w-md"
          >
            <div className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="text-sm text-blue-800 truncate">{url}</span>
            </div>
          </a>
        );
      })}
    </div>
  );
}
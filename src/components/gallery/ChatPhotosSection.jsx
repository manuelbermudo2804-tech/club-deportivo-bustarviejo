import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, ChevronLeft, ChevronRight, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

function PhotoLightbox({ photos, initialIndex, onClose }) {
  const [idx, setIdx] = useState(initialIndex);
  const photo = photos[idx];
  const prev = () => setIdx((idx - 1 + photos.length) % photos.length);
  const next = () => setIdx((idx + 1) % photos.length);

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white z-10">
        <X className="w-8 h-8" />
      </button>
      {photos.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-black/40 rounded-full p-2">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-black/40 rounded-full p-2">
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}
      <img
        src={photo.url}
        alt=""
        className="max-h-[85vh] max-w-[95vw] object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
      <div className="absolute bottom-6 text-center text-white/60 text-sm">
        {photo.sender && <span>{photo.sender} · </span>}
        {photo.date && format(new Date(photo.date), "d 'de' MMMM", { locale: es })}
        {photos.length > 1 && ` · ${idx + 1}/${photos.length}`}
      </div>
    </div>
  );
}

export default function ChatPhotosSection({ myCategories }) {
  const [lightboxIdx, setLightboxIdx] = useState(null);

  const { data: chatPhotos = [] } = useQuery({
    queryKey: ["galleryChatPhotos", myCategories],
    queryFn: async () => {
      if (!myCategories || myCategories.length === 0) return [];
      
      // Fetch recent messages from player categories that have images
      const allPhotos = [];
      for (const cat of myCategories) {
        const msgs = await base44.entities.ChatMessage.filter(
          { deporte: cat },
          "-created_date",
          60
        );
        msgs.forEach((msg) => {
          if (msg.eliminado) return;
          const attachments = msg.archivos_adjuntos || [];
          attachments.forEach((att) => {
            if (att.tipo?.startsWith("image/") || att.url?.match(/\.(jpg|jpeg|png|gif|webp)/i)) {
              allPhotos.push({
                url: att.url,
                nombre: att.nombre,
                date: msg.created_date,
                sender: msg.remitente_nombre,
                category: cat,
              });
            }
          });
        });
      }
      // Sort by date descending, max 30
      allPhotos.sort((a, b) => new Date(b.date) - new Date(a.date));
      return allPhotos.slice(0, 30);
    },
    enabled: myCategories?.length > 0,
    staleTime: 120000,
  });

  if (!chatPhotos.length) return null;

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-teal-600" />
          <h2 className="text-lg font-bold text-slate-800">Fotos del Chat</h2>
          <Badge variant="secondary" className="text-xs">{chatPhotos.length}</Badge>
        </div>
        <p className="text-xs text-slate-500 -mt-1">Fotos compartidas por los entrenadores en el chat del equipo</p>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {chatPhotos.map((photo, i) => (
            <div
              key={i}
              className="aspect-square rounded-xl overflow-hidden cursor-pointer group ring-2 ring-transparent hover:ring-teal-400 transition-all shadow-md"
              onClick={() => setLightboxIdx(i)}
            >
              <img
                src={photo.url}
                alt=""
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>

      {lightboxIdx !== null && (
        <PhotoLightbox
          photos={chatPhotos}
          initialIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}
    </>
  );
}
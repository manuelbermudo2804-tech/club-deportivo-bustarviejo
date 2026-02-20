import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { X, ChevronLeft, ChevronRight, Camera } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

function PhotoLightbox({ photos, initialIndex, onClose }) {
  const [idx, setIdx] = useState(initialIndex);
  const photo = photos[idx];

  const prev = () => setIdx((idx - 1 + photos.length) % photos.length);
  const next = () => setIdx((idx + 1) % photos.length);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
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
        {photo.date && format(new Date(photo.date), "d 'de' MMMM", { locale: es })}
        {photos.length > 1 && ` · ${idx + 1}/${photos.length}`}
      </div>
    </motion.div>
  );
}

export default function MinorChatPhotos({ playerCategory }) {
  const [lightboxIdx, setLightboxIdx] = useState(null);

  // Build grupo_id variants to match the category in chat messages
  const grupoIds = useMemo(() => {
    if (!playerCategory) return [];
    const base = playerCategory.toLowerCase().replace(/\s*\(.*?\)\s*/g, "").replace(/\s+/g, "_");
    return [
      playerCategory,
      base,
      playerCategory.replace(/\s+/g, "_"),
      playerCategory.toLowerCase().replace(/\s+/g, "_"),
    ];
  }, [playerCategory]);

  const { data: chatPhotos = [] } = useQuery({
    queryKey: ["minorChatPhotos", playerCategory],
    queryFn: async () => {
      // Fetch recent messages from the category that have images
      const msgs = await base44.entities.ChatMessage.filter(
        { deporte: playerCategory },
        "-created_date",
        100
      );
      
      const photos = [];
      msgs.forEach((msg) => {
        if (msg.eliminado) return;
        const attachments = msg.archivos_adjuntos || [];
        attachments.forEach((att) => {
          if (att.tipo?.startsWith("image/") || att.url?.match(/\.(jpg|jpeg|png|gif|webp)/i)) {
            photos.push({
              url: att.url,
              nombre: att.nombre,
              date: msg.created_date,
              sender: msg.remitente_nombre,
            });
          }
        });
      });
      return photos.slice(0, 20); // Max 20 photos
    },
    enabled: !!playerCategory,
    staleTime: 120000,
  });

  if (!chatPhotos.length) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex items-center gap-2 px-1 pt-2"
      >
        <Camera className="w-4 h-4 text-teal-500" />
        <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Fotos del equipo</h2>
        <Badge variant="secondary" className="text-xs">{chatPhotos.length}</Badge>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="border-none shadow-lg overflow-hidden">
          <CardContent className="p-3">
            <div className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
              {chatPhotos.map((photo, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.05 * i }}
                  className="flex-shrink-0 snap-center cursor-pointer group"
                  onClick={() => setLightboxIdx(i)}
                >
                  <div className="w-24 h-24 rounded-xl overflow-hidden ring-2 ring-transparent group-hover:ring-teal-400 transition-all shadow-md">
                    <img
                      src={photo.url}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                </motion.div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-2 text-center">
              📸 Fotos compartidas por los entrenadores en el chat
            </p>
          </CardContent>
        </Card>
      </motion.div>

      <AnimatePresence>
        {lightboxIdx !== null && (
          <PhotoLightbox
            photos={chatPhotos}
            initialIndex={lightboxIdx}
            onClose={() => setLightboxIdx(null)}
          />
        )}
      </AnimatePresence>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </>
  );
}
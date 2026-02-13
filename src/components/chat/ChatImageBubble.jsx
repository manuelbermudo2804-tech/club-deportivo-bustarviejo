import React, { useState } from "react";
import { Download, X, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

function Lightbox({ photos, initialIndex, onClose }) {
  const [index, setIndex] = useState(initialIndex);
  const photo = photos[index];

  const prev = () => setIndex((index - 1 + photos.length) % photos.length);
  const next = () => setIndex((index + 1) % photos.length);

  const download = async () => {
    try {
      const res = await fetch(photo.url);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = photo.nombre || `foto_${index + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("✅ Descargada");
    } catch {
      window.open(photo.url, "_blank");
    }
  };

  React.useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [index]);

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center" onClick={onClose}>
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <button onClick={(e) => { e.stopPropagation(); download(); }} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white">
          <Download className="w-5 h-5" />
        </button>
        <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white">
          <X className="w-5 h-5" />
        </button>
      </div>
      {photos.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white z-10">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white z-10">
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}
      <img
        src={photo.url}
        alt=""
        className="max-w-[92vw] max-h-[88vh] object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
      {photos.length > 1 && (
        <div className="absolute bottom-4 text-white/70 text-sm">
          {index + 1} / {photos.length}
        </div>
      )}
    </div>
  );
}

export default function ChatImageBubble({ images = [], isMine = false }) {
  const [lightboxIndex, setLightboxIndex] = useState(null);

  if (!images.length) return null;

  const count = images.length;

  // Grid layout like WhatsApp
  const gridClass = count === 1
    ? ""
    : count === 2
    ? "grid grid-cols-2 gap-0.5"
    : count === 3
    ? "grid grid-cols-2 gap-0.5"
    : "grid grid-cols-2 gap-0.5";

  const radiusClass = isMine ? "rounded-[12px_3px_12px_12px]" : "rounded-[3px_12px_12px_12px]";

  return (
    <>
      <div className={`${gridClass} ${radiusClass} overflow-hidden max-w-[280px]`}>
        {images.slice(0, 4).map((img, idx) => (
          <div
            key={idx}
            className={`relative cursor-pointer overflow-hidden ${
              count === 1 ? '' :
              count === 3 && idx === 0 ? 'row-span-2' : ''
            }`}
            onClick={() => setLightboxIndex(idx)}
          >
            <img
              src={img.url}
              alt=""
              loading="lazy"
              className={`w-full object-cover bg-slate-200 ${
                count === 1 ? 'max-h-[300px] min-h-[120px]' : 'h-[140px]'
              }`}
            />
            {/* Overlay for +N more */}
            {count > 4 && idx === 3 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white font-bold text-xl">+{count - 4}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          photos={images}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}
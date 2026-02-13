import React, { useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Download, Share2, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "sonner";

export default function PhotoLightbox({ 
  isOpen, 
  onClose, 
  photos = [], 
  currentIndex = 0, 
  onIndexChange,
  albumTitle = ""
}) {
  const [zoom, setZoom] = React.useState(1);

  const handlePrev = useCallback(() => {
    if (photos.length > 1) {
      onIndexChange((currentIndex - 1 + photos.length) % photos.length);
      setZoom(1);
    }
  }, [currentIndex, photos.length, onIndexChange]);

  const handleNext = useCallback(() => {
    if (photos.length > 1) {
      onIndexChange((currentIndex + 1) % photos.length);
      setZoom(1);
    }
  }, [currentIndex, photos.length, onIndexChange]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handlePrev, handleNext, onClose]);

  const handleDownload = async () => {
    const photo = photos[currentIndex];
    if (!photo?.url) return;
    
    try {
      const response = await fetch(photo.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${albumTitle}_foto_${currentIndex + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("✅ Foto descargada");
    } catch (error) {
      // Fallback: open in new tab
      window.open(photo.url, "_blank");
    }
  };

  const handleShare = async () => {
    const photo = photos[currentIndex];
    if (!photo?.url) return;

    // Try native share with actual image file (works great on mobile → WhatsApp, Telegram, etc.)
    if (navigator.share) {
      try {
        // Attempt to share as file (best experience on mobile)
        const response = await fetch(photo.url);
        const blob = await response.blob();
        const file = new File([blob], `${albumTitle}_${currentIndex + 1}.jpg`, { type: blob.type || 'image/jpeg' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: albumTitle,
            text: `📸 Foto del álbum: ${albumTitle}`,
            files: [file]
          });
          return;
        }
      } catch (err) {
        // File share not supported, fall through to URL share
      }

      // Fallback: share URL (still generates preview on WhatsApp)
      try {
        await navigator.share({
          title: albumTitle,
          text: `📸 Foto del álbum: ${albumTitle}`,
          url: photo.url
        });
        return;
      } catch (err) {
        if (err.name === "AbortError") return;
      }
    }

    // Desktop fallback: copy URL
    copyToClipboard(photo.url);
  };

  const copyToClipboard = (url) => {
    navigator.clipboard.writeText(url);
    toast.success("📋 Enlace copiado al portapapeles");
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.5, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.5, 1));

  if (!photos.length) return null;

  const currentPhoto = photos[currentIndex];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 bg-black/95 border-none">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
          <div className="text-white">
            <h3 className="font-bold text-lg">{albumTitle}</h3>
            <p className="text-sm text-white/70">
              {currentIndex + 1} de {photos.length}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomOut}
              className="text-white hover:bg-white/20"
              disabled={zoom <= 1}
            >
              <ZoomOut className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomIn}
              className="text-white hover:bg-white/20"
              disabled={zoom >= 3}
            >
              <ZoomIn className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              className="text-white hover:bg-white/20"
            >
              <Download className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="text-white hover:bg-white/20"
            >
              <Share2 className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Main Image */}
        <div className="flex items-center justify-center w-full h-full overflow-hidden">
          <img
            src={currentPhoto?.url}
            alt={`Foto ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain transition-transform duration-200"
            style={{ transform: `scale(${zoom})` }}
            onClick={() => zoom === 1 ? handleZoomIn() : setZoom(1)}
          />
        </div>

        {/* Navigation Arrows */}
        {photos.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/30 text-white rounded-full p-3 backdrop-blur-sm transition-all"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/30 text-white rounded-full p-3 backdrop-blur-sm transition-all"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          </>
        )}

        {/* Thumbnail Strip */}
        {photos.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <div className="flex gap-2 overflow-x-auto justify-center">
              {photos.map((photo, index) => (
                <button
                  key={index}
                  onClick={() => {
                    onIndexChange(index);
                    setZoom(1);
                  }}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    index === currentIndex 
                      ? "border-orange-500 scale-110" 
                      : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <img
                    src={photo.url}
                    alt={`Miniatura ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Photo Description */}
        {currentPhoto?.descripcion && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-lg max-w-md text-center">
            <p className="text-sm">{currentPhoto.descripcion}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
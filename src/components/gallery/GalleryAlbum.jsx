import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Image, X, Trash2, Check, Download, Share2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PhotoLightbox from "./PhotoLightbox";

export default function GalleryAlbum({ album, onEdit, onDelete, isAdmin }) {
  const [showGallery, setShowGallery] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const eventTypeEmojis = {
    "Partido": "⚽",
    "Entrenamiento": "💪",
    "Torneo": "🏆",
    "Celebración": "🎉",
    "Evento del Club": "🎪",
    "Otro": "📸"
  };

  const openGallery = (index = 0) => {
    setSelectedPhotoIndex(index);
    setShowGallery(true);
  };

  const nextPhoto = () => {
    setSelectedPhotoIndex((prev) => (prev + 1) % album.fotos.length);
  };

  const prevPhoto = () => {
    setSelectedPhotoIndex((prev) => (prev - 1 + album.fotos.length) % album.fotos.length);
  };

  const togglePhotoSelection = (index) => {
    setSelectedPhotos(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const handleDeleteSelectedPhotos = () => {
    if (selectedPhotos.length === 0) return;
    
    if (confirm(`¿Eliminar ${selectedPhotos.length} foto(s) seleccionada(s)?`)) {
      const newPhotos = album.fotos.filter((_, index) => !selectedPhotos.includes(index));
      onEdit({ ...album, fotos: newPhotos });
      setSelectedPhotos([]);
      setSelectionMode(false);
    }
  };

  // Download all photos as individual files
  const handleDownloadAll = async () => {
    if (!album.fotos || album.fotos.length === 0) return;
    
    setDownloading(true);
    toast.info(`📥 Descargando ${album.fotos.length} fotos...`);
    
    try {
      for (let i = 0; i < album.fotos.length; i++) {
        const foto = album.fotos[i];
        const response = await fetch(foto.url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${album.titulo.replace(/\s+/g, '_')}_${i + 1}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      toast.success(`✅ ${album.fotos.length} fotos descargadas`);
    } catch (error) {
      console.error("Error downloading:", error);
      toast.error("Error al descargar algunas fotos");
    }
    setDownloading(false);
  };

  // Share album via WhatsApp
  const handleShareWhatsApp = () => {
    const text = `📸 *${album.titulo}*\n\n` +
      `📅 ${format(new Date(album.fecha_evento), "dd 'de' MMMM 'de' yyyy", { locale: es })}\n` +
      `🏷️ ${album.categoria}\n` +
      `📷 ${album.fotos?.length || 0} fotos\n\n` +
      `Mira el álbum en la app del CD Bustarviejo`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, "_blank");
  };

  const openLightbox = (index) => {
    setSelectedPhotoIndex(index);
    setShowLightbox(true);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        <Card className="border-none shadow-md hover:shadow-lg transition-all duration-200 bg-white overflow-hidden group cursor-pointer">
          <div 
            className="relative h-32 overflow-hidden"
            onClick={() => openGallery(0)}
          >
            {album.fotos && album.fotos.length > 0 ? (
              <img
                src={album.fotos[0].url}
                alt={album.titulo}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                <Image className="w-8 h-8 text-white/50" />
              </div>
            )}
            
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="text-white text-center">
                <Image className="w-6 h-6 mx-auto mb-1" />
                <p className="text-xs font-bold">{album.fotos?.length || 0} fotos</p>
              </div>
            </div>

            {album.destacado && (
              <div className="absolute top-2 left-2">
                <Badge className="bg-orange-600 text-white text-xs">⭐</Badge>
              </div>
            )}
          </div>

          <CardContent className="p-2">
            <h3 className="font-bold text-sm text-slate-900 mb-1 truncate">{album.titulo}</h3>
            
            <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
              {format(new Date(album.fecha_evento), "dd MMM", { locale: es })}
            </div>

            <div className="flex items-center justify-between gap-1">
              <Badge variant="outline" className="text-[10px] px-1 py-0">
                {album.categoria === "Todas las Categorías" ? "Todas" : album.categoria.split(" ")[1]}
              </Badge>

              {isAdmin && (
                <div className="flex gap-1">
                  {onEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(album);
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(album);
                      }}
                      className="h-6 w-6 p-0 hover:bg-red-50 hover:border-red-300"
                    >
                      <Trash2 className="w-3 h-3 text-red-600" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={showGallery} onOpenChange={setShowGallery}>
        <DialogContent className="max-w-4xl h-[90vh] p-0">
          <DialogHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg">{album.titulo}</DialogTitle>
                <p className="text-xs text-slate-500">
                  {selectionMode 
                    ? `${selectedPhotos.length} foto(s) seleccionada(s)`
                    : `Foto ${selectedPhotoIndex + 1} de ${album.fotos?.length || 0}`
                  }
                </p>
              </div>
              {isAdmin && onEdit && (
                <div className="flex gap-2">
                  {selectionMode ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectionMode(false);
                          setSelectedPhotos([]);
                        }}
                      >
                        Cancelar
                      </Button>
                      {selectedPhotos.length > 0 && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={handleDeleteSelectedPhotos}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Eliminar ({selectedPhotos.length})
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectionMode(true)}
                    >
                      Seleccionar
                    </Button>
                  )}
                </div>
              )}
            </div>
          </DialogHeader>
          
          <div className="flex-1 flex items-center justify-center bg-slate-900 relative overflow-hidden">
            {album.fotos && album.fotos.length > 0 && (
              <>
                {!selectionMode && (
                  <>
                    <img
                      src={album.fotos[selectedPhotoIndex].url}
                      alt={`Foto ${selectedPhotoIndex + 1}`}
                      className="max-h-full max-w-full object-contain"
                    />

                    {album.fotos.length > 1 && (
                      <>
                        <button
                          onClick={prevPhoto}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-900 rounded-full p-2 shadow-lg"
                        >
                          ←
                        </button>
                        <button
                          onClick={nextPhoto}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-900 rounded-full p-2 shadow-lg"
                        >
                          →
                        </button>
                      </>
                    )}
                  </>
                )}
                
                {selectionMode && (
                  <div className="w-full h-full overflow-y-auto p-4">
                    <div className="grid grid-cols-3 gap-4">
                      {album.fotos.map((foto, index) => (
                        <div 
                          key={index} 
                          className="relative cursor-pointer group"
                          onClick={() => togglePhotoSelection(index)}
                        >
                          <img
                            src={foto.url}
                            alt={`Foto ${index + 1}`}
                            className={`w-full h-40 object-cover rounded-lg transition-all ${
                              selectedPhotos.includes(index) 
                                ? 'ring-4 ring-orange-500 opacity-75' 
                                : 'group-hover:opacity-75'
                            }`}
                          />
                          {selectedPhotos.includes(index) && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="bg-orange-500 rounded-full p-2">
                                <Check className="w-6 h-6 text-white" />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {album.fotos && album.fotos.length > 1 && (
            <div className="p-3 border-t bg-white overflow-x-auto">
              <div className="flex gap-2">
                {album.fotos.map((foto, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedPhotoIndex(index)}
                    className={`flex-shrink-0 ${
                      index === selectedPhotoIndex ? 'ring-2 ring-orange-600' : ''
                    }`}
                  >
                    <img
                      src={foto.url}
                      alt={`Mini ${index + 1}`}
                      className="w-16 h-16 object-cover rounded"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Calendar, Image, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function GalleryAlbum({ album, onEdit, isAdmin }) {
  const [showGallery, setShowGallery] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

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

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        <Card className="border-none shadow-lg hover:shadow-xl transition-all duration-300 bg-white overflow-hidden group cursor-pointer">
          {/* Imagen de portada */}
          <div 
            className="relative h-48 overflow-hidden"
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
                <Image className="w-16 h-16 text-white/50" />
              </div>
            )}
            
            {/* Overlay con número de fotos */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="text-white text-center">
                <Image className="w-12 h-12 mx-auto mb-2" />
                <p className="text-lg font-bold">{album.fotos?.length || 0} fotos</p>
              </div>
            </div>

            {/* Badge de destacado */}
            {album.destacado && (
              <div className="absolute top-3 left-3">
                <Badge className="bg-orange-600 text-white">⭐ Destacado</Badge>
              </div>
            )}

            {/* Tipo de evento */}
            <div className="absolute top-3 right-3">
              <Badge className="bg-white/90 text-slate-900">
                {eventTypeEmojis[album.tipo_evento]} {album.tipo_evento}
              </Badge>
            </div>
          </div>

          <CardContent className="p-4">
            <h3 className="font-bold text-lg text-slate-900 mb-2">{album.titulo}</h3>
            
            {album.descripcion && (
              <p className="text-sm text-slate-600 mb-3 line-clamp-2">{album.descripcion}</p>
            )}

            <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
              <Calendar className="w-4 h-4" />
              {format(new Date(album.fecha_evento), "d 'de' MMMM, yyyy", { locale: es })}
            </div>

            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs">
                {album.categoria === "Todas las Categorías" ? "🎯 Todas" : album.categoria.split(" ")[1]}
              </Badge>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openGallery(0)}
                  className="hover:bg-green-50"
                >
                  <Image className="w-4 h-4 mr-1" />
                  Ver
                </Button>
                {isAdmin && onEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(album)}
                    className="hover:bg-orange-50"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Modal de galería */}
      <Dialog open={showGallery} onOpenChange={setShowGallery}>
        <DialogContent className="max-w-4xl h-[90vh] p-0">
          <DialogHeader className="p-6 border-b">
            <DialogTitle className="text-2xl">{album.titulo}</DialogTitle>
            <p className="text-sm text-slate-500">
              Foto {selectedPhotoIndex + 1} de {album.fotos?.length || 0}
            </p>
          </DialogHeader>
          
          <div className="flex-1 flex items-center justify-center bg-slate-900 relative overflow-hidden">
            {album.fotos && album.fotos.length > 0 && (
              <>
                <img
                  src={album.fotos[selectedPhotoIndex].url}
                  alt={`Foto ${selectedPhotoIndex + 1}`}
                  className="max-h-full max-w-full object-contain"
                />

                {/* Controles de navegación */}
                {album.fotos.length > 1 && (
                  <>
                    <button
                      onClick={prevPhoto}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-900 rounded-full p-3 shadow-lg"
                    >
                      ←
                    </button>
                    <button
                      onClick={nextPhoto}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-900 rounded-full p-3 shadow-lg"
                    >
                      →
                    </button>
                  </>
                )}
              </>
            )}
          </div>

          {/* Miniaturas */}
          {album.fotos && album.fotos.length > 1 && (
            <div className="p-4 border-t bg-white overflow-x-auto">
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
                      alt={`Miniatura ${index + 1}`}
                      className="w-20 h-20 object-cover rounded"
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
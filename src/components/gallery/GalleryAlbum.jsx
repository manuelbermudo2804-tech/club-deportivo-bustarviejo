import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Image, X, Trash2, Check, Download, Share2, Plus, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PhotoLightbox from "./PhotoLightbox";

export default function GalleryAlbum({ album, onEdit, onDelete, isAdmin, onQuickUpload }) {
  const [showGallery, setShowGallery] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [shareMode, setShareMode] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [quickUploading, setQuickUploading] = useState(false);
  const quickUploadRef = useRef(null);

  // Quick upload photos directly to this album
  const handleQuickUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setQuickUploading(true);
    toast.info(`📤 Subiendo ${files.length} foto(s)...`);

    try {
      const uploadPromises = files.map(async (file) => {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        return {
          url: file_url,
          descripcion: "",
          jugadores_etiquetados: []
        };
      });

      const uploadedPhotos = await Promise.all(uploadPromises);
      const updatedFotos = [...(album.fotos || []), ...uploadedPhotos];
      
      if (onQuickUpload) {
        await onQuickUpload(album.id, updatedFotos);
      }
      
      toast.success(`✅ ${files.length} foto(s) añadida(s) al álbum`);
    } catch (error) {
      console.error("Error uploading photos:", error);
      toast.error("Error al subir las fotos");
    } finally {
      setQuickUploading(false);
      if (quickUploadRef.current) {
        quickUploadRef.current.value = "";
      }
    }
  };

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

  const handleDeleteSelectedPhotos = async () => {
    if (selectedPhotos.length === 0) return;

    if (confirm(`¿Eliminar ${selectedPhotos.length} foto(s) seleccionada(s)?`)) {
      const newPhotos = album.fotos.filter((_, index) => !selectedPhotos.includes(index));
      if (onQuickUpload) {
        await onQuickUpload(album.id, newPhotos);
      }
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

  // Download selected photos so user can share them from their phone gallery
  const handleDownloadSelected = async () => {
    if (selectedPhotos.length === 0) return;
    setDownloading(true);
    
    const photosToDownload = selectedPhotos.map(i => album.fotos[i]).filter(Boolean);
    
    // On mobile, try native share with files (user picks WhatsApp, Telegram, etc.)
    if (navigator.share && photosToDownload.length <= 10) {
      try {
        const files = [];
        for (let i = 0; i < photosToDownload.length; i++) {
          const res = await fetch(photosToDownload[i].url);
          const blob = await res.blob();
          files.push(new File([blob], `${album.titulo.replace(/\s+/g, '_')}_${selectedPhotos[i] + 1}.jpg`, { type: blob.type || 'image/jpeg' }));
        }
        if (navigator.canShare && navigator.canShare({ files })) {
          await navigator.share({
            title: `📸 ${album.titulo}`,
            text: `${photosToDownload.length} foto(s) del álbum ${album.titulo}`,
            files
          });
          setSelectedPhotos([]);
          setShareMode(false);
          setDownloading(false);
          return;
        }
      } catch (err) {
        if (err.name === "AbortError") { setDownloading(false); return; }
        // Fall through to download
      }
    }
    
    // Fallback: download files
    toast.info(`📥 Descargando ${photosToDownload.length} foto(s)...`);
    for (let i = 0; i < photosToDownload.length; i++) {
      try {
        const res = await fetch(photosToDownload[i].url);
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${album.titulo.replace(/\s+/g, '_')}_${selectedPhotos[i] + 1}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        await new Promise(r => setTimeout(r, 300));
      } catch {}
    }
    toast.success(`✅ ${photosToDownload.length} foto(s) descargadas. Compártelas desde tu galería.`);
    setSelectedPhotos([]);
    setShareMode(false);
    setDownloading(false);
  };

  const toggleSharePhoto = (index) => {
    setSelectedPhotos(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
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
                loading="lazy"
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

              <div className="flex gap-1">
                {/* Quick upload button for coaches/admins */}
                {isAdmin && onQuickUpload && (
                  <>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={handleQuickUpload}
                      className="hidden"
                      ref={quickUploadRef}
                      disabled={quickUploading}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        quickUploadRef.current?.click();
                      }}
                      disabled={quickUploading}
                      className="h-6 w-6 p-0 bg-green-50 border-green-300 hover:bg-green-100"
                      title="Añadir fotos rápido"
                    >
                      {quickUploading ? (
                        <Loader2 className="w-3 h-3 text-green-600 animate-spin" />
                      ) : (
                        <Plus className="w-3 h-3 text-green-600" />
                      )}
                    </Button>
                  </>
                )}

                {/* Share button opens gallery in share mode */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShareMode(true);
                    setSelectedPhotos([]);
                    setShowGallery(true);
                  }}
                  className="h-6 w-6 p-0"
                  title="Compartir fotos"
                >
                  <Share2 className="w-3 h-3 text-green-600" />
                </Button>
                {album.fotos?.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadAll();
                    }}
                    disabled={downloading}
                    className="h-6 w-6 p-0"
                    title="Descargar todas las fotos"
                  >
                    <Download className={`w-3 h-3 text-blue-600 ${downloading ? 'animate-bounce' : ''}`} />
                  </Button>
                )}

                {isAdmin && (
                  <>
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
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Grid Gallery Dialog */}
      <Dialog open={showGallery} onOpenChange={setShowGallery}>
        <DialogContent className="max-w-4xl h-[90vh] p-0">
          <DialogHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg">{album.titulo}</DialogTitle>
                <p className="text-xs text-slate-500">
                  {(selectionMode || shareMode)
                    ? `${selectedPhotos.length} foto(s) seleccionada(s)`
                    : `${album.fotos?.length || 0} fotos`
                  }
                </p>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                {/* SHARE MODE: select photos to share/download */}
                {shareMode ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // Select all / deselect all
                        if (selectedPhotos.length === (album.fotos?.length || 0)) {
                          setSelectedPhotos([]);
                        } else {
                          setSelectedPhotos((album.fotos || []).map((_, i) => i));
                        }
                      }}
                      className="gap-1 text-xs"
                    >
                      <Check className="w-3 h-3" />
                      {selectedPhotos.length === (album.fotos?.length || 0) ? 'Ninguna' : 'Todas'}
                    </Button>
                    {selectedPhotos.length > 0 && (
                      <Button
                        size="sm"
                        onClick={handleDownloadSelected}
                        disabled={downloading}
                        className="gap-1 bg-green-600 hover:bg-green-700"
                      >
                        <Share2 className={`w-4 h-4 ${downloading ? 'animate-spin' : ''}`} />
                        {downloading ? 'Preparando...' : `Compartir (${selectedPhotos.length})`}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setShareMode(false); setSelectedPhotos([]); }}
                    >
                      Cancelar
                    </Button>
                  </>
                ) : selectionMode ? (
                  /* ADMIN DELETE MODE */
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setSelectionMode(false); setSelectedPhotos([]); }}
                    >
                      Cancelar
                    </Button>
                    {selectedPhotos.length > 0 && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleDeleteSelectedPhotos}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Eliminar ({selectedPhotos.length})
                      </Button>
                    )}
                  </>
                ) : (
                  /* NORMAL MODE */
                  <>
                    {/* Quick upload for admins */}
                    {isAdmin && onQuickUpload && (
                      <>
                        <input
                          type="file"
                          accept="image/*,video/*"
                          multiple
                          onChange={handleQuickUpload}
                          className="hidden"
                          id={`quick-upload-gallery-${album.id}`}
                          disabled={quickUploading}
                        />
                        <Button
                          size="sm"
                          onClick={() => document.getElementById(`quick-upload-gallery-${album.id}`).click()}
                          disabled={quickUploading}
                          className="gap-1 bg-green-600 hover:bg-green-700"
                        >
                          {quickUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                          {quickUploading ? 'Subiendo...' : 'Añadir'}
                        </Button>
                      </>
                    )}

                    {/* Share button */}
                    {album.fotos?.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setShareMode(true); setSelectedPhotos([]); }}
                        className="gap-1"
                      >
                        <Share2 className="w-4 h-4 text-green-600" />
                        Compartir
                      </Button>
                    )}

                    {/* Download all */}
                    {album.fotos?.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleDownloadAll}
                        disabled={downloading}
                        className="gap-1"
                      >
                        <Download className={`w-4 h-4 ${downloading ? 'animate-bounce' : ''}`} />
                        {downloading ? '...' : 'Todo'}
                      </Button>
                    )}

                    {/* Admin select to delete */}
                    {isAdmin && onEdit && (
                      <Button size="sm" variant="outline" onClick={() => setSelectionMode(true)}>
                        Seleccionar
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-4 bg-slate-100">
            {album.fotos && album.fotos.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {album.fotos.map((foto, index) => {
                  const isSelectMode = selectionMode || shareMode;
                  const isSelected = selectedPhotos.includes(index);
                  return (
                    <div 
                      key={index} 
                      className="relative cursor-pointer group aspect-square"
                      onClick={() => isSelectMode ? toggleSharePhoto(index) : openLightbox(index)}
                    >
                      <img
                        src={foto.url}
                        alt={`Foto ${index + 1}`}
                        loading="lazy"
                        className={`w-full h-full object-cover rounded-lg transition-all ${
                          isSelected
                            ? (shareMode ? 'ring-4 ring-green-500 opacity-80' : 'ring-4 ring-orange-500 opacity-75')
                            : 'group-hover:scale-105 group-hover:shadow-lg'
                        }`}
                      />
                      {isSelected && (
                        <div className="absolute top-2 right-2">
                          <div className={`${shareMode ? 'bg-green-500' : 'bg-orange-500'} rounded-full p-1.5`}>
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      )}
                      {!isSelectMode && (
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
                          <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">
                            Ver
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox for full-screen viewing */}
      <PhotoLightbox
        isOpen={showLightbox}
        onClose={() => setShowLightbox(false)}
        photos={album.fotos || []}
        currentIndex={selectedPhotoIndex}
        onIndexChange={setSelectedPhotoIndex}
        albumTitle={album.titulo}
      />
    </>
  );
}
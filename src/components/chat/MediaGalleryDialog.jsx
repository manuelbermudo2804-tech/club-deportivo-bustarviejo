import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Image, FileText, Music, Video, Download, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function MediaGalleryDialog({ isOpen, onClose, messages }) {
  const [selectedImage, setSelectedImage] = useState(null);

  const media = useMemo(() => {
    const images = [];
    const documents = [];
    const audio = [];

    messages.forEach(msg => {
      msg.archivos_adjuntos?.forEach(att => {
        const item = { ...att, msgDate: msg.created_date, sender: msg.remitente_nombre };
        if (att.tipo === "imagen") images.push(item);
        else if (att.tipo === "audio") audio.push(item);
        else documents.push(item);
      });
    });

    return { images, documents, audio };
  }, [messages]);

  const totalMedia = media.images.length + media.documents.length + media.audio.length;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Image className="w-5 h-5 text-orange-600" />
              Galería de medios
              <span className="text-xs font-normal text-slate-500">({totalMedia} archivos)</span>
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="images" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="w-full">
              <TabsTrigger value="images" className="flex-1 gap-1 text-xs">
                <Image className="w-3 h-3" />
                Fotos ({media.images.length})
              </TabsTrigger>
              <TabsTrigger value="docs" className="flex-1 gap-1 text-xs">
                <FileText className="w-3 h-3" />
                Docs ({media.documents.length})
              </TabsTrigger>
              <TabsTrigger value="audio" className="flex-1 gap-1 text-xs">
                <Music className="w-3 h-3" />
                Audio ({media.audio.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="images" className="flex-1 overflow-y-auto mt-3">
              {media.images.length === 0 ? (
                <p className="text-center text-slate-500 text-sm py-8">Sin imágenes</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {media.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(img)}
                      className="aspect-square rounded-lg overflow-hidden border hover:opacity-80 transition-opacity"
                    >
                      <img
                        src={img.url}
                        alt={img.nombre}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="docs" className="flex-1 overflow-y-auto mt-3">
              {media.documents.length === 0 ? (
                <p className="text-center text-slate-500 text-sm py-8">Sin documentos</p>
              ) : (
                <div className="space-y-2">
                  {media.documents.map((doc, idx) => (
                    <a
                      key={idx}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-slate-50"
                    >
                      <FileText className="w-8 h-8 text-orange-600" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.nombre}</p>
                        <p className="text-xs text-slate-500">
                          {doc.sender} • {format(new Date(doc.msgDate), "d MMM", { locale: es })}
                        </p>
                      </div>
                      <Download className="w-4 h-4 text-slate-400" />
                    </a>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="audio" className="flex-1 overflow-y-auto mt-3">
              {media.audio.length === 0 ? (
                <p className="text-center text-slate-500 text-sm py-8">Sin audios</p>
              ) : (
                <div className="space-y-2">
                  {media.audio.map((aud, idx) => (
                    <div key={idx} className="p-3 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <Music className="w-4 h-4 text-purple-600" />
                        <span className="text-xs text-slate-600">{aud.sender}</span>
                        <span className="text-xs text-slate-400">
                          {format(new Date(aud.msgDate), "d MMM", { locale: es })}
                        </span>
                      </div>
                      <audio controls className="w-full h-8">
                        <source src={aud.url} />
                      </audio>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Visor de imagen ampliada */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white hover:text-orange-400"
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={selectedImage.url}
            alt={selectedImage.nombre}
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-4 py-2 rounded-full">
            {selectedImage.sender} • {format(new Date(selectedImage.msgDate), "d MMM yyyy", { locale: es })}
          </div>
        </div>
      )}
    </>
  );
}
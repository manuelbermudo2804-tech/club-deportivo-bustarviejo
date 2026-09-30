import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Images, FileText, Download } from "lucide-react";
import { format } from "date-fns";

const isImage = (f) => f.tipo?.startsWith("image/") || /\.(jpe?g|png|gif|webp|heic)$/i.test(f.nombre || f.url || "");

export default function ChatGalleryButton({ messages = [], className = "" }) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(null);

  const { fotos, archivos } = useMemo(() => {
    const items = messages
      .filter((m) => !m.eliminado)
      .flatMap((m) => (m.archivos_adjuntos || m.adjuntos || []).filter((f) => f?.url).map((f) => ({ ...f, autor: m.remitente_nombre, fecha: m.created_date })))
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    return { fotos: items.filter(isImage), archivos: items.filter((f) => !isImage(f) && !f.tipo?.startsWith("audio/")) };
  }, [messages]);

  return (
    <>
      <button onClick={() => setOpen(true)} title="Fotos y archivos" className={`h-7 w-7 flex items-center justify-center rounded-full hover:bg-white/20 text-white ${className}`}>
        <Images className="w-4 h-4" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader><DialogTitle>Fotos y archivos del chat</DialogTitle></DialogHeader>
          <Tabs defaultValue="fotos" className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="fotos">Fotos ({fotos.length})</TabsTrigger>
              <TabsTrigger value="archivos">Archivos ({archivos.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="fotos" className="overflow-y-auto flex-1">
              {fotos.length === 0 ? <p className="text-sm text-slate-500 text-center py-8">Aún no se han compartido fotos</p> : (
                <div className="grid grid-cols-3 gap-1">
                  {fotos.map((f, i) => (
                    <button key={i} onClick={() => setPreview(f.url)} className="aspect-square overflow-hidden rounded bg-slate-100">
                      <img src={f.url} alt="" loading="lazy" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="archivos" className="overflow-y-auto flex-1 space-y-2">
              {archivos.length === 0 ? <p className="text-sm text-slate-500 text-center py-8">Aún no se han compartido archivos</p> : archivos.map((f, i) => (
                <a key={i} href={f.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-2 rounded-lg border hover:bg-slate-50">
                  <FileText className="w-5 h-5 text-slate-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{f.nombre || "Archivo"}</p>
                    <p className="text-xs text-slate-500">{f.autor}{f.fecha ? ` · ${format(new Date(f.fecha), "dd/MM/yyyy")}` : ""}</p>
                  </div>
                  <Download className="w-4 h-4 text-slate-400" />
                </a>
              ))}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      {preview && (
        <div className="fixed inset-0 z-[300] bg-black/90 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <img src={preview} alt="" className="max-w-full max-h-full rounded" />
        </div>
      )}
    </>
  );
}
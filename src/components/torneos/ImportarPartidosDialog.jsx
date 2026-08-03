import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Sparkles, Loader2, ImageIcon, Check, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

// Diálogo para subir una FOTO del calendario (o pegar texto) y que la IA
// extraiga los partidos y los cree de golpe, tras confirmación.
export default function ImportarPartidosDialog({ open, onOpenChange, torneo, categoria }) {
  const queryClient = useQueryClient();
  const fileRef = useRef(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [texto, setTexto] = useState("");
  const [fechaBase, setFechaBase] = useState("");
  const [uploading, setUploading] = useState(false);
  const [extraidos, setExtraidos] = useState(null); // null = aún no extraído
  const [descartados, setDescartados] = useState([]);

  const reset = () => {
    setImageUrl(""); setImagePreview(""); setTexto(""); setFechaBase("");
    setExtraidos(null); setDescartados([]);
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setImageUrl(file_url);
      setImagePreview(URL.createObjectURL(file));
    } catch {
      toast.error("Error al subir la imagen");
    } finally {
      setUploading(false);
    }
  };

  const extraer = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke("torneoExtraerPartidos", {
        torneo_id: torneo.id, categoria_id: categoria.id,
        image_url: imageUrl || undefined, texto: texto || undefined,
        fecha_base: fechaBase || undefined,
      });
      const data = res?.data || res;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      setExtraidos(data.partidos || []);
      setDescartados(data.descartados || []);
      if ((data.partidos || []).length === 0) toast.info("No se reconoció ningún partido");
    },
    onError: (e) => toast.error(e.message),
  });

  const crear = useMutation({
    mutationFn: async () => {
      const nuevos = extraidos.map((p) => ({
        torneo_id: torneo.id, categoria_id: categoria.id, fase: "liguilla",
        equipo_local_id: p.equipo_local_id, equipo_visitante_id: p.equipo_visitante_id,
        fecha_hora: p.fecha_hora || "", sede_nombre: p.sede_nombre || "", campo: p.campo || "",
        finalizado: false,
      }));
      await base44.entities.TorneoPartido.bulkCreate(nuevos);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["torneo-full", torneo.id] });
      toast.success(`${extraidos.length} partidos creados`);
      reset();
      onOpenChange(false);
    },
    onError: () => toast.error("Error al crear los partidos"),
  });

  const quitar = (i) => setExtraidos((prev) => prev.filter((_, idx) => idx !== i));

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" /> Crear partidos desde una imagen
          </DialogTitle>
          <DialogDescription>
            Sube una foto del calendario de partidos (o pega el texto) y la IA los creará automáticamente.
          </DialogDescription>
        </DialogHeader>

        {extraidos === null ? (
          <div className="space-y-4">
            {/* Subir imagen */}
            <div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-2 text-slate-500 hover:border-amber-400 hover:text-amber-600 transition-colors"
              >
                {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : imagePreview ? <ImageIcon className="w-6 h-6 text-green-600" /> : <Upload className="w-6 h-6" />}
                <span className="text-sm font-medium">
                  {imagePreview ? "Imagen lista · toca para cambiar" : "Sube una foto del calendario"}
                </span>
              </button>
              {imagePreview && <img src={imagePreview} alt="" className="mt-2 rounded-lg max-h-40 mx-auto object-contain" />}
            </div>

            <div className="text-center text-xs text-slate-400">— o pega el texto —</div>

            <Textarea
              placeholder={"Ej:\nReal Madrid vs Atlético · 10:00 · Campo 1\nBarça vs Sevilla · 11:30 · Campo 2"}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={4}
            />

            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Fecha de los partidos (si la imagen solo trae la hora)</label>
              <input
                type="date"
                value={fechaBase}
                onChange={(e) => setFechaBase(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <Button
              className="w-full"
              onClick={() => extraer.mutate()}
              disabled={extraer.isPending || (!imageUrl && !texto.trim())}
            >
              {extraer.isPending ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Leyendo partidos...</> : <><Sparkles className="w-4 h-4 mr-1" /> Extraer partidos</>}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-700">
              {extraidos.length} partido{extraidos.length !== 1 ? "s" : ""} detectado{extraidos.length !== 1 ? "s" : ""} · revisa y confirma
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {extraidos.map((p, i) => (
                <div key={i} className="bg-slate-50 border rounded-lg p-2 text-sm flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{p.equipo_local_nombre} <span className="text-slate-400">vs</span> {p.equipo_visitante_nombre}</div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {p.fecha_hora ? format(new Date(p.fecha_hora), "dd/MM HH:mm") : "Sin hora"}
                      {p.campo_label ? ` · ${p.campo_label}` : ""}
                    </div>
                  </div>
                  <button onClick={() => quitar(i)} className="text-slate-400 hover:text-red-500 flex-shrink-0"><X className="w-4 h-4" /></button>
                </div>
              ))}
            </div>

            {descartados.length > 0 && (
              <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg p-2">
                No se reconocieron (equipo no encontrado): {descartados.join(", ")}
              </p>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setExtraidos(null); setDescartados([]); }}>
                Volver
              </Button>
              <Button className="flex-1" onClick={() => crear.mutate()} disabled={crear.isPending || extraidos.length === 0}>
                {crear.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                Crear {extraidos.length} partido{extraidos.length !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
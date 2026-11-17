import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, Loader2, Image as ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function RafflePremioFields({ activeSeason, update }) {
  const [uploading, setUploading] = useState(false);
  const fotosAdicionales = Array.isArray(activeSeason.sorteo_premio_fotos) ? activeSeason.sorteo_premio_fotos : [];

  const handleFotosAdicionalesUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (e.target) e.target.value = "";
    if (!files.length) return;
    const disponibles = Math.max(0, 3 - fotosAdicionales.length);
    if (files.length > disponibles) {
      toast.error(`Puedes añadir ${disponibles} foto${disponibles === 1 ? "" : "s"} más. El máximo son 3 adicionales.`);
      return;
    }
    const demasiadoGrandes = files.find((file) => file.size > 5 * 1024 * 1024);
    if (demasiadoGrandes) {
      toast.error(`La imagen ${demasiadoGrandes.name} supera los 5MB.`);
      return;
    }
    setUploading(true);
    try {
      const nuevasFotos = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        nuevasFotos.push(file_url);
      }
      update({ sorteo_premio_fotos: [...fotosAdicionales, ...nuevasFotos] });
      toast.success(`✅ ${nuevasFotos.length} foto${nuevasFotos.length === 1 ? " subida" : "s subidas"}`);
    } catch {
      toast.error("No se han podido subir todas las fotografías. Comprueba e inténtalo de nuevo.");
    } finally {
      setUploading(false);
    }
  };

  const handleFotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (e.target) e.target.value = "";
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen pesa más de 5MB. Usa una más ligera.");
      return;
    }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      update({ sorteo_premio_principal_foto: file_url });
      toast.success("✅ Foto del premio subida");
    } catch {
      toast.error("Error al subir la foto");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">Nombre del premio</Label>
          <Input
            key={`premio-nombre-${activeSeason.id}`}
            defaultValue={activeSeason.sorteo_premio_principal_nombre || ""}
            onBlur={(e) => {
              if (e.target.value !== (activeSeason.sorteo_premio_principal_nombre || "")) {
                update({ sorteo_premio_principal_nombre: e.target.value });
              }
            }}
            placeholder="Ej: PlayStation 5"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-sm font-medium">Foto del premio</Label>
          <div className="mt-1 flex items-center gap-3">
            {activeSeason.sorteo_premio_principal_foto ? (
              <img
                src={activeSeason.sorteo_premio_principal_foto}
                alt="Premio"
                className="w-14 h-14 object-cover rounded-lg border border-slate-200"
              />
            ) : (
              <div className="w-14 h-14 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-slate-300" />
              </div>
            )}
            <label>
              <input type="file" accept="image/*" className="hidden" onChange={handleFotoUpload} />
              <Button type="button" variant="outline" size="sm" asChild disabled={uploading}>
                <span className="cursor-pointer">
                  {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  {activeSeason.sorteo_premio_principal_foto ? "Cambiar" : "Subir"}
                </span>
              </Button>
            </label>
            {activeSeason.sorteo_premio_principal_foto && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-red-500 text-xs h-7"
                onClick={() => update({ sorteo_premio_principal_foto: "" })}
              >
                Quitar
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <Label className="text-sm font-semibold">Galería adicional</Label>
            <p className="text-xs text-slate-500 mt-0.5">Añade hasta 3 fotos más para enseñar el premio.</p>
          </div>
          <span className="text-xs font-semibold text-slate-500">{fotosAdicionales.length}/3</span>
        </div>
        {fotosAdicionales.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {fotosAdicionales.map((foto, index) => (
              <div key={`${foto}-${index}`} className="relative">
                <img src={foto} alt={`Foto adicional ${index + 1}`} className="h-24 w-full rounded-lg border border-slate-200 object-cover" />
                <Button type="button" variant="destructive" size="sm" className="absolute right-1 top-1 h-6 w-6 p-0" aria-label={`Quitar foto ${index + 1}`} onClick={() => update({ sorteo_premio_fotos: fotosAdicionales.filter((_, i) => i !== index) })}>×</Button>
              </div>
            ))}
          </div>
        )}
        {fotosAdicionales.length < 3 && (
          <label className="inline-flex cursor-pointer">
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleFotosAdicionalesUpload} />
            <Button type="button" variant="outline" size="sm" asChild disabled={uploading}>
              <span className="cursor-pointer">
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Añadir fotografías
              </span>
            </Button>
          </label>
        )}
      </div>

      <div>
        <Label className="text-sm font-medium">Descripción (opcional)</Label>
        <Textarea
          key={`premio-texto-${activeSeason.id}`}
          defaultValue={activeSeason.sorteo_premio_principal_texto || ""}
          onBlur={(e) => {
            if (e.target.value !== (activeSeason.sorteo_premio_principal_texto || "")) {
              update({ sorteo_premio_principal_texto: e.target.value });
            }
          }}
          placeholder="Ej: Sorteo el 30 de junio entre todos los socios que hayan traído amigos."
          className="mt-1 h-16 text-sm"
        />
      </div>
    </div>
  );
}
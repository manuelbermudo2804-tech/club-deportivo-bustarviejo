import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Trophy, Upload, Loader2, Image as ImageIcon, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

export default function RafflePrizeConfig({ activeSeason, updateSeasonMutation }) {
  const [uploading, setUploading] = useState(false);
  if (!activeSeason) return null;

  const update = (data) => updateSeasonMutation.mutate({ id: activeSeason.id, data });

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
    <div className="space-y-4 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border-2 border-amber-200">
      <div className="flex items-center gap-3">
        <Trophy className="w-5 h-5 text-amber-600" />
        <div>
          <p className="font-semibold text-amber-900">🎁 Premio principal del sorteo de referidos</p>
          <p className="text-xs text-slate-600">El premio que se sortea entre todos los que traen socios. Cada amigo = 1 papeleta con número.</p>
        </div>
      </div>

      <Alert className="bg-white border-amber-300">
        <Info className="w-4 h-4 text-amber-600" />
        <AlertDescription className="text-slate-700 ml-2 text-xs">
          El sorteo se hace entre quienes tengan al menos 1 papeleta. Cada papeleta lleva un número aleatorio único,
          así el día del sorteo solo tienes que sacar un número y queda totalmente transparente.
        </AlertDescription>
      </Alert>

      {/* Nombre del premio */}
      <div>
        <Label className="text-sm font-medium">🏆 Nombre del premio</Label>
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

      {/* Foto del premio */}
      <div>
        <Label className="text-sm font-medium">📷 Foto del premio</Label>
        <div className="mt-1 flex items-center gap-3">
          {activeSeason.sorteo_premio_principal_foto ? (
            <img
              src={activeSeason.sorteo_premio_principal_foto}
              alt="Premio"
              className="w-20 h-20 object-cover rounded-xl border border-amber-300"
            />
          ) : (
            <div className="w-20 h-20 rounded-xl border-2 border-dashed border-amber-300 flex items-center justify-center bg-white">
              <ImageIcon className="w-7 h-7 text-amber-300" />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <label>
              <input type="file" accept="image/*" className="hidden" onChange={handleFotoUpload} />
              <Button type="button" variant="outline" size="sm" asChild disabled={uploading}>
                <span className="cursor-pointer">
                  {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  {activeSeason.sorteo_premio_principal_foto ? "Cambiar foto" : "Subir foto"}
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
                Quitar foto
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Texto descriptivo */}
      <div>
        <Label className="text-sm font-medium">💬 Texto descriptivo (opcional)</Label>
        <Textarea
          key={`premio-texto-${activeSeason.id}`}
          defaultValue={activeSeason.sorteo_premio_principal_texto || ""}
          onBlur={(e) => {
            if (e.target.value !== (activeSeason.sorteo_premio_principal_texto || "")) {
              update({ sorteo_premio_principal_texto: e.target.value });
            }
          }}
          placeholder="Ej: Sorteo el 30 de junio entre todos los socios que hayan traído amigos. ¡Mucha suerte!"
          className="mt-1 h-20 text-sm"
        />
        <p className="text-xs text-slate-500 mt-1">Se guarda al salir del campo.</p>
      </div>
    </div>
  );
}
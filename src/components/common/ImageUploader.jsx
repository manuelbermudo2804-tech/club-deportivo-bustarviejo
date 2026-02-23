import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { compressImage } from "../utils/imageCompressor";
import { toast } from "sonner";

export default function ImageUploader({ images = [], onChange, max = 4 }) {
  const [loading, setLoading] = useState(false);

  const handleFiles = async (files) => {
    const list = Array.from(files).slice(0, max - images.length);
    setLoading(true);
    const out = [];
    for (const f of list) {
      try {
        const compressed = await compressImage(f, { maxWidth: 1200, maxHeight: 1200, quality: 0.7 });
        const { file_url } = await base44.integrations.Core.UploadFile({ file: compressed });
        out.push(file_url);
      } catch (err) {
        console.error('[ImageUploader] Error subiendo imagen:', err);
        if (err?.userMessage) {
          toast.error(err.userMessage, { duration: 8000 });
        } else {
          toast.error("Error al subir la imagen. Inténtalo con otra foto.");
        }
      }
    }
    onChange([...(images || []), ...out]);
    setLoading(false);
  };

  const remove = (url) => onChange((images || []).filter((u) => u !== url));

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        {(images || []).map((url) => (
          <div key={url} className="relative w-20 h-20 rounded-lg overflow-hidden border">
            <img src={url} alt="img" className="w-full h-full object-cover" />
            <button type="button" onClick={() => remove(url)} className="absolute top-1 right-1 bg-white/80 rounded-full p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
        <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple className="hidden" style={{ display: 'none', visibility: 'hidden', position: 'absolute', width: 0, height: 0 }} onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }} />
        <Button type="button" variant="outline" disabled={loading || (images?.length || 0) >= max} style={{ minHeight: '44px', WebkitAppearance: 'none' }}>
          <ImageIcon className="w-4 h-4 mr-1" /> {loading ? "Subiendo..." : "Subir imágenes"}
        </Button>
      </label>
    </div>
  );
}
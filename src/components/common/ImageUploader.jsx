import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { compressImage } from "./utils/imageCompressor";

export default function ImageUploader({ images = [], onChange, max = 4 }) {
  const [loading, setLoading] = useState(false);

  const handleFiles = async (files) => {
    const list = Array.from(files).slice(0, max - images.length);
    setLoading(true);
    const out = [];
    for (const f of list) {
      try {
        const compressed = await compressImage(f, { maxWidth: 1600, maxHeight: 1600, quality: 0.8 });
        const { file_url } = await base44.integrations.Core.UploadFile({ file: compressed });
        out.push(file_url);
      } catch (err) {
        console.error('[ImageUploader] Error subiendo imagen:', err);
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
        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        <Button type="button" variant="outline" disabled={loading || (images?.length || 0) >= max}>
          <ImageIcon className="w-4 h-4" /> {loading ? "Subiendo..." : "Subir imágenes"}
        </Button>
      </label>
    </div>
  );
}
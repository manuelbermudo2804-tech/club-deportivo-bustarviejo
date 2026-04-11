import React from "react";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, X } from "lucide-react";
import { useImageUpload } from "../utils/useImageUpload";

export default function ImageUploader({ images = [], onChange, max = 4 }) {
  const [uploading, uploadFile] = useImageUpload();

  const handleFiles = async (files) => {
    const list = Array.from(files).slice(0, max - images.length);
    const out = [];
    for (const f of list) {
      const url = await uploadFile(f);
      if (url) out.push(url);
    }
    if (out.length > 0) onChange([...(images || []), ...out]);
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
        <Button type="button" variant="outline" disabled={uploading || (images?.length || 0) >= max} style={{ minHeight: '44px', WebkitAppearance: 'none' }}>
          <ImageIcon className="w-4 h-4 mr-1" /> {uploading ? "Subiendo..." : "Subir imágenes"}
        </Button>
      </label>
    </div>
  );
}
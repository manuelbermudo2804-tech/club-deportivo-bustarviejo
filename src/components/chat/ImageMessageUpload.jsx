import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ImageMessageUpload({ file, onUploadComplete, onRemove }) {
  const [status, setStatus] = useState('uploading');
  const [preview, setPreview] = useState(null);
  const [uploadedUrl, setUploadedUrl] = useState(null);
  const [error, setError] = useState(null);

  // Generar preview local INMEDIATAMENTE
  useEffect(() => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);
  }, [file]);

  // Subir imagen en segundo plano
  useEffect(() => {
    if (!file || uploadedUrl) return;

    const uploadImage = async () => {
      try {
        // Comprimir imagen antes de subir
        const compressed = await compressImage(file);
        const { file_url } = await base44.integrations.Core.UploadFile({ file: compressed });
        setUploadedUrl(file_url);
        setStatus('sent');
        onUploadComplete?.({ url: file_url, nombre: file.name, tipo: file.type });
      } catch (err) {
        setError(err.message);
        setStatus('error');
      }
    };

    uploadImage();
  }, [file, uploadedUrl, onUploadComplete]);

  const compressImage = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          }, 'image/jpeg', 0.85);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const retry = () => {
    setStatus('uploading');
    setError(null);
    setUploadedUrl(null);
  };

  return (
    <div className="relative group">
      <img 
        src={preview || uploadedUrl} 
        alt="Uploading"
        className="rounded-xl max-w-full h-auto max-h-64 object-contain"
        loading="lazy"
      />
      
      {status === 'uploading' && (
        <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
      )}
      
      {status === 'error' && (
        <div className="absolute inset-0 bg-red-500/80 rounded-xl flex items-center justify-center">
          <Button
            size="sm"
            variant="ghost"
            onClick={retry}
            className="text-white hover:bg-white/20"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Reintentar
          </Button>
        </div>
      )}
      
      {onRemove && status === 'uploading' && (
        <Button
          size="icon"
          variant="ghost"
          onClick={onRemove}
          className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6"
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
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

  // Subir imagen en segundo plano via backend processImage
  useEffect(() => {
    if (!file || uploadedUrl) return;

    const uploadImage = async () => {
      try {
        // Validar tamaño (5MB máx)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`La foto pesa ${(file.size/1024/1024).toFixed(0)}MB y el máximo es 5MB.`);
        }
        // Enviar al backend para resize+compresión
        const response = await base44.functions.invoke('processImage', { image: file });
        const data = response.data;
        if (data?.error) throw new Error(data.userMessage || data.error);
        setUploadedUrl(data.file_url);
        setStatus('sent');
        onUploadComplete?.({ url: data.file_url, nombre: file.name, tipo: 'image/jpeg' });
      } catch (err) {
        setError(err.message);
        setStatus('error');
      }
    };

    uploadImage();
  }, [file, uploadedUrl, onUploadComplete]);

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
         <div className="absolute inset-0 bg-black/30 rounded-xl flex items-center justify-center">
           <div className="text-center">
             <Loader2 className="w-6 h-6 text-white animate-spin mx-auto mb-2" />
             <p className="text-white text-xs">Subiendo...</p>
           </div>
         </div>
       )}

       {status === 'error' && (
         <div className="absolute inset-0 bg-orange-500/80 rounded-xl flex items-center justify-center">
           <Button
             size="sm"
             variant="ghost"
             onClick={retry}
             className="text-white hover:bg-white/20 text-xs gap-1"
           >
             <RefreshCw className="w-4 h-4" />
             Reintentar
           </Button>
         </div>
       )}

       {onRemove && (
         <Button
           size="icon"
           variant="ghost"
           onClick={onRemove}
           className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white w-5 h-5 p-0 rounded-full"
         >
           <X className="w-3 h-3" />
         </Button>
       )}
    </div>
  );
}
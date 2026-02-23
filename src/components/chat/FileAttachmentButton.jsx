import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function FileAttachmentButton({ onFileUploaded, disabled = false }) {
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = '';

    // Validar tamaño (5MB máx)
    if (file.size > 5 * 1024 * 1024) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(0);
      toast.error(`El archivo pesa ${sizeMB}MB y el máximo es 5MB. Reduce la resolución o envía por WhatsApp a ti mismo.`, { duration: 10000 });
      return;
    }

    const isImage = file.type?.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name || '');

    setUploading(true);
    try {
      let fileUrl, fileName, fileType;
      if (isImage) {
        // Imágenes → processImage (resize + compresión backend)
        const response = await base44.functions.invoke('processImage', { image: file });
        const data = response.data;
        if (data?.error) throw new Error(data.userMessage || data.error);
        fileUrl = data.file_url;
        fileName = file.name;
        fileType = 'image/jpeg';
      } else {
        // Otros archivos → subida directa
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        fileUrl = file_url;
        fileName = file.name;
        fileType = file.type;
      }
      onFileUploaded({ url: fileUrl, nombre: fileName, tipo: fileType });
      toast.success("Archivo subido");
    } catch (error) {
      toast.error(error?.message || "Error al subir archivo");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        disabled={disabled || uploading}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || uploading}
        className="flex-shrink-0"
      >
        {uploading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Paperclip className="w-4 h-4" />
        )}
      </Button>
    </>
  );
}
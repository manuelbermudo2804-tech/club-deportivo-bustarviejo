import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { uploadChatImage, isChatImage } from "@/components/chat/uploadChatImage";

export default function FileAttachmentButton({ onFileUploaded, disabled = false }) {
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = '';

    // Validar tamaño (15MB máx — igual que el sistema central)
    if (file.size > 15 * 1024 * 1024) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(0);
      toast.error(`El archivo pesa ${sizeMB}MB y el máximo es 15MB.`, { duration: 10000 });
      return;
    }

    const isImage = isChatImage(file);

    try {
      let fileUrl, fileName, fileType;
      if (isImage) {
        // Imágenes → detección de dispositivo y cascada adaptativa compartida
        setUploading(true);
        const image = await uploadChatImage(file);
        fileUrl = image.url;
        fileName = file.name;
        fileType = image.tipo || 'image/jpeg';
      } else {
        // Otros archivos → subida directa
        setUploading(true);
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        fileUrl = file_url;
        fileName = file.name;
        fileType = file.type;
      }
      onFileUploaded({ url: fileUrl, nombre: fileName, tipo: fileType });
      if (!isImage) toast.success("Archivo subido");
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
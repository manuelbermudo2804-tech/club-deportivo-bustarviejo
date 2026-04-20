import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useImageUpload } from "../utils/useImageUpload";

export default function FileAttachmentButton({ onFileUploaded, disabled = false }) {
  const [uploadingImage, uploadFile] = useImageUpload();
  const [uploadingOther, setUploadingOther] = React.useState(false);
  const uploading = uploadingImage || uploadingOther;
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

    const isImage = file.type?.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name || '');

    try {
      let fileUrl, fileName, fileType;
      if (isImage) {
        // Imágenes → cascada robusta con reintentos
        fileUrl = await uploadFile(file);
        if (!fileUrl) return; // el hook ya muestra el error
        fileName = file.name;
        fileType = 'image/jpeg';
      } else {
        // Otros archivos → subida directa
        setUploadingOther(true);
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        fileUrl = file_url;
        fileName = file.name;
        fileType = file.type;
        setUploadingOther(false);
      }
      onFileUploaded({ url: fileUrl, nombre: fileName, tipo: fileType });
      if (!isImage) toast.success("Archivo subido");
    } catch (error) {
      setUploadingOther(false);
      toast.error(error?.message || "Error al subir archivo");
      console.error(error);
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
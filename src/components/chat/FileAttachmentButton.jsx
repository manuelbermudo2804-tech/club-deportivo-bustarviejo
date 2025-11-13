import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Paperclip, 
  Image, 
  FileText, 
  Mic, 
  Camera,
  Loader2 
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function FileAttachmentButton({ onFileUploaded, disabled }) {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (file, tipo) => {
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const attachment = {
        url: file_url,
        nombre: file.name,
        tipo: tipo,
        tamano: file.size
      };

      onFileUploaded(attachment);
      toast.success(`${tipo === 'imagen' ? 'Imagen' : tipo === 'audio' ? 'Audio' : 'Documento'} cargado correctamente`);
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Error al cargar el archivo");
    } finally {
      setUploading(false);
    }
  };

  const handleCameraCapture = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleFileUpload(file, 'imagen');
    }
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleFileUpload(file, 'imagen');
    }
  };

  const handleDocumentSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleFileUpload(file, 'documento');
    }
  };

  const handleAudioSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleFileUpload(file, 'audio');
    }
  };

  return (
    <>
      <input
        type="file"
        id="camera-input"
        accept="image/*"
        capture="environment"
        onChange={handleCameraCapture}
        className="hidden"
      />
      <input
        type="file"
        id="image-input"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
      />
      <input
        type="file"
        id="document-input"
        accept=".pdf,.doc,.docx,.txt,.xls,.xlsx"
        onChange={handleDocumentSelect}
        className="hidden"
      />
      <input
        type="file"
        id="audio-input"
        accept="audio/*"
        onChange={handleAudioSelect}
        className="hidden"
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled || uploading}
            className="text-slate-600 hover:text-orange-600 hover:bg-orange-50"
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Paperclip className="w-5 h-5" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem
            onClick={() => document.getElementById('camera-input').click()}
          >
            <Camera className="w-4 h-4 mr-2 text-blue-600" />
            Cámara
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => document.getElementById('image-input').click()}
          >
            <Image className="w-4 h-4 mr-2 text-green-600" />
            Imagen/Foto
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => document.getElementById('document-input').click()}
          >
            <FileText className="w-4 h-4 mr-2 text-orange-600" />
            Documento
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => document.getElementById('audio-input').click()}
          >
            <Mic className="w-4 h-4 mr-2 text-purple-600" />
            Audio
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
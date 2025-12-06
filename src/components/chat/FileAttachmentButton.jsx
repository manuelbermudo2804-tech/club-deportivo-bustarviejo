import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Paperclip, 
  Image, 
  FileText, 
  Mic, 
  Camera,
  Video,
  MapPin,
  Loader2 
} from "lucide-react";
import VoiceRecorder from "./VoiceRecorder";
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
      console.log(`⬆️ Subiendo ${tipo}: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const attachment = {
        url: file_url,
        nombre: file.name,
        tipo: tipo,
        tamano: file.size
      };

      onFileUploaded(attachment);
      const tipoLabel = {
        'imagen': 'Imagen',
        'audio': 'Audio',
        'video': 'Video',
        'documento': 'Documento'
      };
      toast.success(`✅ ${tipoLabel[tipo] || 'Archivo'} cargado correctamente`);
    } catch (error) {
      console.error("Error uploading file:", error);
      const sizeMB = (file.size / 1024 / 1024).toFixed(1);
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`Error: El archivo es muy grande (${sizeMB}MB). Intenta con uno más pequeño.`);
      } else {
        toast.error(`Error al cargar el archivo. Intenta de nuevo.`);
      }
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

  const handleVideoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    console.log(`📹 Video seleccionado: ${file.name}, tamaño: ${sizeMB}MB`);
    
    // Validar tamaño (max 100MB para videos)
    if (file.size > 100 * 1024 * 1024) {
      toast.error(`El video es demasiado grande (${sizeMB}MB). Máximo 100MB`);
      e.target.value = ''; // Reset input
      return;
    }
    
    toast.info(`📹 Subiendo video (${sizeMB}MB)... Por favor espera`);
    await handleFileUpload(file, 'video');
    e.target.value = ''; // Reset input después de subir
  };

  const handleVideoCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    console.log(`📹 Video grabado: ${file.name}, tamaño: ${sizeMB}MB`);
    
    if (file.size > 100 * 1024 * 1024) {
      toast.error(`El video es demasiado grande (${sizeMB}MB). Máximo 100MB`);
      e.target.value = '';
      return;
    }
    
    toast.info(`📹 Subiendo video (${sizeMB}MB)... Por favor espera`);
    await handleFileUpload(file, 'video');
    e.target.value = '';
  };

  const handleLocationShare = () => {
    if (!navigator.geolocation) {
      toast.error("Tu navegador no soporta geolocalización");
      return;
    }

    setUploading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        
        const attachment = {
          url: mapsUrl,
          nombre: "📍 Ubicación compartida",
          tipo: "ubicacion",
          tamano: 0,
          coords: { lat: latitude, lng: longitude }
        };

        onFileUploaded(attachment);
        toast.success("📍 Ubicación compartida");
        setUploading(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        toast.error("No se pudo obtener la ubicación. Verifica los permisos.");
        setUploading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleVoiceRecordingComplete = async (audioFile) => {
    await handleFileUpload(audioFile, 'audio');
  };

  return (
    <>
      <VoiceRecorder 
        onRecordingComplete={handleVoiceRecordingComplete}
        disabled={disabled || uploading}
      />
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
      <input
        type="file"
        id="video-input"
        accept="video/*"
        onChange={handleVideoSelect}
        className="hidden"
      />
      <input
        type="file"
        id="video-capture-input"
        accept="video/*"
        capture="environment"
        onChange={handleVideoCapture}
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
          <DropdownMenuItem
            onClick={() => document.getElementById('video-capture-input').click()}
          >
            <Video className="w-4 h-4 mr-2 text-red-600" />
            Grabar Video
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => document.getElementById('video-input').click()}
          >
            <Video className="w-4 h-4 mr-2 text-pink-600" />
            Seleccionar Video
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLocationShare}>
            <MapPin className="w-4 h-4 mr-2 text-teal-600" />
            Compartir Ubicación
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
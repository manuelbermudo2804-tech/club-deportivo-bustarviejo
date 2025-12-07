import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, Camera, Mic, MapPin, BarChart3, Smile, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ChatInputActions({ 
  onFileClick,
  onCameraClick,
  onAudioClick,
  onLocationClick,
  onPollClick,
  onQuickRepliesClick,
  uploading,
  isRecording,
  showQuickReplies = true,
  showPoll = true,
  showLocation = true,
  showAudio = true,
  showCamera = true,
  showGallery = true
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          type="button" 
          variant="outline" 
          size="icon" 
          className="h-9 w-9 sm:h-10 sm:w-10"
          disabled={uploading || isRecording}
        >
          <Plus className="w-5 h-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {showGallery && (
          <DropdownMenuItem onClick={onFileClick} disabled={uploading}>
            <Paperclip className="w-4 h-4 mr-2" />
            Adjuntar archivo
          </DropdownMenuItem>
        )}
        
        {showCamera && (
          <DropdownMenuItem onClick={onCameraClick} disabled={uploading}>
            <Camera className="w-4 h-4 mr-2" />
            Tomar foto
          </DropdownMenuItem>
        )}
        
        {showAudio && (
          <DropdownMenuItem onClick={onAudioClick} disabled={uploading}>
            <Mic className="w-4 h-4 mr-2" />
            {isRecording ? "Detener grabación" : "Grabar audio"}
          </DropdownMenuItem>
        )}
        
        {showLocation && (
          <DropdownMenuItem onClick={onLocationClick}>
            <MapPin className="w-4 h-4 mr-2" />
            Enviar ubicación
          </DropdownMenuItem>
        )}
        
        {showPoll && (
          <DropdownMenuItem onClick={onPollClick}>
            <BarChart3 className="w-4 h-4 mr-2" />
            Crear encuesta
          </DropdownMenuItem>
        )}
        
        {showQuickReplies && onQuickRepliesClick && (
          <DropdownMenuItem onClick={onQuickRepliesClick}>
            <Smile className="w-4 h-4 mr-2" />
            Respuestas rápidas
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
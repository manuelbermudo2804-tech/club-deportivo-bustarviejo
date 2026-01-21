import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, X, Paperclip, Camera, MapPin, Music, Dumbbell } from "lucide-react";

export default function ChatActionMenu({
  onFileClick,
  onCameraClick,
  onAudioClick,
  onLocationClick,
  onPollClick,
  onQuickRepliesClick,
  onExerciseClick,
  uploading = false,
  isRecording = false,
  showCamera = false,
  showAudio = false,
  showLocation = false,
  showPoll = false,
  showQuickReplies = false,
  showExercise = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const actions = [
    { show: true, label: "Archivo", icon: Paperclip, onClick: () => { onFileClick(); setIsOpen(false); }, color: "text-blue-600" },
    { show: showCamera, label: "Cámara", icon: Camera, onClick: () => { onCameraClick(); setIsOpen(false); }, color: "text-green-600" },
    { show: showAudio, label: isRecording ? "Detener" : "Audio", icon: Music, onClick: () => { onAudioClick(); setIsOpen(false); }, color: "text-red-600" },
    { show: showLocation, label: "Ubicación", icon: MapPin, onClick: () => { onLocationClick(); setIsOpen(false); }, color: "text-orange-600" },
    { show: showPoll, label: "Encuesta", icon: Music, onClick: () => { onPollClick(); setIsOpen(false); }, color: "text-purple-600" },
    { show: showQuickReplies, label: "Respuestas", icon: Music, onClick: () => { onQuickRepliesClick(); setIsOpen(false); }, color: "text-indigo-600" },
    { show: showExercise, label: "Ejercicio", icon: Dumbbell, onClick: () => { onExerciseClick(); setIsOpen(false); }, color: "text-orange-600" },
  ].filter(a => a.show);

  if (actions.length === 0) return null;

  return (
    <div ref={menuRef} className="relative">
      <Button
        size="icon"
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        disabled={uploading}
        className="h-10 w-10"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
      </Button>

      {isOpen && (
        <div className="absolute bottom-12 left-0 bg-white border border-slate-200 rounded-lg shadow-lg p-2 space-y-1 z-50">
          {actions.map((action, idx) => (
            <button
              key={idx}
              onClick={action.onClick}
              disabled={uploading}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors text-sm disabled:opacity-50"
            >
              <action.icon className={`w-4 h-4 ${action.color}`} />
              <span className="text-slate-700">{action.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
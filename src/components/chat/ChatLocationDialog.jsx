import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";
import { toast } from "sonner";

// Diálogo común de "Enviar ubicación" para todos los chats
export default function ChatLocationDialog({ open, onOpenChange, onSend }) {
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");

  const enviar = () => {
    if (!("geolocation" in navigator)) return toast.error("Tu navegador no soporta geolocalización");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onSend({
          mensaje: "📍 Ubicación compartida",
          adjuntos: [],
          ubicacion: { latitud: pos.coords.latitude, longitud: pos.coords.longitude, nombre, direccion },
        });
        onOpenChange(false);
        setNombre(""); setDireccion("");
        toast.success("Ubicación enviada");
      },
      () => toast.error("No se pudo obtener tu ubicación")
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>📍 Enviar Ubicación</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Nombre del lugar (ej: Campo de fútbol)" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <Input placeholder="Dirección (opcional)" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancelar</Button>
            <Button onClick={enviar} className="flex-1 bg-green-600"><MapPin className="w-4 h-4 mr-2" />Enviar mi ubicación</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
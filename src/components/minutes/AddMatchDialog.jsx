import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AddMatchDialog({ open, onOpenChange, onAdd, defaultDuracion = 0 }) {
  const [rival, setRival] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [localVisitante, setLocalVisitante] = useState("Local");
  const [duracion, setDuracion] = useState(String(defaultDuracion || 60));

  const handleSubmit = () => {
    if (!rival.trim()) return;
    onAdd({
      rival: rival.trim(),
      fecha_partido: fecha,
      local_visitante: localVisitante,
      duracion_partido: parseInt(duracion) || 0
    });
    setRival("");
    setFecha(new Date().toISOString().split('T')[0]);
    setLocalVisitante("Local");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Añadir Partido</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Rival *</Label>
            <Input
              value={rival}
              onChange={(e) => setRival(e.target.value)}
              placeholder="Nombre del equipo rival"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Fecha</Label>
              <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
            <div>
              <Label>Local / Visitante</Label>
              <Select value={localVisitante} onValueChange={setLocalVisitante}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Local">Local</SelectItem>
                  <SelectItem value="Visitante">Visitante</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Duración del partido (min)</Label>
            <Input
              type="number"
              value={duracion}
              onChange={(e) => setDuracion(e.target.value)}
              placeholder="60"
              min="0"
            />
            <p className="text-[10px] text-slate-500 mt-1">Para calcular % de minutos jugados</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!rival.trim()}>Añadir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
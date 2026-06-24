import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Alta rápida de un prospecto en el pipeline (datos mínimos).
export default function CrmQuickAddDialog({ open, onClose, onCreate, isSubmitting }) {
  const [form, setForm] = useState({});

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = () => {
    if (!form.nombre?.trim()) return;
    onCreate({
      nombre: form.nombre.trim(),
      sector: form.sector?.trim() || undefined,
      contacto_nombre: form.contacto_nombre?.trim() || undefined,
      contacto_telefono: form.contacto_telefono?.trim() || undefined,
      contacto_email: form.contacto_email?.trim() || undefined,
      interes: form.interes?.trim() || undefined,
      importe_potencial: form.importe_potencial ? Number(form.importe_potencial) : undefined,
      etapa_crm: "prospecto",
      activo: false,
    });
    setForm({});
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva empresa / prospecto</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Nombre de la empresa *</Label>
            <Input value={form.nombre || ""} onChange={(e) => set("nombre", e.target.value)} placeholder="ej: Talleres Bustarviejo" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Sector</Label>
              <Input value={form.sector || ""} onChange={(e) => set("sector", e.target.value)} placeholder="ferretería" />
            </div>
            <div>
              <Label className="text-xs">Importe potencial (€)</Label>
              <Input type="number" value={form.importe_potencial || ""} onChange={(e) => set("importe_potencial", e.target.value)} placeholder="800" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Persona de contacto</Label>
            <Input value={form.contacto_nombre || ""} onChange={(e) => set("contacto_nombre", e.target.value)} placeholder="Juan Pérez" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Teléfono</Label>
              <Input value={form.contacto_telefono || ""} onChange={(e) => set("contacto_telefono", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" value={form.contacto_email || ""} onChange={(e) => set("contacto_email", e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs">¿Qué le interesa?</Label>
            <Input value={form.interes || ""} onChange={(e) => set("interes", e.target.value)} placeholder="Equipación benjamín, banner web..." />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!form.nombre?.trim() || isSubmitting} className="flex-1 bg-amber-600 hover:bg-amber-700">
              {isSubmitting ? "Creando..." : "Añadir al pipeline"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
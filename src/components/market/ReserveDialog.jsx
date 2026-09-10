import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ReserveDialog({ item, user, open, onClose, onConfirm }) {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNombre(user?.full_name || '');
      setTelefono(user?.telefono || '');
      setSaving(false);
    }
  }, [open, user]);

  const telefonoValido = telefono.replace(/\D/g, '').length >= 9;
  const puedeEnviar = nombre.trim().length > 2 && telefonoValido;

  const submit = async () => {
    if (!puedeEnviar) return;
    setSaving(true);
    try {
      await onConfirm({ nombre: nombre.trim(), telefono: telefono.trim() });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reservar «{item?.titulo}»</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            El vendedor necesita tus datos para poder quedar contigo. Se los enviamos solo a él/ella y al club.
          </p>
          <div>
            <Label>Tu nombre *</Label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre y apellidos" />
          </div>
          <div>
            <Label>Tu teléfono (WhatsApp) *</Label>
            <Input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="600 000 000" />
            {telefono && !telefonoValido && (
              <p className="text-xs text-red-600 mt-1">Escribe un teléfono válido (al menos 9 cifras).</p>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button className="flex-1 bg-orange-600 hover:bg-orange-700" onClick={submit} disabled={!puedeEnviar || saving}>
              {saving ? 'Reservando…' : 'Confirmar reserva'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Heart, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function VolunteerModal({ open, onOpenChange }) {
  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    disponibilidad_manana: false,
    disponibilidad_tarde: false,
    notas: "",
  });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const reset = () => {
    setForm({ nombre: "", telefono: "", disponibilidad_manana: false, disponibilidad_tarde: false, notas: "" });
    setDone(false);
  };

  const handleClose = (val) => {
    if (!val) {
      setTimeout(reset, 200);
    }
    onOpenChange(val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.telefono.trim()) {
      toast.error("Por favor, rellena nombre y teléfono");
      return;
    }
    if (!form.disponibilidad_manana && !form.disponibilidad_tarde) {
      toast.error("Indica al menos una disponibilidad (mañana o tarde)");
      return;
    }

    setSaving(true);
    try {
      await base44.functions.invoke("sanIsidroVolunteer", form);
      setDone(true);
    } catch (err) {
      toast.error("Error al enviar. Inténtalo de nuevo.");
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <div className="bg-gradient-to-r from-pink-600 via-red-500 to-orange-500 p-5 text-center">
          <Heart className="w-10 h-10 text-white mx-auto mb-2" />
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-black">¡Quiero ser voluntario!</DialogTitle>
          </DialogHeader>
          <p className="text-white/90 text-xs mt-1">San Isidro 2026 • CD Bustarviejo</p>
        </div>

        {done ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-black text-slate-900">¡Gracias por ofrecerte!</h3>
            <p className="text-slate-600 text-sm">El coordinador del club se pondrá en contacto contigo pronto.</p>
            <Button onClick={() => handleClose(false)} className="bg-red-600 hover:bg-red-700 text-white">
              Cerrar
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <p className="text-sm text-slate-600 bg-pink-50 border border-pink-200 rounded-lg p-3">
              💪 ¿Quieres echar una mano en San Isidro? Déjanos tus datos y te contactaremos.
            </p>

            <div>
              <Label className="text-xs">Nombre y apellidos *</Label>
              <Input
                value={form.nombre}
                onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                placeholder="Ej: María García"
              />
            </div>

            <div>
              <Label className="text-xs">Teléfono *</Label>
              <Input
                type="tel"
                value={form.telefono}
                onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))}
                placeholder="Ej: 600 123 456"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Disponibilidad *</Label>
              <div className="flex gap-3">
                <label className="flex-1 flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer hover:bg-yellow-50 transition-all"
                  style={{ borderColor: form.disponibilidad_manana ? "#eab308" : "#e2e8f0", background: form.disponibilidad_manana ? "#fef9c3" : "white" }}>
                  <Checkbox
                    checked={form.disponibilidad_manana}
                    onCheckedChange={v => setForm(p => ({ ...p, disponibilidad_manana: !!v }))}
                  />
                  <span className="text-sm font-semibold">☀️ Mañana</span>
                </label>
                <label className="flex-1 flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer hover:bg-orange-50 transition-all"
                  style={{ borderColor: form.disponibilidad_tarde ? "#f97316" : "#e2e8f0", background: form.disponibilidad_tarde ? "#ffedd5" : "white" }}>
                  <Checkbox
                    checked={form.disponibilidad_tarde}
                    onCheckedChange={v => setForm(p => ({ ...p, disponibilidad_tarde: !!v }))}
                  />
                  <span className="text-sm font-semibold">🌅 Tarde</span>
                </label>
              </div>
            </div>

            <div>
              <Label className="text-xs">¿En qué te gustaría ayudar? (opcional)</Label>
              <Textarea
                value={form.notas}
                onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
                placeholder="Ej: Barra, montaje, recogida, arbitraje..."
                rows={2}
              />
            </div>

            <Button type="submit" disabled={saving} className="w-full bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700 text-white font-bold py-3">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</> : <><Heart className="w-4 h-4 mr-2" /> Apuntarme como voluntario</>}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart, Loader2, CheckCircle2, Clock, Users, Lock } from "lucide-react";
import { toast } from "sonner";
import { TURNOS, countByTurno, isTurnoCompleto } from "./turnosConfig";

export default function VolunteerModal({ open, onOpenChange }) {
  const [form, setForm] = useState({ nombre: "", telefono: "", turno: "", notas: "" });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [counts, setCounts] = useState({});
  const [loadingCounts, setLoadingCounts] = useState(false);

  // Cargar plazas al abrir
  useEffect(() => {
    if (!open) return;
    let cancel = false;
    setLoadingCounts(true);
    base44.entities.SanIsidroVoluntario.list("-created_date", 500)
      .then(list => { if (!cancel) setCounts(countByTurno(list)); })
      .catch(() => {})
      .finally(() => { if (!cancel) setLoadingCounts(false); });
    return () => { cancel = true; };
  }, [open]);

  const reset = () => {
    setForm({ nombre: "", telefono: "", turno: "", notas: "" });
    setDone(false);
  };

  const handleClose = (val) => {
    if (!val) setTimeout(reset, 200);
    onOpenChange(val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.telefono.trim()) {
      toast.error("Por favor, rellena nombre y teléfono");
      return;
    }
    if (!form.turno) {
      toast.error("Elige un turno");
      return;
    }

    setSaving(true);
    try {
      const res = await base44.functions.invoke("sanIsidroVolunteer", form);
      const data = res?.data || {};
      if (data.error) {
        toast.error(data.error);
        setSaving(false);
        return;
      }
      setDone(true);
    } catch (err) {
      const msg = err?.response?.data?.error || "Error al enviar. Inténtalo de nuevo.";
      toast.error(msg);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-pink-600 via-red-500 to-orange-500 p-5 text-center sticky top-0 z-10">
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
              💪 Elige el turno que mejor te venga. Te contactaremos para confirmar.
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
              <Label className="text-xs flex items-center gap-1">
                <Clock className="w-3 h-3" /> Elige tu turno *
              </Label>
              {loadingCounts && (
                <p className="text-xs text-slate-400 italic">Cargando plazas...</p>
              )}
              <div className="space-y-2">
                {TURNOS.map(t => {
                  const ocupadas = counts[t.id] || 0;
                  const completo = isTurnoCompleto(t, ocupadas);
                  const restantes = Math.max(0, t.plazas - ocupadas);
                  const selected = form.turno === t.id;
                  return (
                    <button
                      type="button"
                      key={t.id}
                      disabled={completo}
                      onClick={() => setForm(p => ({ ...p, turno: t.id }))}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                        completo
                          ? "border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed"
                          : selected
                          ? "border-red-500 bg-red-50 shadow-sm"
                          : "border-slate-200 bg-white hover:border-red-300 hover:bg-red-50/30 active:scale-[0.99]"
                      }`}
                    >
                      <span className="text-2xl">{t.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-slate-800 text-sm">{t.label}</p>
                          {completo && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-200 text-slate-700 rounded-full px-2 py-0.5">
                              <Lock className="w-2.5 h-2.5" /> COMPLETO
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{t.horario}</p>
                        {!completo && (
                          <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Users className="w-3 h-3" />
                            {restantes} {restantes === 1 ? "plaza disponible" : "plazas disponibles"} de {t.plazas}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
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

            <Button
              type="submit"
              disabled={saving || !form.turno}
              className="w-full bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700 text-white font-bold py-3"
            >
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</> : <><Heart className="w-4 h-4 mr-2" /> Apuntarme como voluntario</>}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
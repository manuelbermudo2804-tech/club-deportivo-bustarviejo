import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart, Loader2, CheckCircle2, Clock, Users, Lock, Sparkles, Calendar, MapPin } from "lucide-react";
import { toast } from "sonner";
import { TURNOS, countByTurno, isTurnoCompleto, getTurno } from "./turnosConfig";
import { validatePhone } from "./validators";
import confetti from "canvas-confetti";

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
    const phoneCheck = validatePhone(form.telefono);
    if (!phoneCheck.valid) {
      toast.error(phoneCheck.error);
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
      // Confetti party 🎉
      const colors = ["#ec4899", "#ef4444", "#f97316", "#fbbf24"];
      confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 }, colors });
      setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors }), 250);
      setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors }), 250);
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
          <div className="p-6 text-center space-y-4 animate-fade-in-scale">
            <div className="relative">
              <div className="absolute inset-0 flex items-center justify-around text-3xl opacity-50">
                <span className="animate-bounce" style={{ animationDelay: "0s" }}>🎉</span>
                <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>💖</span>
                <span className="animate-bounce" style={{ animationDelay: "0.4s" }}>🎊</span>
              </div>
              <div className="relative w-20 h-20 bg-gradient-to-br from-pink-100 to-red-100 rounded-full flex items-center justify-center mx-auto ring-4 ring-pink-200">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-black text-slate-900 flex items-center justify-center gap-2">
                <Heart className="w-6 h-6 text-pink-500 fill-pink-500" />
                ¡QUÉ GRANDE!
                <Heart className="w-6 h-6 text-pink-500 fill-pink-500" />
              </h3>
              <p className="text-slate-600 text-sm mt-1 font-semibold">{form.nombre}, eres parte de la familia 💪</p>
            </div>

            {form.turno && (
              <div className="bg-gradient-to-r from-pink-50 to-red-50 border-2 border-pink-200 rounded-xl p-3">
                <p className="text-xs font-bold text-pink-700 uppercase">Tu turno</p>
                <p className="text-base font-black text-slate-900 flex items-center justify-center gap-2 mt-1">
                  <span className="text-2xl">{getTurno(form.turno)?.emoji}</span>
                  {getTurno(form.turno)?.label} · {getTurno(form.turno)?.horario}
                </p>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-left space-y-1.5">
              <p className="text-xs font-bold text-amber-700 uppercase">📅 No te lo pierdas</p>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Calendar className="w-4 h-4 text-amber-600" />
                <span className="font-bold">15 de Mayo 2026</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <MapPin className="w-4 h-4 text-amber-600" />
                <span>Bustarviejo · Campo de fútbol</span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-xl p-3">
              <p className="text-sm font-bold leading-relaxed flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4" />
                Sin gente como tú, San Isidro no sería lo mismo
                <Sparkles className="w-4 h-4" />
              </p>
              <p className="text-xs text-white/90 mt-1">Te contactaremos pronto para confirmar 📞</p>
            </div>

            <Button
              onClick={() => handleClose(false)}
              className="w-full bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700 text-white font-bold py-3"
            >
              ¡Genial, hasta pronto! 👋
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
                  const porcentaje = Math.min(100, (ocupadas / t.plazas) * 100);
                  // Color del badge de plazas según escasez
                  let badgeColor = "bg-green-500";
                  let mensaje = "¡Plazas libres!";
                  if (restantes <= 2 && restantes > 0) { badgeColor = "bg-orange-500"; mensaje = "¡Últimas plazas!"; }
                  else if (restantes <= 4 && restantes > 0) { badgeColor = "bg-yellow-500"; mensaje = "¡Quedan pocas!"; }

                  return (
                    <button
                      type="button"
                      key={t.id}
                      disabled={completo}
                      onClick={() => setForm(p => ({ ...p, turno: t.id }))}
                      className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                        completo
                          ? "border-slate-200 bg-slate-50 opacity-70 cursor-not-allowed"
                          : selected
                          ? "border-red-500 bg-red-50 shadow-md scale-[1.01]"
                          : "border-slate-200 bg-white hover:border-red-300 hover:shadow-sm active:scale-[0.99]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{t.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 text-base">{t.label}</p>
                          <p className="text-xs text-slate-500">{t.horario}</p>
                        </div>
                        {completo ? (
                          <div className="flex flex-col items-center bg-slate-200 text-slate-700 rounded-lg px-3 py-1.5 shrink-0">
                            <Lock className="w-4 h-4" />
                            <span className="text-[10px] font-black mt-0.5">COMPLETO</span>
                          </div>
                        ) : (
                          <div className={`flex flex-col items-center ${badgeColor} text-white rounded-lg px-3 py-1.5 shrink-0 shadow-sm`}>
                            <span className="text-2xl font-black leading-none">{restantes}</span>
                            <span className="text-[9px] font-bold uppercase tracking-wide mt-0.5">
                              {restantes === 1 ? "plaza" : "plazas"}
                            </span>
                          </div>
                        )}
                      </div>
                      {/* Barra de progreso */}
                      <div className="mt-2 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            completo ? "bg-slate-400" : restantes <= 2 ? "bg-orange-500" : restantes <= 4 ? "bg-yellow-500" : "bg-green-500"
                          }`}
                          style={{ width: `${porcentaje}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Users className="w-3 h-3" /> {ocupadas} / {t.plazas} apuntados
                        </p>
                        {!completo && (
                          <p className={`text-[11px] font-bold ${
                            restantes <= 2 ? "text-orange-600" : restantes <= 4 ? "text-yellow-700" : "text-green-600"
                          }`}>
                            {mensaje}
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
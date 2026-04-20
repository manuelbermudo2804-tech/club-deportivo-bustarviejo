import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Check, Trophy, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";

const MODALIDADES = [
  { id: "chapa_ninos", label: "Fútbol Chapa - Niños/Jóvenes", tipo: "chapa", icon: "🏆", color: "orange" },
  { id: "chapa_adultos", label: "Fútbol Chapa - Adultos", tipo: "chapa", icon: "🏆", color: "orange" },
  { id: "3para3_7_10", label: "3 para 3 (7-10 años)", tipo: "3para3", icon: "⚽", color: "green" },
  { id: "3para3_11_15", label: "3 para 3 (11-15 años)", tipo: "3para3", icon: "⚽", color: "green" },
];

export default function SanIsidroForm({ onClose, onBack }) {
  const [step, setStep] = useState("select"); // select | form | success
  const [selectedMod, setSelectedMod] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nombre_responsable: "",
    telefono_responsable: "",
    email_responsable: "",
    jugador_nombre: "",
    nombre_equipo: "",
    jugador_1: "",
    jugador_2: "",
    jugador_3: "",
    notas: "",
  });

  const mod = MODALIDADES.find(m => m.id === selectedMod);
  const isChapa = mod?.tipo === "chapa";
  const is3para3 = mod?.tipo === "3para3";

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre_responsable || !form.telefono_responsable) {
      toast.error("Por favor, rellena el nombre y teléfono del responsable");
      return;
    }
    if (isChapa && !form.jugador_nombre) {
      toast.error("Por favor, indica el nombre del jugador");
      return;
    }
    if (is3para3 && (!form.nombre_equipo || !form.jugador_1 || !form.jugador_2 || !form.jugador_3)) {
      toast.error("Por favor, rellena el nombre del equipo y los 3 jugadores");
      return;
    }

    setSaving(true);
    const data = {
      modalidad: mod.label,
      nombre_responsable: form.nombre_responsable,
      telefono_responsable: form.telefono_responsable,
      email_responsable: form.email_responsable || undefined,
    };

    if (isChapa) {
      data.jugador_nombre = form.jugador_nombre;
    } else {
      data.nombre_equipo = form.nombre_equipo;
      data.jugador_1 = form.jugador_1;
      data.jugador_2 = form.jugador_2;
      data.jugador_3 = form.jugador_3;
    }
    if (form.notas) data.notas = form.notas;

    await base44.entities.SanIsidroRegistration.create(data);
    setSaving(false);
    setStep("success");
  };

  if (step === "success") {
    return (
      <div className="p-6 text-center space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">¡Inscripción Enviada!</h3>
        <p className="text-slate-600 text-sm">Tu inscripción en <strong>{mod?.label}</strong> se ha registrado correctamente.</p>
        <p className="text-slate-500 text-xs">Te esperamos el 15 de Mayo 🎉</p>
        <div className="flex gap-2 justify-center pt-2">
          <Button variant="outline" onClick={() => { setStep("select"); setSelectedMod(null); setForm({ nombre_responsable: "", telefono_responsable: "", email_responsable: "", jugador_nombre: "", nombre_equipo: "", jugador_1: "", jugador_2: "", jugador_3: "", notas: "" }); }}>
            Otra inscripción
          </Button>
          <Button onClick={onClose} className="bg-red-600 hover:bg-red-700">
            Cerrar
          </Button>
        </div>
      </div>
    );
  }

  if (step === "select") {
    return (
      <div className="p-4 space-y-3 overflow-y-auto">
        <div className="flex items-center gap-2 mb-2">
          <button onClick={onBack} className="text-slate-500 hover:text-slate-800">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h3 className="text-lg font-bold text-slate-900">Elige tu torneo</h3>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Fútbol Chapa (Individual)</p>
          {MODALIDADES.filter(m => m.tipo === "chapa").map(m => (
            <button
              key={m.id}
              onClick={() => { setSelectedMod(m.id); setStep("form"); }}
              className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-orange-200 hover:border-orange-400 hover:bg-orange-50 transition-colors text-left"
            >
              <span className="text-2xl">{m.icon}</span>
              <div>
                <p className="font-bold text-slate-800 text-sm">{m.label}</p>
                <p className="text-xs text-slate-500">1 jugador por inscripción</p>
              </div>
            </button>
          ))}
        </div>

        <div className="space-y-2 pt-2">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">3 para 3 (Equipos de 3)</p>
          {MODALIDADES.filter(m => m.tipo === "3para3").map(m => (
            <button
              key={m.id}
              onClick={() => { setSelectedMod(m.id); setStep("form"); }}
              className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-green-200 hover:border-green-400 hover:bg-green-50 transition-colors text-left"
            >
              <span className="text-2xl">{m.icon}</span>
              <div>
                <p className="font-bold text-slate-800 text-sm">{m.label}</p>
                <p className="text-xs text-slate-500">Equipo de 3 jugadores</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // step === "form"
  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-3 overflow-y-auto max-h-[80vh]">
      <div className="flex items-center gap-2 mb-1">
        <button type="button" onClick={() => setStep("select")} className="text-slate-500 hover:text-slate-800">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h3 className="text-lg font-bold text-slate-900">{mod?.icon} {mod?.label}</h3>
          <p className="text-xs text-slate-500">{isChapa ? "1 jugador por inscripción" : "Equipo de 3 jugadores"}</p>
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl p-3 space-y-2">
        <p className="text-xs font-semibold text-slate-600 uppercase">Datos del responsable</p>
        <div>
          <Label className="text-xs">Nombre y apellidos *</Label>
          <Input value={form.nombre_responsable} onChange={e => updateField("nombre_responsable", e.target.value)} placeholder="Ej: Juan García López" />
        </div>
        <div>
          <Label className="text-xs">Teléfono *</Label>
          <Input value={form.telefono_responsable} onChange={e => updateField("telefono_responsable", e.target.value)} placeholder="Ej: 600 123 456" type="tel" />
        </div>
        <div>
          <Label className="text-xs">Email (opcional)</Label>
          <Input value={form.email_responsable} onChange={e => updateField("email_responsable", e.target.value)} placeholder="Ej: email@ejemplo.com" type="email" />
        </div>
      </div>

      {isChapa && (
        <div className="bg-orange-50 rounded-xl p-3 space-y-2 border border-orange-200">
          <p className="text-xs font-semibold text-orange-700 uppercase">Jugador</p>
          <div>
            <Label className="text-xs">Nombre y apellidos del jugador *</Label>
            <Input value={form.jugador_nombre} onChange={e => updateField("jugador_nombre", e.target.value)} placeholder="Ej: Pedro García" />
          </div>
        </div>
      )}

      {is3para3 && (
        <div className="bg-green-50 rounded-xl p-3 space-y-2 border border-green-200">
          <p className="text-xs font-semibold text-green-700 uppercase">Equipo</p>
          <div>
            <Label className="text-xs">Nombre del equipo *</Label>
            <Input value={form.nombre_equipo} onChange={e => updateField("nombre_equipo", e.target.value)} placeholder="Ej: Los Tigres" />
          </div>
          <div>
            <Label className="text-xs">Jugador 1 - Nombre y apellidos *</Label>
            <Input value={form.jugador_1} onChange={e => updateField("jugador_1", e.target.value)} placeholder="Nombre completo" />
          </div>
          <div>
            <Label className="text-xs">Jugador 2 - Nombre y apellidos *</Label>
            <Input value={form.jugador_2} onChange={e => updateField("jugador_2", e.target.value)} placeholder="Nombre completo" />
          </div>
          <div>
            <Label className="text-xs">Jugador 3 - Nombre y apellidos *</Label>
            <Input value={form.jugador_3} onChange={e => updateField("jugador_3", e.target.value)} placeholder="Nombre completo" />
          </div>
        </div>
      )}

      <div>
        <Label className="text-xs">Observaciones (opcional)</Label>
        <Textarea value={form.notas} onChange={e => updateField("notas", e.target.value)} placeholder="Algo que quieras comentar..." rows={2} />
      </div>

      <Button type="submit" disabled={saving} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3">
        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</> : "✅ Enviar Inscripción"}
      </Button>
    </form>
  );
}
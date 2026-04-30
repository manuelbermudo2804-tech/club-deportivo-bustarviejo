import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Check, Trophy, Users, Loader2, PartyPopper, Clock, Heart } from "lucide-react";
import { toast } from "sonner";
import VolunteerModal from "../components/sanisidro/VolunteerModal";
import EventInfoBanner from "../components/sanisidro/EventInfoBanner";
import SuccessCelebration from "../components/sanisidro/SuccessCelebration";

const FECHA_INICIO = new Date("2026-04-19T00:00:00");
const FECHA_FIN = new Date("2026-05-15T23:59:59");

const CLUB_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

const MODALIDADES = [
  { id: "chapa_ninos", label: "Fútbol Chapa - Niños/Jóvenes", tipo: "chapa", icon: "🏆", color: "orange" },
  { id: "chapa_adultos", label: "Fútbol Chapa - Adultos", tipo: "chapa", icon: "🏆", color: "orange" },
  { id: "3para3_7_10", label: "3 para 3 (7-10 años)", tipo: "3para3", icon: "⚽", color: "green" },
  { id: "3para3_11_15", label: "3 para 3 (11-15 años)", tipo: "3para3", icon: "⚽", color: "green" },
];

const WEB_CLUB = "https://www.cdbustarviejo.com";

function SuccessScreen({ modLabel, onReset }) {
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (countdown <= 0) {
      window.location.href = WEB_CLUB;
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  return (
    <SuccessCelebration
      type="torneo"
      title={`¡Inscrito en ${modLabel}!`}
      subtitle="Tu participación está registrada correctamente."
      onClose={onReset}
    >
      <div className="flex flex-col gap-2 pt-1">
        <Button onClick={onReset} variant="outline" className="w-full font-bold">
          🔁 Apuntar a otra persona
        </Button>
        <a href={WEB_CLUB} className="w-full">
          <Button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold">
            🏠 Ir a la web del club
          </Button>
        </a>
        <p className="text-center text-slate-400 text-xs pt-1">
          Volverás a la web automáticamente en {countdown}s
        </p>
      </div>
    </SuccessCelebration>
  );
}

export default function SanIsidroInscripcion() {
  const [step, setStep] = useState("select");
  const [selectedMod, setSelectedMod] = useState(null);
  const [saving, setSaving] = useState(false);
  const [volunteerOpen, setVolunteerOpen] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    email: "",
    nombre_equipo: "",
    jugador_1: "",
    jugador_2: "",
    jugador_3: "",
  });

  const now = new Date();
  const isOpen = now >= FECHA_INICIO && now <= FECHA_FIN;

  const mod = MODALIDADES.find(m => m.id === selectedMod);
  const isChapa = mod?.tipo === "chapa";
  const is3para3 = mod?.tipo === "3para3";

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const resetForm = () => {
    setStep("select");
    setSelectedMod(null);
    setForm({ nombre: "", telefono: "", email: "", nombre_equipo: "", jugador_1: "", jugador_2: "", jugador_3: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isChapa && (!form.nombre || !form.telefono)) {
      toast.error("Por favor, rellena nombre y teléfono");
      return;
    }
    if (is3para3 && (!form.nombre_equipo || !form.jugador_1 || !form.jugador_2 || !form.jugador_3 || !form.telefono)) {
      toast.error("Por favor, rellena todos los campos obligatorios");
      return;
    }

    setSaving(true);
    const data = {
      modalidad: mod.label,
      nombre_responsable: isChapa ? form.nombre : form.jugador_1,
      telefono_responsable: form.telefono,
    };
    if (form.email) data.email_responsable = form.email;
    if (isChapa) data.jugador_nombre = form.nombre;
    if (is3para3) {
      data.nombre_equipo = form.nombre_equipo;
      data.jugador_1 = form.jugador_1;
      data.jugador_2 = form.jugador_2;
      data.jugador_3 = form.jugador_3;
    }

    await base44.functions.invoke("sanIsidroRegister", data);
    setSaving(false);
    setStep("success");
  };

  // Fuera de fechas
  if (!isOpen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-600 via-yellow-500 to-green-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center space-y-4">
          <img src={CLUB_LOGO} alt="CD Bustarviejo" className="w-20 h-20 rounded-full mx-auto object-cover" />
          <h1 className="text-2xl font-black text-slate-900">San Isidro 2026</h1>
          <div className="flex items-center justify-center gap-2 text-slate-500">
            <Clock className="w-5 h-5" />
            <p>Las inscripciones no están abiertas en este momento.</p>
          </div>
          <p className="text-sm text-slate-400">Periodo de inscripción: 19 abril - 15 mayo 2026</p>
        </div>
      </div>
    );
  }

  // Éxito — cuenta atrás y redirige a la web del club
  if (step === "success") {
    return <SuccessScreen modLabel={mod?.label} onReset={resetForm} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-600 via-yellow-500 to-green-600 py-6 px-4">
      <div className="max-w-md w-full mx-auto space-y-4">

        {/* Cartel festivo con info del evento */}
        <EventInfoBanner />

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-red-700 via-red-600 to-green-700 p-5 text-center relative">
          <img src={CLUB_LOGO} alt="CD Bustarviejo" className="w-14 h-14 rounded-full mx-auto object-cover mb-2 border-2 border-white shadow-lg" />
          <h1 className="text-white text-xl font-black">📝 INSCRIPCIÓN ONLINE</h1>
          <p className="text-white/80 text-xs mt-1">Apúntate a los torneos deportivos</p>
        </div>

        {/* Selección de modalidad */}
        {step === "select" && (
          <div className="p-5 space-y-4">
            <a
              href={WEB_CLUB}
              className="flex items-center gap-2 text-sm text-slate-500 font-semibold hover:text-slate-800 active:scale-95 transition-all bg-slate-100 hover:bg-slate-200 rounded-lg px-3 py-2 w-fit no-underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a la web
            </a>
            <h3 className="text-lg font-bold text-slate-900 text-center">Elige tu torneo</h3>

            <div className="space-y-2">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">🏆 Fútbol Chapa (Individual)</p>
              {MODALIDADES.filter(m => m.tipo === "chapa").map(m => (
                <button
                  key={m.id}
                  onClick={() => { setSelectedMod(m.id); setStep("form"); }}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-orange-200 hover:border-orange-400 hover:bg-orange-50 transition-all text-left active:scale-95"
                >
                  <span className="text-3xl">{m.icon}</span>
                  <div>
                    <p className="font-bold text-slate-800">{m.label}</p>
                    <p className="text-xs text-slate-500">1 jugador por inscripción</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="space-y-2 pt-1">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">⚽ 3 para 3 (Equipos de 3)</p>
              {MODALIDADES.filter(m => m.tipo === "3para3").map(m => (
                <button
                  key={m.id}
                  onClick={() => { setSelectedMod(m.id); setStep("form"); }}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-green-200 hover:border-green-400 hover:bg-green-50 transition-all text-left active:scale-95"
                >
                  <span className="text-3xl">{m.icon}</span>
                  <div>
                    <p className="font-bold text-slate-800">{m.label}</p>
                    <p className="text-xs text-slate-500">Equipo de 3 jugadores</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Voluntariado */}
            <div className="pt-3 border-t border-slate-200">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-2">💖 ¿Quieres ayudar?</p>
              <button
                type="button"
                onClick={() => setVolunteerOpen(true)}
                className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-pink-200 hover:border-pink-400 bg-gradient-to-r from-pink-50 to-red-50 hover:from-pink-100 hover:to-red-100 transition-all text-left active:scale-95"
              >
                <Heart className="w-7 h-7 text-pink-600 flex-shrink-0" />
                <div>
                  <p className="font-bold text-slate-800">Apuntarme como voluntario</p>
                  <p className="text-xs text-slate-500">Échanos una mano en las fiestas</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Formulario */}
        {step === "form" && (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <button
              type="button"
              onClick={() => setStep("select")}
              className="flex items-center gap-2 text-sm text-red-600 font-semibold hover:text-red-800 active:scale-95 transition-all bg-red-50 hover:bg-red-100 rounded-lg px-3 py-2 w-fit"
            >
              <ArrowLeft className="w-4 h-4" />
              Cambiar torneo
            </button>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-2xl">{mod?.icon}</span>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{mod?.label}</h3>
                <p className="text-xs text-slate-500">{isChapa ? "1 jugador por inscripción" : "Equipo de 3 jugadores"}</p>
              </div>
            </div>

            {/* Chapa - solo datos del jugador */}
            {isChapa && (
              <div className="bg-orange-50 rounded-xl p-4 space-y-3 border border-orange-200">
                <p className="text-xs font-semibold text-orange-700 uppercase">Datos del jugador</p>
                <div>
                  <Label className="text-xs text-orange-700">Nombre y apellidos *</Label>
                  <Input value={form.nombre} onChange={e => updateField("nombre", e.target.value)} placeholder="Ej: Pedro García López" />
                </div>
                <div>
                  <Label className="text-xs text-orange-700">Teléfono de contacto *</Label>
                  <Input value={form.telefono} onChange={e => updateField("telefono", e.target.value)} placeholder="Ej: 600 123 456" type="tel" />
                </div>
                <div>
                  <Label className="text-xs text-orange-700">Email (opcional)</Label>
                  <Input value={form.email} onChange={e => updateField("email", e.target.value)} placeholder="email@ejemplo.com" type="email" />
                </div>
              </div>
            )}

            {/* 3 para 3 - equipo + jugadores + contacto */}
            {is3para3 && (
              <div className="bg-green-50 rounded-xl p-4 space-y-3 border border-green-200">
                <div>
                  <Label className="text-xs text-green-700">Nombre del equipo *</Label>
                  <Input value={form.nombre_equipo} onChange={e => updateField("nombre_equipo", e.target.value)} placeholder="Ej: Los Tigres" />
                </div>
                <div>
                  <Label className="text-xs text-green-700">Jugador 1 *</Label>
                  <Input value={form.jugador_1} onChange={e => updateField("jugador_1", e.target.value)} placeholder="Nombre y apellidos" />
                </div>
                <div>
                  <Label className="text-xs text-green-700">Jugador 2 *</Label>
                  <Input value={form.jugador_2} onChange={e => updateField("jugador_2", e.target.value)} placeholder="Nombre y apellidos" />
                </div>
                <div>
                  <Label className="text-xs text-green-700">Jugador 3 *</Label>
                  <Input value={form.jugador_3} onChange={e => updateField("jugador_3", e.target.value)} placeholder="Nombre y apellidos" />
                </div>
                <div>
                  <Label className="text-xs text-green-700">Teléfono de contacto *</Label>
                  <Input value={form.telefono} onChange={e => updateField("telefono", e.target.value)} placeholder="Ej: 600 123 456" type="tel" />
                </div>
                <div>
                  <Label className="text-xs text-green-700">Email (opcional)</Label>
                  <Input value={form.email} onChange={e => updateField("email", e.target.value)} placeholder="email@ejemplo.com" type="email" />
                </div>
              </div>
            )}

            <Button type="submit" disabled={saving} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 text-base">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</> : "✅ Enviar Inscripción"}
            </Button>
          </form>
        )}

        {/* Footer */}
        <div className="bg-slate-50 border-t px-4 py-3 text-center">
          <p className="text-xs text-slate-400">CD Bustarviejo • Fiestas de San Isidro 2026</p>
        </div>
        </div>
      </div>

      <VolunteerModal open={volunteerOpen} onOpenChange={setVolunteerOpen} />
    </div>
  );
}
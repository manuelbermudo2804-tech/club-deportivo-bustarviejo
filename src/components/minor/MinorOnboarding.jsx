import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { base44 } from "@/api/base44Client";
import { Smartphone, Download } from "lucide-react";

const CLUB_LOGO_URL = `https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg`;

export default function MinorOnboarding({ playerName, parentName, onComplete }) {
  const [step, setStep] = useState(0);
  const [normasAceptadas, setNormasAceptadas] = useState(false);
  const [saving, setSaving] = useState(false);
  const firstName = playerName?.split(" ")[0] || "Jugador";

  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);

  const handleAcceptNormas = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({
        tipo_panel: "jugador_menor",
        es_menor: true,
        minor_normas_aceptadas: true,
        minor_normas_fecha: new Date().toISOString(),
      });
      onComplete();
    } catch (e) {
      console.error("Error aceptando normas:", e);
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    // Step 0: Bienvenida
    <motion.div key="welcome" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-center space-y-6">
      <div className="text-8xl">🎉</div>
      <img src={CLUB_LOGO_URL} alt="CD Bustarviejo" className="w-24 h-24 mx-auto rounded-2xl shadow-xl object-cover" />
      <h1 className="text-4xl font-black bg-gradient-to-r from-orange-600 to-green-600 bg-clip-text text-transparent">
        ¡Bienvenido, {firstName}!
      </h1>
      <p className="text-lg text-slate-600">
        Tu {parentName ? `padre/madre (${parentName.split(" ")[0]})` : "padre/madre"} te ha dado acceso a la app del <strong className="text-green-700">CD Bustarviejo</strong>.
      </p>
      <Button onClick={() => setStep(1)} className="bg-gradient-to-r from-orange-600 to-green-600 hover:from-orange-700 hover:to-green-700 text-white font-bold py-6 px-8 text-lg rounded-2xl shadow-xl">
        ¡Mola! Siguiente →
      </Button>
    </motion.div>,

    // Step 1: Qué puedes hacer
    <motion.div key="can-do" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
      <div className="text-center">
        <div className="text-6xl mb-2">⚽</div>
        <h2 className="text-3xl font-black text-slate-900">Esto puedes hacer</h2>
      </div>
      <div className="grid gap-3">
        {[
          { emoji: "📋", text: "Ver y confirmar convocatorias de partidos", color: "from-green-400 to-emerald-500" },
          { emoji: "📅", text: "Ver horarios de entrenamiento", color: "from-blue-400 to-cyan-500" },
          { emoji: "📊", text: "Ver tus evaluaciones del entrenador", color: "from-purple-400 to-violet-500" },
          { emoji: "🏆", text: "Clasificaciones y resultados", color: "from-yellow-400 to-orange-500" },
          { emoji: "📢", text: "Anuncios del club", color: "from-pink-400 to-rose-500" },
          { emoji: "🖼️", text: "Galería de fotos", color: "from-teal-400 to-cyan-500" },
          { emoji: "🎉", text: "Confirmar asistencia a eventos", color: "from-indigo-400 to-blue-500" },
          { emoji: "📋", text: "Responder encuestas", color: "from-orange-400 to-red-500" },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`flex items-center gap-3 bg-gradient-to-r ${item.color} text-white rounded-xl p-3 shadow-md`}
          >
            <span className="text-2xl">{item.emoji}</span>
            <span className="font-semibold text-sm">{item.text}</span>
          </motion.div>
        ))}
      </div>
      <Button onClick={() => setStep(2)} className="w-full bg-gradient-to-r from-orange-600 to-green-600 hover:from-orange-700 hover:to-green-700 text-white font-bold py-6 text-lg rounded-2xl shadow-xl">
        Siguiente →
      </Button>
    </motion.div>,

    // Step 2: Qué NO puedes hacer
    <motion.div key="cannot-do" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
      <div className="text-center">
        <div className="text-6xl mb-2">🚫</div>
        <h2 className="text-3xl font-black text-slate-900">Esto lo gestiona tu padre/madre</h2>
      </div>
      <div className="grid gap-3">
        {[
          { emoji: "💳", text: "Pagos y cuotas del club" },
          { emoji: "🖊️", text: "Firmas de federación" },
          { emoji: "💬", text: "Chats con entrenadores" },
          { emoji: "✏️", text: "Editar datos personales" },
          { emoji: "📄", text: "Documentos oficiales" },
          { emoji: "🛍️", text: "Tienda y pedidos" },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3 bg-slate-100 border border-slate-200 rounded-xl p-3"
          >
            <span className="text-2xl opacity-40">{item.emoji}</span>
            <span className="font-semibold text-sm text-slate-500 line-through">{item.text}</span>
          </motion.div>
        ))}
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
        <p className="text-sm text-blue-800">Si necesitas algo de esta lista, díselo a tu padre/madre 😊</p>
      </div>
      <Button onClick={() => setStep(3)} className="w-full bg-gradient-to-r from-orange-600 to-green-600 hover:from-orange-700 hover:to-green-700 text-white font-bold py-6 text-lg rounded-2xl shadow-xl">
        Siguiente →
      </Button>
    </motion.div>,

    // Step 3: Normas de uso
    <motion.div key="normas" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
      <div className="text-center">
        <div className="text-6xl mb-2">📋</div>
        <h2 className="text-3xl font-black text-slate-900">Normas de uso</h2>
      </div>
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 rounded-2xl p-5 space-y-4">
        {[
          "Esta app es para uso exclusivo del club deportivo",
          "Tu padre/madre puede ver lo mismo que tú",
          "Tu padre/madre puede desactivar tu acceso en cualquier momento",
          "Usa la app con responsabilidad",
          "Si tienes algún problema, habla con tu padre/madre o tu entrenador",
        ].map((norma, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="bg-orange-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">{i + 1}</span>
            <p className="text-sm text-slate-700">{norma}</p>
          </div>
        ))}
      </div>
      <div className="bg-white border-2 border-green-300 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <Checkbox id="normas" checked={normasAceptadas} onCheckedChange={setNormasAceptadas} className="mt-0.5" />
          <label htmlFor="normas" className="text-sm text-slate-700 cursor-pointer font-medium">
            He leído y entendido las normas de uso
          </label>
        </div>
      </div>
      <Button
        onClick={handleAcceptNormas}
        disabled={!normasAceptadas || saving}
        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-6 text-lg rounded-2xl shadow-xl disabled:opacity-50"
      >
        {saving ? "Entrando..." : "🚀 ¡Entrar a la app!"}
      </Button>
    </motion.div>,
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? "w-8 bg-orange-600" : i < step ? "w-2 bg-green-500" : "w-2 bg-slate-200"
              }`}
            />
          ))}
        </div>
        <AnimatePresence mode="wait">
          {steps[step]}
        </AnimatePresence>
      </div>
    </div>
  );
}
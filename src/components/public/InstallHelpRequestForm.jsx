import React, { useState } from "react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Phone, Loader2, CheckCircle2, Send, X } from "lucide-react";

/**
 * Mini-formulario para pedir ayuda con la instalación de la app.
 * Crea una entrada en AssistedRegistration con tipo='instalacion'.
 * Pensado para usarse en pantallas públicas (sin autenticación).
 */
export default function InstallHelpRequestForm({ defaultEmail = "", defaultNombre = "", defaultTelefono = "", onClose }) {
  const [nombre, setNombre] = useState(defaultNombre);
  const [telefono, setTelefono] = useState(defaultTelefono);
  const [horario, setHorario] = useState("Cualquier hora");
  const [notas, setNotas] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!nombre.trim() || !telefono.trim()) {
      setError("Por favor rellena tu nombre y teléfono.");
      return;
    }
    setSending(true);
    try {
      await base44.entities.AssistedRegistration.create({
        tipo: "instalacion",
        nombre_contacto: nombre.trim(),
        telefono: telefono.trim(),
        horario_contacto: horario,
        notas_horario: notas.trim(),
        email_usuario: defaultEmail || undefined,
        dispositivo: navigator.userAgent,
        estado: "pendiente",
      });
      setSent(true);
    } catch (err) {
      console.error(err);
      setError("No se pudo enviar la solicitud. Vuelve a intentarlo en un momento.");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-green-50 border-2 border-green-300 rounded-2xl p-5 text-center"
      >
        <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 className="w-8 h-8 text-white" />
        </div>
        <p className="font-bold text-green-900 mb-1">¡Solicitud enviada!</p>
        <p className="text-sm text-green-800">
          Te llamaremos al <strong>{telefono}</strong> lo antes posible para ayudarte a instalar la app.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-4 space-y-3 relative"
    >
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 text-slate-400 hover:text-slate-700"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      <div className="flex items-center gap-2 pr-6">
        <Phone className="w-4 h-4 text-blue-600 flex-shrink-0" />
        <p className="text-sm font-bold text-blue-900">Te llamamos y te ayudamos a instalarla</p>
      </div>
      <p className="text-xs text-blue-800">
        Déjanos tu teléfono y un horario, y un voluntario del club te llamará para guiarte paso a paso.
      </p>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">Tu nombre *</label>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: María García"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          required
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">Tu teléfono *</label>
        <input
          type="tel"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="Ej: 600 123 456"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          required
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">¿Cuándo te viene mejor?</label>
        <select
          value={horario}
          onChange={(e) => setHorario(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option>Cualquier hora</option>
          <option>Mañanas (9:00-14:00)</option>
          <option>Tardes (15:00-20:00)</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">
          Comentario <span className="text-slate-400 font-normal">(opcional)</span>
        </label>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Ej: Tengo un iPhone antiguo, no encuentro Safari..."
          rows={2}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700">{error}</div>
      )}

      <button
        type="submit"
        disabled={sending}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm disabled:opacity-60"
      >
        {sending ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
        ) : (
          <><Send className="w-4 h-4" /> Pedir que me llamen</>
        )}
      </button>
    </motion.form>
  );
}
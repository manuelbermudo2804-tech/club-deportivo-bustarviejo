import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, Heart, Loader2, CheckCircle2, HelpCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function HelpRequestBanner({ failedAttempts = 0, playerName = "", userEmail = "" }) {
  const [expanded, setExpanded] = useState(false);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (failedAttempts < 2 || sent) {
    if (sent) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 p-6 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
          >
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-3" />
          </motion.div>
          <h3 className="text-xl font-bold text-green-900 mb-2">¡Recibido! 😊</h3>
          <p className="text-green-800 text-sm leading-relaxed">
            No te preocupes, <strong>nuestro equipo te contactará en 24-48 horas</strong> para ayudarte con todo el proceso de inscripción.
          </p>
          <p className="text-green-700 text-xs mt-3">
            Te llamaremos o escribiremos por WhatsApp. ¡Estamos para ayudarte!
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <span className="text-3xl">📞</span>
            <span className="text-3xl">💬</span>
            <span className="text-3xl">⚽</span>
          </div>
        </motion.div>
      );
    }
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim() || !telefono.trim()) {
      toast.error("Por favor, rellena tu nombre y teléfono");
      return;
    }
    setSending(true);
    try {
      await base44.entities.AssistedRegistration.create({
        nombre_contacto: nombre.trim(),
        telefono: telefono.trim(),
        email_usuario: userEmail || "",
        nombre_jugador: playerName || "",
        estado: "pendiente",
        intentos_subida: failedAttempts,
        dispositivo: navigator.userAgent?.substring(0, 200) || "unknown"
      });
      setSent(true);
    } catch (err) {
      toast.error("Error al enviar. Inténtalo de nuevo.");
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden border-2 border-orange-300 bg-gradient-to-br from-orange-50 to-amber-50"
    >
      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="w-full p-4 flex items-center gap-3 text-left hover:bg-orange-100/50 transition-colors"
        >
          <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
            <HelpCircle className="w-6 h-6 text-orange-600" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-orange-900 text-sm">¿Tienes problemas? ¡Te ayudamos!</p>
            <p className="text-xs text-orange-700">Déjanos tu teléfono y te llamamos nosotros</p>
          </div>
          <Phone className="w-5 h-5 text-orange-500 flex-shrink-0" />
        </button>
      ) : (
        <div className="p-5">
          <div className="text-center mb-4">
            <div className="text-4xl mb-2">🤗</div>
            <h3 className="text-lg font-bold text-orange-900">¡No te preocupes!</h3>
            <p className="text-sm text-orange-800 mt-1">
              Déjanos tu teléfono y <strong>te contactamos en 24-48 horas</strong> para ayudarte con la inscripción
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label className="text-sm font-medium text-orange-900">Tu nombre *</Label>
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: María García"
                className="rounded-xl h-12 text-base border-orange-200 bg-white"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-orange-900">Tu teléfono *</Label>
              <Input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej: 612 345 678"
                className="rounded-xl h-12 text-base border-orange-200 bg-white"
              />
            </div>
            <Button
              type="submit"
              disabled={sending || !nombre.trim() || !telefono.trim()}
              className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold rounded-xl h-12 text-base"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Phone className="w-5 h-5 mr-2" />
              )}
              {sending ? "Enviando..." : "Te llamamos nosotros"}
            </Button>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="w-full text-xs text-orange-600 hover:text-orange-800 py-1"
            >
              Prefiero seguir intentándolo yo
            </button>
          </form>
        </div>
      )}
    </motion.div>
  );
}
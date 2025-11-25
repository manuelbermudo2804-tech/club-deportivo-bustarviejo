import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, CheckCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";

const CLUB_LOGO_URL = `https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg?t=${Date.now()}`;

const ONBOARDING_STEPS = [
  {
    id: 1,
    title: "¡Bienvenido a CD Bustarviejo! 🎉",
    description: "Estamos encantados de tenerte en nuestra familia deportiva. Esta guía rápida te ayudará a familiarizarte con la aplicación en solo 5 pasos.",
    icon: "🏆",
  },
  {
    id: 2,
    title: "Registra a tus jugadores ⚽",
    description: "Lo primero es registrar a tu hijo/a en el sistema. Ve a 'Mis Jugadores' y pulsa 'Nuevo Jugador' para completar sus datos.",
    icon: "👨‍👩‍👧",
  },
  {
    id: 3,
    title: "Gestiona los pagos 💳",
    description: "En la sección 'Pagos' podrás registrar los pagos de cuotas y subir los justificantes. El club los revisará y confirmará.",
    icon: "💰",
  },
  {
    id: 4,
    title: "Confirma convocatorias 🏆",
    description: "Cuando tu hijo/a sea convocado para un partido, recibirás una notificación. Confirma su asistencia en 'Convocatorias'.",
    icon: "📋",
  },
  {
    id: 5,
    title: "Mantente conectado 💬",
    description: "Usa el 'Chat Equipo' para comunicarte con los entrenadores y otros padres. También recibirás anuncios importantes del club.",
    icon: "📱",
  },
  {
    id: 6,
    title: "¡Todo listo! 🎊",
    description: "Ya conoces lo básico. Explora el calendario, la galería de fotos, los documentos y todas las funcionalidades. ¡Bienvenido al equipo!",
    icon: "✅",
  },
];

export default function ParentOnboarding({ open, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = async () => {
    setIsCompleting(true);
    try {
      await base44.auth.updateMe({ onboarding_completado: true });
      onComplete();
    } catch (error) {
      console.error("Error skipping onboarding:", error);
      setIsCompleting(false);
    }
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      await base44.auth.updateMe({ onboarding_completado: true });
      onComplete();
    } catch (error) {
      console.error("Error completing onboarding:", error);
      setIsCompleting(false);
    }
  };

  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;
  const step = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={handleSkip}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border-none">
        <div className="relative bg-gradient-to-br from-orange-50 to-green-50">
          <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-6 text-white relative">
            <button
              onClick={handleSkip}
              disabled={isCompleting}
              className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors disabled:opacity-50"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="flex items-center gap-4 mb-4">
              <img src={CLUB_LOGO_URL} alt="CD Bustarviejo" className="w-16 h-16 rounded-xl shadow-lg object-cover" />
              <div>
                <h2 className="text-2xl font-bold">Tutorial de Bienvenida</h2>
                <p className="text-orange-100 text-sm">CD Bustarviejo</p>
              </div>
            </div>

            <div className="relative w-full h-2 bg-orange-900/30 rounded-full overflow-hidden">
              <motion.div
                className="absolute top-0 left-0 h-full bg-white rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-xs text-orange-100 mt-2">
              Paso {currentStep + 1} de {ONBOARDING_STEPS.length}
            </p>
          </div>

          <div className="p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <div className="text-6xl mb-4">{step.icon}</div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">
                    {step.title}
                  </h3>
                  <p className="text-slate-600 text-lg leading-relaxed max-w-xl mx-auto">
                    {step.description}
                  </p>
                </div>

                {currentStep === 0 && (
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
                    <p className="text-sm text-blue-900 font-semibold mb-2">💡 Consejos rápidos:</p>
                    <ul className="space-y-2 text-sm text-blue-800">
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 mt-0.5">✓</span>
                        <span>Puedes saltar este tutorial en cualquier momento</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 mt-0.5">✓</span>
                        <span>Solo tardarás 1 minuto en completarlo</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 mt-0.5">✓</span>
                        <span>Te ayudará a usar la app como un experto</span>
                      </li>
                    </ul>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="bg-white border-t p-6 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={handleSkip}
              disabled={isCompleting}
              className="text-slate-600 hover:text-slate-900"
            >
              Omitir tutorial
            </Button>

            <Button
              onClick={handleNext}
              disabled={isCompleting}
              className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white px-8"
            >
              {isCompleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Guardando...
                </>
              ) : isLastStep ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Empezar a usar la app
                </>
              ) : (
                <>
                  Siguiente
                  <ChevronRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
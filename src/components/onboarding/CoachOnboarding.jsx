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
    title: "¡Bienvenido Entrenador! 🎓",
    description: "Tienes acceso a las herramientas para gestionar tu equipo de forma profesional. Te enseñamos lo básico.",
    icon: "⚽",
    highlight: null,
  },
  {
    id: 2,
    title: "Tu Plantilla 👥",
    description: "Accede a la información completa de tus jugadores: datos personales, contactos de los padres y ficha médica.",
    icon: "📋",
    highlight: "roster",
    action: "Ver Plantilla",
  },
  {
    id: 3,
    title: "Control de Asistencia ✅",
    description: "Pasa lista en cada entrenamiento de forma rápida. El sistema guarda un registro automático de asistencias.",
    icon: "📝",
    highlight: "attendance",
    action: "Pasar Lista",
  },
  {
    id: 4,
    title: "Evaluaciones de Jugadores ⭐",
    description: "Evalúa el progreso de cada jugador en aspectos técnicos, tácticos, físicos y actitudinales.",
    icon: "📊",
    highlight: "evaluations",
    action: "Crear Evaluación",
  },
  {
    id: 5,
    title: "Convocatorias de Partidos 🏆",
    description: "Crea convocatorias para partidos y recibe las confirmaciones de asistencia de las familias automáticamente.",
    icon: "📣",
    highlight: "callups",
    action: "Crear Convocatoria",
  },
  {
    id: 6,
    title: "Chat con Familias 💬",
    description: "Comunícate directamente con los padres de tu equipo para cualquier tema relacionado con los entrenamientos.",
    icon: "📱",
    highlight: "chat",
    action: "Ir al Chat",
  },
  {
    id: 7,
    title: "¡Todo listo! 🎊",
    description: "Ya conoces las herramientas principales. ¡Mucha suerte con tu equipo esta temporada!",
    icon: "✅",
    highlight: null,
  },
];

export default function CoachOnboarding({ open, onComplete }) {
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
        <div className="relative bg-gradient-to-br from-green-50 to-slate-50">
          <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 text-white relative">
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
                <h2 className="text-2xl font-bold">Panel de Entrenador</h2>
                <p className="text-green-100 text-sm">CD Bustarviejo</p>
              </div>
            </div>

            <div className="relative w-full h-2 bg-green-900/30 rounded-full overflow-hidden">
              <motion.div
                className="absolute top-0 left-0 h-full bg-white rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-xs text-green-100 mt-2">
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

                {step.highlight && (
                  <div className="bg-white rounded-2xl p-6 border-2 border-green-200 shadow-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">Acción recomendada</p>
                        <p className="text-sm text-slate-600">
                          {step.action || "Explorar esta función"}
                        </p>
                      </div>
                    </div>
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
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-8"
            >
              {isCompleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Guardando...
                </>
              ) : isLastStep ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  ¡Empezar!
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
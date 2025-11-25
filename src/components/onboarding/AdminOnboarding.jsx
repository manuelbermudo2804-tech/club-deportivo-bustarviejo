import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Users, CreditCard, Bell, MessageCircle, Calendar, Settings, ChevronRight, ChevronLeft, CheckCircle2 } from "lucide-react";

const steps = [
  {
    title: "¡Bienvenido Admin!",
    description: "Como administrador tienes acceso completo a todas las funciones del club. Te mostraremos las principales.",
    icon: CheckCircle2,
    color: "from-orange-500 to-orange-600"
  },
  {
    title: "Gestión de Jugadores",
    description: "Administra todos los jugadores del club: inscripciones, renovaciones, datos personales y fichas médicas.",
    icon: Users,
    color: "from-blue-500 to-blue-600"
  },
  {
    title: "Control de Pagos",
    description: "Gestiona las cuotas, verifica justificantes y realiza la reconciliación bancaria de todos los pagos.",
    icon: CreditCard,
    color: "from-green-500 to-green-600"
  },
  {
    title: "Comunicaciones",
    description: "Envía anuncios, gestiona el chat con las familias y crea convocatorias para los equipos.",
    icon: MessageCircle,
    color: "from-purple-500 to-purple-600"
  },
  {
    title: "Configuración",
    description: "Configura temporadas, categorías, cuotas y gestiona usuarios del sistema.",
    icon: Settings,
    color: "from-slate-500 to-slate-600"
  }
];

export default function AdminOnboarding({ open, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      await base44.auth.updateMe({ onboarding_completado: true });
    } catch (error) {
      console.error("Error updating onboarding status:", error);
    }
    onComplete();
  };

  const handleSkip = async () => {
    await handleComplete();
  };

  const step = steps[currentStep];
  const Icon = step.icon;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mx-auto mb-4 shadow-lg`}>
            <Icon className="w-8 h-8 text-white" />
          </div>
          <DialogTitle className="text-center text-xl">{step.title}</DialogTitle>
          <DialogDescription className="text-center text-base">
            {step.description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center gap-2 my-4">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentStep ? "bg-orange-500 w-6" : "bg-slate-300"
              }`}
            />
          ))}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex gap-2 w-full">
            {currentStep > 0 && (
              <Button variant="outline" onClick={handlePrevious} className="flex-1">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Anterior
              </Button>
            )}
            <Button onClick={handleNext} className="flex-1 bg-orange-600 hover:bg-orange-700">
              {currentStep < steps.length - 1 ? (
                <>
                  Siguiente
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              ) : (
                "¡Empezar!"
              )}
            </Button>
          </div>
          {currentStep === 0 && (
            <Button variant="ghost" onClick={handleSkip} className="text-slate-500">
              Saltar tutorial
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
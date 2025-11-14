import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, CheckCircle2 } from "lucide-react";

const ONBOARDING_STEPS = {
  admin: [
    {
      title: "¡Bienvenido Administrador! 🎉",
      description: "Tienes acceso completo a todas las funciones del club",
      icon: "👨‍💼",
      features: [
        "Gestión de jugadores y equipos",
        "Control de pagos y cobros",
        "Calendario y convocatorias",
        "Chat con todas las categorías"
      ]
    },
    {
      title: "Panel de Administración 📊",
      description: "Desde aquí puedes gestionar todo el club",
      icon: "🎯",
      features: [
        "Horarios de entrenamiento",
        "Recordatorios automáticos",
        "Galería de fotos",
        "Configuración de temporadas"
      ]
    }
  ],
  coach: [
    {
      title: "¡Bienvenido Entrenador! 🎓",
      description: "Gestiona tus equipos de forma eficiente",
      icon: "⚽",
      features: [
        "Plantillas de tus equipos",
        "Control de asistencia",
        "Crear convocatorias",
        "Evaluaciones de jugadores"
      ]
    },
    {
      title: "Comunicación 💬",
      description: "Mantén contacto con padres y jugadores",
      icon: "📱",
      features: [
        "Chat de equipo",
        "Anuncios importantes",
        "Galería de fotos",
        "Calendario de partidos"
      ]
    }
  ],
  parent: [
    {
      title: "¡Bienvenido Familia! 👨‍👩‍👧",
      description: "Sigue el progreso de tus hijos en el club",
      icon: "❤️",
      features: [
        "Ver jugadores registrados",
        "Confirmar convocatorias",
        "Realizar pagos",
        "Ver horarios y calendario"
      ]
    },
    {
      title: "Mantente Informado 📢",
      description: "Recibe todas las novedades del club",
      icon: "🔔",
      features: [
        "Anuncios importantes",
        "Chat con entrenadores",
        "Galería de fotos",
        "Pedidos de equipación"
      ]
    }
  ]
};

export default function Onboarding({ userRole }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem(`onboarding_seen_${userRole}`);
    if (!hasSeenOnboarding) {
      setIsOpen(true);
    }
  }, [userRole]);

  const steps = ONBOARDING_STEPS[userRole] || ONBOARDING_STEPS.parent;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    localStorage.setItem(`onboarding_seen_${userRole}`, "true");
    setIsOpen(false);
  };

  const currentStepData = steps[currentStep];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="text-6xl text-center mb-4">{currentStepData.icon}</div>
          <DialogTitle className="text-2xl text-center">{currentStepData.title}</DialogTitle>
          <DialogDescription className="text-center text-base">
            {currentStepData.description}
          </DialogDescription>
        </DialogHeader>
        <Card className="border-2 border-orange-200 bg-orange-50">
          <CardContent className="p-4 space-y-2">
            {currentStepData.features.map((feature, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-slate-700">{feature}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 w-2 rounded-full transition-all ${
                  idx === currentStep ? "bg-orange-600 w-6" : "bg-slate-300"
                }`}
              />
            ))}
          </div>
          <Button onClick={handleNext} className="bg-orange-600 hover:bg-orange-700">
            {currentStep < steps.length - 1 ? (
              <>
                Siguiente <ChevronRight className="w-4 h-4 ml-1" />
              </>
            ) : (
              "¡Empezar!"
            )}
          </Button>
        </div>
        <button
          onClick={handleComplete}
          className="text-xs text-slate-500 hover:text-slate-700 text-center w-full"
        >
          Saltar introducción
        </button>
      </DialogContent>
    </Dialog>
  );
}
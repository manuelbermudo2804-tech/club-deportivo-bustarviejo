import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import OnboardingStep from "./OnboardingStep";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2 } from "lucide-react";

export default function PlayerOnboardingFlow({ user, onComplete }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    categoria_principal: "",
    posicion: "Sin asignar",
  });
  const [error, setError] = useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => base44.entities.CategoryConfig.list(),
    staleTime: 1000 * 60 * 5, // 5 min cache
    gcTime: 1000 * 60 * 10, // 10 min garbage collection
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.auth.updateMe({
        categoria_principal: data.categoria_principal,
        posicion: data.posicion,
        onboarding_player_completed: true,
      });
    },
    onSuccess: () => {
      onComplete();
    },
    onError: (error) => {
      setError(error.message || "Error al actualizar el perfil");
    },
  });

  const handleStep1Next = () => {
    setCurrentStep(2);
  };

  const handleStep2Next = () => {
    if (!formData.categoria_principal) {
      setError("Categoría es obligatoria");
      return;
    }
    setError("");
    setCurrentStep(3);
  };

  const handleStep3Next = () => {
    setCurrentStep(4);
  };

  const handleStep4Next = () => {
    setCurrentStep(5);
  };

  const handleFinalStep = () => {
    updateProfileMutation.mutate(formData);
  };

  return (
    <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      {currentStep === 1 && (
        <OnboardingStep
          step={1}
          totalSteps={5}
          icon="⚽"
          title="¡Bienvenido Jugador!"
          description="Vamos a completar tu perfil como jugador del club CD Bustarviejo."
          onNext={handleStep1Next}
          nextLabel="Empezar"
        >
          <div className="bg-gradient-to-br from-orange-50 to-green-50 rounded-xl p-4 space-y-2 border border-orange-200">
            <p className="font-semibold text-slate-900 text-sm">En este proceso vas a:</p>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex gap-2">
                <span className="text-lg">🏆</span>
                <span>Seleccionar tu categoría</span>
              </li>
              <li className="flex gap-2">
                <span className="text-lg">🎯</span>
                <span>Indicar tu posición en el campo</span>
              </li>
              <li className="flex gap-2">
                <span className="text-lg">📱</span>
                <span>Acceder a convocatorias y chats</span>
              </li>
            </ul>
          </div>
        </OnboardingStep>
      )}

      {currentStep === 2 && (
        <OnboardingStep
          step={2}
          totalSteps={5}
          icon="⚽"
          title="Tu Categoría"
          description="Selecciona la categoría en la que jugarás"
          onNext={handleStep2Next}
          canProceed={formData.categoria_principal !== ""}
        >
          <div className="space-y-4">
            <Select value={formData.categoria_principal} onValueChange={(value) => setFormData({ ...formData, categoria_principal: value })}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Selecciona tu categoría" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.nombre}>
                    {cat.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
              <strong>📌 Nota:</strong> El coordinador podrá ajustar tu categoría si es necesario.
            </div>
          </div>
        </OnboardingStep>
      )}

      {currentStep === 3 && (
        <OnboardingStep
          step={3}
          totalSteps={5}
          icon="🎯"
          title="Tu Posición"
          description="¿Cuál es tu posición habitual en el campo?"
          onNext={handleStep3Next}
        >
          <div className="space-y-4">
            <Select value={formData.posicion} onValueChange={(value) => setFormData({ ...formData, posicion: value })}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Selecciona tu posición" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Portero">🥅 Portero</SelectItem>
                <SelectItem value="Defensa">🛡️ Defensa</SelectItem>
                <SelectItem value="Medio">⚙️ Medio</SelectItem>
                <SelectItem value="Delantero">⚡ Delantero</SelectItem>
                <SelectItem value="Sin asignar">❓ No tengo clara</SelectItem>
              </SelectContent>
            </Select>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800">
              <strong>💡 Consejo:</strong> Si no tienes claro, selecciona "No tengo clara" y el entrenador te asesorará.
            </div>
          </div>
        </OnboardingStep>
      )}

      {currentStep === 4 && (
        <OnboardingStep
          step={4}
          totalSteps={5}
          icon="📋"
          title="Próximos Pasos"
          description="Aquí está lo que viene después"
          onNext={handleStep4Next}
        >
          <div className="space-y-3 text-left text-sm">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-2">
              <p className="font-semibold text-orange-900">Tienes que saber:</p>
              <ul className="space-y-1 text-orange-800 text-xs">
                <li>✅ Los entrenadores te verán en las convocatorias</li>
                <li>✅ Recibirás notificaciones de partidos y entrenamientos</li>
                <li>✅ Podrás confirmarte en los partidos</li>
              </ul>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <p className="font-semibold text-blue-900">Comunicación:</p>
              <ul className="space-y-1 text-blue-800 text-xs">
                <li>💬 Chat directo con coordinador y entrenadores</li>
                <li>📱 Notificaciones en tiempo real</li>
                <li>🎉 Acceso a toda la información del club</li>
              </ul>
            </div>
          </div>
        </OnboardingStep>
      )}

      {currentStep === 5 && (
        <OnboardingStep
          step={5}
          totalSteps={5}
          icon="🎉"
          title="¡Perfil Completado!"
          description="Ya estás listo para jugar en CD Bustarviejo"
          onNext={handleFinalStep}
          nextLabel="Ir al Dashboard"
          isLoading={updateProfileMutation.isPending}
        >
          <div className="space-y-3">
            <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 space-y-2">
              <p className="font-bold text-green-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Tu perfil:
              </p>
              <ul className="text-sm text-green-800 space-y-1 ml-7">
                <li>⚽ Categoría: <strong>{formData.categoria_principal}</strong></li>
                <li>🎯 Posición: <strong>{formData.posicion === "Sin asignar" ? "Por definir" : formData.posicion}</strong></li>
              </ul>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800">
              <strong>🏟️ Bienvenido:</strong> Ya puedes acceder a convocatorias, chats y toda la información del club.
            </div>
          </div>
        </OnboardingStep>
      )}
    </div>
  );
}
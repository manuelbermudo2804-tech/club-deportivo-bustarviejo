import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import OnboardingStep from "./OnboardingStep";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2 } from "lucide-react";

export default function ParentOnboardingFlow({ user, onComplete }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    nombre: "",
    fecha_nacimiento: "",
    categoria_principal: "",
  });
  const [error, setError] = useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => base44.entities.CategoryConfig.list(),
  });

  const createPlayerMutation = useMutation({
    mutationFn: async (data) => {
      const playerData = {
        nombre: data.nombre,
        fecha_nacimiento: data.fecha_nacimiento,
        categoria_principal: data.categoria_principal,
        categorias: [data.categoria_principal],
        email_padre: user.email,
        tipo_inscripcion: "Nueva Inscripción",
        acepta_politica_privacidad: true,
        autorizacion_fotografia: "SI AUTORIZO",
        foto_url: "https://via.placeholder.com/150?text=sin+foto",
      };
      return await base44.entities.Player.create(playerData);
    },
    onSuccess: async () => {
      await base44.auth.updateMe({ onboarding_parents_completed: true });
      onComplete();
    },
    onError: (error) => {
      setError(error.message || "Error al crear el perfil");
    },
  });

  const handleStep1Next = () => {
    if (!user.full_name) {
      setError("Nombre no disponible");
      return;
    }
    setCurrentStep(2);
  };

  const handleStep2Next = () => {
    if (!formData.nombre.trim()) {
      setError("Nombre del hijo/a es obligatorio");
      return;
    }
    if (!formData.fecha_nacimiento) {
      setError("Fecha de nacimiento es obligatoria");
      return;
    }
    setError("");
    setCurrentStep(3);
  };

  const handleStep3Next = () => {
    if (!formData.categoria_principal) {
      setError("Categoría es obligatoria");
      return;
    }
    setError("");
    setCurrentStep(4);
  };

  const handleStep4Next = () => {
    setCurrentStep(5);
  };

  const handleFinalStep = () => {
    createPlayerMutation.mutate(formData);
  };

  return (
    <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      {currentStep === 1 && (
        <OnboardingStep
          step={1}
          totalSteps={5}
          icon="👋"
          title="Bienvenido a CD Bustarviejo"
          description="Vamos a crear el perfil de tu hijo/a para que pueda jugar en el club. Solo te llevaremos 5 minutos."
          onNext={handleStep1Next}
          nextLabel="Empezar"
        >
          <div className="bg-gradient-to-br from-orange-50 to-green-50 rounded-xl p-4 space-y-2 border border-orange-200">
            <p className="font-semibold text-slate-900 text-sm">En este proceso vas a:</p>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex gap-2">
                <span className="text-lg">✅</span>
                <span>Crear el perfil de tu hijo/a</span>
              </li>
              <li className="flex gap-2">
                <span className="text-lg">💳</span>
                <span>Ver cómo pagar la cuota</span>
              </li>
              <li className="flex gap-2">
                <span className="text-lg">📋</span>
                <span>Acceder a convocatorias y documentos</span>
              </li>
            </ul>
          </div>
        </OnboardingStep>
      )}

      {currentStep === 2 && (
        <OnboardingStep
          step={2}
          totalSteps={5}
          icon="👶"
          title="Datos de tu hijo/a"
          description="Ingresa los datos básicos de tu hijo/a"
          onNext={handleStep2Next}
          canProceed={formData.nombre.trim() !== "" && formData.fecha_nacimiento !== ""}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Nombre completo
              </label>
              <Input
                placeholder="Ej: Juan García López"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="h-11"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Fecha de nacimiento
              </label>
              <Input
                type="date"
                value={formData.fecha_nacimiento}
                onChange={(e) => setFormData({ ...formData, fecha_nacimiento: e.target.value })}
                className="h-11"
              />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
          </div>
        </OnboardingStep>
      )}

      {currentStep === 3 && (
        <OnboardingStep
          step={3}
          totalSteps={5}
          icon="⚽"
          title="Categoría"
          description="Selecciona la categoría en la que jugará tu hijo/a"
          onNext={handleStep3Next}
          canProceed={formData.categoria_principal !== ""}
        >
          <div className="space-y-4">
            <Select value={formData.categoria_principal} onValueChange={(value) => setFormData({ ...formData, categoria_principal: value })}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Selecciona una categoría" />
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
              <strong>Nota:</strong> Puedes cambiar la categoría después si es necesario.
            </div>
          </div>
        </OnboardingStep>
      )}

      {currentStep === 4 && (
        <OnboardingStep
          step={4}
          totalSteps={5}
          icon="💳"
          title="Cómo pagar la cuota"
          description="Información sobre pagos y cuotas"
          onNext={handleStep4Next}
        >
          <div className="space-y-3 text-left text-sm">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-2">
              <p className="font-semibold text-orange-900">Opciones de pago:</p>
              <ul className="space-y-1 text-orange-800 text-xs">
                <li>💳 <strong>Pago único:</strong> Paga toda la temporada de una vez</li>
                <li>📅 <strong>En 3 cuotas:</strong> Junio, Septiembre y Diciembre</li>
                <li>📱 <strong>Métodos:</strong> Transferencia bancaria o Bizum</li>
              </ul>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
              <p className="font-semibold text-green-900">Próximos pasos:</p>
              <ul className="space-y-1 text-green-800 text-xs">
                <li>✅ Irás a tu dashboard</li>
                <li>✅ Verás el botón "Hacer pago"</li>
                <li>✅ Sigues las instrucciones paso a paso</li>
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
          title="¡Listo para empezar!"
          description="Tu hijo/a está a punto de ser registrado en el club"
          onNext={handleFinalStep}
          nextLabel="Crear perfil"
          isLoading={createPlayerMutation.isPending}
        >
          <div className="space-y-3">
            <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 space-y-2">
              <p className="font-bold text-green-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Resumen:
              </p>
              <ul className="text-sm text-green-800 space-y-1 ml-7">
                <li>👶 <strong>{formData.nombre}</strong></li>
                <li>📅 Nacido el <strong>{new Date(formData.fecha_nacimiento).toLocaleDateString("es-ES")}</strong></li>
                <li>⚽ Categoría: <strong>{formData.categoria_principal}</strong></li>
              </ul>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
              <strong>Después:</strong> Accederás a tu dashboard donde podrás ver convocatorias, pagos, documentos y mucho más.
            </div>
          </div>
        </OnboardingStep>
      )}
    </div>
  );
}
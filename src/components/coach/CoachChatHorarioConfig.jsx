import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, Save, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function CoachChatHorarioConfig({ user }) {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState({
    horario_laboral_activo: false,
    horario_inicio: "09:00",
    horario_fin: "20:00",
    dias_laborales: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"],
    mensaje_fuera_horario: "Estoy fuera de mi horario de atención. Te responderé lo antes posible."
  });

  const { data: coachSettings, isLoading } = useQuery({
    queryKey: ['coachSettings', user?.email],
    queryFn: async () => {
      const allSettings = await base44.entities.CoachSettings.list();
      return allSettings.find(s => s.entrenador_email === user?.email);
    },
    enabled: !!user?.email
  });

  useEffect(() => {
    if (coachSettings) {
      setSettings({
        horario_laboral_activo: coachSettings.horario_laboral_activo || false,
        horario_inicio: coachSettings.horario_inicio || "09:00",
        horario_fin: coachSettings.horario_fin || "20:00",
        dias_laborales: coachSettings.dias_laborales || ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"],
        mensaje_fuera_horario: coachSettings.mensaje_fuera_horario || "Estoy fuera de mi horario de atención. Te responderé lo antes posible."
      });
    }
  }, [coachSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (coachSettings) {
        await base44.entities.CoachSettings.update(coachSettings.id, settings);
      } else {
        await base44.entities.CoachSettings.create({
          entrenador_email: user.email,
          ...settings
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coachSettings'] });
      toast.success("✅ Configuración guardada");
    }
  });

  const toggleDia = (dia) => {
    setSettings(prev => ({
      ...prev,
      dias_laborales: prev.dias_laborales.includes(dia)
        ? prev.dias_laborales.filter(d => d !== dia)
        : [...prev.dias_laborales, dia]
    }));
  };

  const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

  if (isLoading) {
    return <div className="p-4 text-center">Cargando...</div>;
  }

  return (
    <Card className="border-2 border-blue-200">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          Configuración de Horario
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {/* Switch principal */}
        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
          <div className="flex-1">
            <Label className="text-base font-bold text-blue-900">
              Activar Horario Laboral
            </Label>
            <p className="text-sm text-blue-700 mt-1">
              {settings.horario_laboral_activo 
                ? "✅ Activo - Los padres verán un mensaje fuera de tu horario" 
                : "❌ Desactivado - Los padres pueden escribir en cualquier momento"}
            </p>
          </div>
          <Switch
            checked={settings.horario_laboral_activo}
            onCheckedChange={(checked) => setSettings({ ...settings, horario_laboral_activo: checked })}
            className="data-[state=checked]:bg-blue-600"
          />
        </div>

        {settings.horario_laboral_activo && (
          <>
            {/* Horarios */}
            <div className="space-y-3">
              <Label className="font-bold flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Horario de Atención
              </Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-slate-600">Hora Inicio</Label>
                  <Input
                    type="time"
                    value={settings.horario_inicio}
                    onChange={(e) => setSettings({ ...settings, horario_inicio: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm text-slate-600">Hora Fin</Label>
                  <Input
                    type="time"
                    value={settings.horario_fin}
                    onChange={(e) => setSettings({ ...settings, horario_fin: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Días laborales */}
            <div className="space-y-3">
              <Label className="font-bold flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Días Laborales
              </Label>
              <div className="flex flex-wrap gap-2">
                {diasSemana.map(dia => (
                  <Badge
                    key={dia}
                    onClick={() => toggleDia(dia)}
                    className={`cursor-pointer ${
                      settings.dias_laborales.includes(dia)
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-slate-300 hover:bg-slate-400 text-slate-700'
                    }`}
                  >
                    {dia.slice(0, 3)}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Mensaje fuera de horario */}
            <div className="space-y-2">
              <Label className="font-bold">Mensaje Fuera de Horario</Label>
              <Textarea
                value={settings.mensaje_fuera_horario}
                onChange={(e) => setSettings({ ...settings, mensaje_fuera_horario: e.target.value })}
                placeholder="Mensaje que verán los padres fuera de tu horario"
                className="h-20"
              />
            </div>

            {/* Vista previa */}
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-bold text-yellow-900 text-sm">Vista Previa</p>
                  <p className="text-sm text-yellow-800 mt-1">
                    Horario: {settings.horario_inicio} - {settings.horario_fin}
                  </p>
                  <p className="text-sm text-yellow-800">
                    Días: {settings.dias_laborales.join(", ")}
                  </p>
                  <p className="text-xs text-yellow-700 mt-2 italic">
                    "{settings.mensaje_fuera_horario}"
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Botón guardar */}
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {saveMutation.isPending ? (
            <>
              <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Guardar Configuración
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
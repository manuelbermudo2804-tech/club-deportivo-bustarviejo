import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Moon, Clock, Calendar } from "lucide-react";

const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export default function CoordinatorAwayMode({ user }) {
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ['coordinatorSettings', user?.email],
    queryFn: async () => {
      const all = await base44.entities.CoordinatorSettings.filter({ coordinador_email: user.email });
      return all[0] || null;
    },
    enabled: !!user?.email,
  });

  const [modoAusente, setModoAusente] = useState(false);
  const [mensajeAusente, setMensajeAusente] = useState("Estoy ausente. Te responderé lo antes posible.");
  const [horarioActivo, setHorarioActivo] = useState(false);
  const [horarioInicio, setHorarioInicio] = useState("09:00");
  const [horarioFin, setHorarioFin] = useState("18:00");
  const [diasLaborales, setDiasLaborales] = useState(["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]);
  const [mensajeFueraHorario, setMensajeFueraHorario] = useState("Tu mensaje ha sido recibido. El coordinador te responderá en horario laboral (L-V 9:00-18:00).");

  useEffect(() => {
    if (settings) {
      setModoAusente(settings.modo_ausente || false);
      setMensajeAusente(settings.mensaje_ausente || "Estoy ausente. Te responderé lo antes posible.");
      setHorarioActivo(settings.horario_laboral_activo || false);
      setHorarioInicio(settings.horario_inicio || "09:00");
      setHorarioFin(settings.horario_fin || "18:00");
      setDiasLaborales(settings.dias_laborales || ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]);
      setMensajeFueraHorario(settings.mensaje_fuera_horario || "Tu mensaje ha sido recibido. El coordinador te responderá en horario laboral (L-V 9:00-18:00).");
    }
  }, [settings]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (data) => {
      console.log('💾 [COORDINATOR CONFIG] Iniciando guardado...');
      console.log('👤 [COORDINATOR CONFIG] Usuario:', user?.email);
      console.log('📋 [COORDINATOR CONFIG] Datos a guardar:', data);
      console.log('📋 [COORDINATOR CONFIG] Settings existentes:', settings);
      
      const dataToSave = {
        coordinador_email: user.email,
        ...data
      };
      
      console.log('💾 [COORDINATOR CONFIG] DataToSave completo:', dataToSave);
      
      if (settings?.id) {
        console.log('🔄 [COORDINATOR CONFIG] Actualizando settings existentes, ID:', settings.id);
        const result = await base44.entities.CoordinatorSettings.update(settings.id, dataToSave);
        console.log('✅ [COORDINATOR CONFIG] Update completado:', result);
        return result;
      } else {
        console.log('➕ [COORDINATOR CONFIG] Creando nuevos settings');
        const result = await base44.entities.CoordinatorSettings.create(dataToSave);
        console.log('✅ [COORDINATOR CONFIG] Create completado:', result);
        return result;
      }
    },
    onSuccess: () => {
      console.log('✅ [COORDINATOR CONFIG] onSuccess ejecutado');
      queryClient.invalidateQueries({ queryKey: ['coordinatorSettings', user?.email] });
      toast.success("✅ Configuración guardada correctamente", {
        duration: 3000,
        style: {
          background: '#0891b2',
          color: 'white',
          fontSize: '14px',
          fontWeight: 'bold'
        }
      });
    },
    onError: (error) => {
      console.error('❌ [COORDINATOR CONFIG] Error guardando:', error);
      toast.error("Error guardando configuración: " + error.message, {
        duration: 4000,
        style: {
          background: '#dc2626',
          color: 'white',
          fontSize: '14px',
          fontWeight: 'bold'
        }
      });
    }
  });

  const toggleDia = (dia) => {
    if (diasLaborales.includes(dia)) {
      setDiasLaborales(diasLaborales.filter(d => d !== dia));
    } else {
      setDiasLaborales([...diasLaborales, dia]);
    }
  };

  const handleSave = () => {
    console.log('🚀 [COORDINATOR CONFIG] handleSave llamado');
    console.log('📊 [COORDINATOR CONFIG] Estado actual:', {
      modoAusente,
      mensajeAusente,
      horarioActivo,
      horarioInicio,
      horarioFin,
      diasLaborales,
      mensajeFueraHorario
    });
    
    saveSettingsMutation.mutate({
      modo_ausente: modoAusente,
      mensaje_ausente: mensajeAusente,
      horario_laboral_activo: horarioActivo,
      horario_inicio: horarioInicio,
      horario_fin: horarioFin,
      dias_laborales: diasLaborales,
      mensaje_fuera_horario: mensajeFueraHorario
    });
  };

  return (
    <div className="space-y-4">
      <Card className="border-purple-200 bg-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Moon className="w-5 h-5 text-purple-600" />
            🌙 Modo Ausente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="modo-ausente" className="text-sm font-medium">
              Activar modo ausente
            </Label>
            <Switch
              id="modo-ausente"
              checked={modoAusente}
              onCheckedChange={setModoAusente}
            />
          </div>
          {modoAusente && (
            <div>
              <Label className="text-sm mb-2 block">Mensaje automático</Label>
              <Textarea
                value={mensajeAusente}
                onChange={(e) => setMensajeAusente(e.target.value)}
                placeholder="Mensaje que recibirán las familias..."
                rows={3}
                className="text-sm"
              />
              <p className="text-xs text-slate-500 mt-1">
                ℹ️ Este mensaje se enviará automáticamente cuando una familia te escriba
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="w-5 h-5 text-blue-600" />
            ⏰ Horario Laboral
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="horario-activo" className="text-sm font-medium">
              Activar horario laboral
            </Label>
            <Switch
              id="horario-activo"
              checked={horarioActivo}
              onCheckedChange={setHorarioActivo}
            />
          </div>
          {horarioActivo && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm mb-1 block">Hora inicio</Label>
                  <Input
                    type="time"
                    value={horarioInicio}
                    onChange={(e) => setHorarioInicio(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-sm mb-1 block">Hora fin</Label>
                  <Input
                    type="time"
                    value={horarioFin}
                    onChange={(e) => setHorarioFin(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm mb-2 block">Días laborales</Label>
                <div className="grid grid-cols-2 gap-2">
                  {DIAS_SEMANA.map(dia => (
                    <div key={dia} className="flex items-center gap-2">
                      <Checkbox
                        checked={diasLaborales.includes(dia)}
                        onCheckedChange={() => toggleDia(dia)}
                      />
                      <Label className="text-xs cursor-pointer" onClick={() => toggleDia(dia)}>
                        {dia}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm mb-2 block">Mensaje fuera de horario</Label>
                <Textarea
                  value={mensajeFueraHorario}
                  onChange={(e) => setMensajeFueraHorario(e.target.value)}
                  rows={3}
                  className="text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">
                  ℹ️ Las familias recibirán este mensaje si escriben fuera de tu horario laboral
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Button 
        onClick={handleSave} 
        disabled={saveSettingsMutation.isPending}
        className="w-full bg-cyan-600 hover:bg-cyan-700 transition-all hover:scale-105 active:scale-95"
      >
        {saveSettingsMutation.isPending ? (
          <>
            <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Guardando...
          </>
        ) : (
          <>
            💾 Guardar Configuración
          </>
        )}
      </Button>
    </div>
  );
}
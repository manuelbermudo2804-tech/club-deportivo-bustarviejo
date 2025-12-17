import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Moon, Clock, Save } from "lucide-react";
import { toast } from "sonner";

const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export default function CoachAwayMode({ user }) {
  const [modoAusente, setModoAusente] = useState(false);
  const [mensajeAusente, setMensajeAusente] = useState("");
  const [horarioActivo, setHorarioActivo] = useState(false);
  const [horarioInicio, setHorarioInicio] = useState("09:00");
  const [horarioFin, setHorarioFin] = useState("21:00");
  const [diasLaborales, setDiasLaborales] = useState(["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]);
  const [mensajeFueraHorario, setMensajeFueraHorario] = useState("");

  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ['coachSettings', user?.email],
    queryFn: async () => {
      const all = await base44.entities.CoachSettings.filter({ entrenador_email: user.email });
      return all[0] || null;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (settings) {
      setModoAusente(settings.modo_ausente || false);
      setMensajeAusente(settings.mensaje_ausente || "");
      setHorarioActivo(settings.horario_laboral_activo || false);
      setHorarioInicio(settings.horario_inicio || "09:00");
      setHorarioFin(settings.horario_fin || "21:00");
      setDiasLaborales(settings.dias_laborales || ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]);
      setMensajeFueraHorario(settings.mensaje_fuera_horario || "");
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (settings) {
        return await base44.entities.CoachSettings.update(settings.id, data);
      }
      return await base44.entities.CoachSettings.create({
        entrenador_email: user.email,
        entrenador_nombre: user.full_name,
        ...data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coachSettings'] });
      toast.success("✅ Configuración guardada correctamente", {
        duration: 3000,
        style: {
          background: '#16a34a',
          color: 'white',
          fontSize: '14px',
          fontWeight: 'bold'
        }
      });
    }
  });

  const handleSaveAll = () => {
    saveMutation.mutate({
      modo_ausente: modoAusente,
      mensaje_ausente: mensajeAusente,
      horario_laboral_activo: horarioActivo,
      horario_inicio: horarioInicio,
      horario_fin: horarioFin,
      dias_laborales: diasLaborales,
      mensaje_fuera_horario: mensajeFueraHorario
    });
  };

  const toggleDia = (dia) => {
    if (diasLaborales.includes(dia)) {
      setDiasLaborales(diasLaborales.filter(d => d !== dia));
    } else {
      setDiasLaborales([...diasLaborales, dia]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Modo Ausente */}
      <Card className="bg-purple-50 border-purple-200">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-purple-700">
            <Moon className="w-5 h-5" />
            <h3 className="font-bold text-lg">🌙 Modo Ausente</h3>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Activar modo ausente</Label>
              <p className="text-xs text-slate-500">Envía un mensaje automático cuando los padres escriban</p>
            </div>
            <Switch checked={modoAusente} onCheckedChange={setModoAusente} />
          </div>

          {modoAusente && (
            <div>
              <Label>Mensaje automático de ausencia</Label>
              <Textarea
                value={mensajeAusente}
                onChange={(e) => setMensajeAusente(e.target.value)}
                placeholder="Ej: Estoy de vacaciones, responderé en unos días. Para urgencias contacta al coordinador."
                rows={3}
                className="mt-1"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Horario Laboral */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-blue-700">
            <Clock className="w-5 h-5" />
            <h3 className="font-bold text-lg">📅 Horario Laboral</h3>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Activar horario laboral</Label>
              <p className="text-xs text-slate-500">Define cuándo estás disponible para responder</p>
            </div>
            <Switch checked={horarioActivo} onCheckedChange={setHorarioActivo} />
          </div>

          {horarioActivo && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Hora inicio</Label>
                  <input
                    type="time"
                    value={horarioInicio}
                    onChange={(e) => setHorarioInicio(e.target.value)}
                    className="w-full p-2 border rounded-lg mt-1"
                  />
                </div>
                <div>
                  <Label>Hora fin</Label>
                  <input
                    type="time"
                    value={horarioFin}
                    onChange={(e) => setHorarioFin(e.target.value)}
                    className="w-full p-2 border rounded-lg mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>Días laborales</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                  {DIAS_SEMANA.map(dia => (
                    <button
                      key={dia}
                      onClick={() => toggleDia(dia)}
                      className={`p-2 rounded-lg text-xs font-medium transition-all ${
                        diasLaborales.includes(dia)
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {dia.substring(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Mensaje fuera de horario</Label>
                <Textarea
                  value={mensajeFueraHorario}
                  onChange={(e) => setMensajeFueraHorario(e.target.value)}
                  placeholder="Ej: Estoy fuera de mi horario de atención. Responderé pronto."
                  rows={3}
                  className="mt-1"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Button 
        onClick={handleSaveAll} 
        disabled={saveMutation.isPending}
        className="w-full bg-green-600 hover:bg-green-700 transition-all hover:scale-105 active:scale-95"
      >
        {saveMutation.isPending ? (
          <>
            <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Guardando...
          </>
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            💾 Guardar Configuración
          </>
        )}
      </Button>
    </div>
  );
}
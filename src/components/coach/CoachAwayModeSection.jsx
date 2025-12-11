import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Moon, Save } from "lucide-react";
import { toast } from "sonner";

export default function CoachAwayModeSection({ user }) {
  const [modoAusente, setModoAusente] = useState(false);
  const [mensajeAusente, setMensajeAusente] = useState("");

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
      toast.success("Configuración guardada");
    }
  });

  const handleSave = () => {
    saveMutation.mutate({
      modo_ausente: modoAusente,
      mensaje_ausente: mensajeAusente
    });
  };

  return (
    <div className="space-y-4">
      <Card className="bg-purple-50 border-purple-200">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-purple-700 mb-2">
            <Moon className="w-5 h-5" />
            <h3 className="font-bold text-lg">🌙 Modo Ausente</h3>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Activar modo ausente</Label>
              <p className="text-sm text-slate-500 mt-1">Envía un mensaje automático cuando los padres escriban</p>
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
                rows={4}
                className="mt-2"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full bg-green-600 hover:bg-green-700" disabled={saveMutation.isPending}>
        <Save className="w-4 h-4 mr-2" />
        💾 Guardar Configuración
      </Button>
    </div>
  );
}
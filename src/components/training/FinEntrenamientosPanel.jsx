import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarX } from "lucide-react";
import { toast } from "sonner";

// Fecha oficial de cese de entrenamientos: se aplica a todos los horarios a la vez
export default function FinEntrenamientosPanel({ schedules = [], canEdit }) {
  const queryClient = useQueryClient();
  const actual = schedules.find((s) => s.fecha_fin)?.fecha_fin?.slice(0, 10) || "";
  const [fecha, setFecha] = useState(actual);
  const [saving, setSaving] = useState(false);
  useEffect(() => setFecha(actual), [actual]);

  const guardar = async () => {
    setSaving(true);
    await base44.entities.TrainingSchedule.bulkUpdate(schedules.map((s) => ({ id: s.id, fecha_fin: fecha || null })));
    await queryClient.invalidateQueries({ queryKey: ["trainingSchedules"] });
    queryClient.invalidateQueries({ queryKey: ["agenda-schedules"] });
    setSaving(false);
    toast.success(fecha ? "Fecha de fin guardada para todas las categorías" : "Fecha de fin eliminada");
  };

  if (!canEdit && !actual) return null;

  return (
    <Card className="border-orange-200">
      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <CalendarX className="w-5 h-5 text-orange-600" />
          <div>
            <p className="font-semibold text-slate-900">Último día de entrenamientos</p>
            <p className="text-xs text-slate-500">Igual para todas las categorías. Después no aparecen en la agenda.</p>
          </div>
        </div>
        {canEdit ? (
          <div className="flex gap-2">
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-44" />
            <Button onClick={guardar} disabled={saving || fecha === actual || schedules.length === 0} className="bg-orange-600 hover:bg-orange-700">
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        ) : (
          <span className="font-semibold text-slate-800">{new Date(actual).toLocaleDateString("es-ES")}</span>
        )}
      </CardContent>
    </Card>
  );
}
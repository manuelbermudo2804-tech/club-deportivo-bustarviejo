import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

// Panel para publicar a mano el resultado del sorteo.
// Al publicarlo, la página pública lo muestra arriba con estilo destacado.
export default function LoteriaPremioAdmin({ campana }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (!campana || form) return;
    setForm({
      resultado_publicado: campana.resultado_publicado === true,
      resultado_premiado: campana.resultado_premiado === true,
      resultado_premio_decimo: campana.resultado_premio_decimo ?? "",
      resultado_tipo_premio: campana.resultado_tipo_premio || "",
      resultado_mensaje: campana.resultado_mensaje || "",
    });
  }, [campana, form]);

  const guardar = useMutation({
    mutationFn: (data) =>
      base44.entities.LoteriaCampana.update(campana.id, {
        ...data,
        resultado_premio_decimo: Number(data.resultado_premio_decimo) || 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loteriaCampana"] });
      queryClient.invalidateQueries({ queryKey: ["loteriaPublic"] });
      toast.success("✅ Resultado actualizado");
    },
  });

  if (!campana?.id) {
    return (
      <Card className="border-2 border-amber-200">
        <CardHeader className="bg-amber-50">
          <CardTitle className="text-lg">🏆 Resultado del sorteo</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-slate-600 text-sm">Guarda primero la campaña para poder publicar el resultado.</p>
        </CardContent>
      </Card>
    );
  }

  if (!form) return null;

  return (
    <Card className="border-2 border-amber-200">
      <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50">
        <CardTitle className="text-lg">🏆 Resultado del sorteo</CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3">
          <div>
            <p className="font-semibold text-slate-900">Publicar el resultado en la página</p>
            <p className="text-xs text-slate-600">
              Mientras esté apagado, nadie verá nada sobre el resultado
            </p>
          </div>
          <Switch
            checked={form.resultado_publicado}
            onCheckedChange={(v) => setForm({ ...form, resultado_publicado: v })}
          />
        </div>

        <div className="flex items-center justify-between bg-amber-50 rounded-xl p-3 border border-amber-200">
          <div>
            <p className="font-semibold text-slate-900">¿Ha tocado?</p>
            <p className="text-xs text-slate-600">
              Actívalo solo si el número {campana.numero || "del club"} ha sido premiado
            </p>
          </div>
          <Switch
            checked={form.resultado_premiado}
            onCheckedChange={(v) => setForm({ ...form, resultado_premiado: v })}
          />
        </div>

        {form.resultado_premiado && (
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Premio por décimo (€)</Label>
              <Input
                type="number"
                value={form.resultado_premio_decimo}
                onChange={(e) => setForm({ ...form, resultado_premio_decimo: e.target.value })}
                placeholder="1000"
              />
            </div>
            <div className="space-y-1">
              <Label>Tipo de premio (opcional)</Label>
              <Input
                value={form.resultado_tipo_premio}
                onChange={(e) => setForm({ ...form, resultado_tipo_premio: e.target.value })}
                placeholder="Ej: Pedrea, Segundo premio, El Gordo"
              />
            </div>
          </div>
        )}

        <div className="space-y-1">
          <Label>Mensaje del club (opcional)</Label>
          <Textarea
            value={form.resultado_mensaje}
            onChange={(e) => setForm({ ...form, resultado_mensaje: e.target.value })}
            placeholder="¡Gracias a todos los que habéis participado!"
          />
        </div>

        <Button
          onClick={() => guardar.mutate(form)}
          disabled={guardar.isPending}
          className="bg-amber-600 hover:bg-amber-700"
        >
          {guardar.isPending ? "Guardando..." : "Guardar resultado"}
        </Button>
      </CardContent>
    </Card>
  );
}
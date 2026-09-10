import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { toast } from "sonner";
import useCategoryPlazas from "./useCategoryPlazas";
import PlazasBadge from "./PlazasBadge";

/** Panel de admin: límite de plazas y apertura/cierre de inscripciones por categoría. */
export default function PlazasCategoriaPanel({ categories = [] }) {
  const queryClient = useQueryClient();
  const { getEstado } = useCategoryPlazas();
  const [limites, setLimites] = useState({});

  const update = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CategoryConfig.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categoryConfig"] });
      queryClient.invalidateQueries({ queryKey: ["categoryConfigPlazas"] });
      toast.success("✅ Plazas actualizadas");
    },
    onError: (e) => toast.error("Error: " + e.message),
  });

  return (
    <Card className="border-2 border-blue-300">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardTitle className="text-blue-900 flex items-center gap-2">
          <Users className="w-5 h-5" /> Plazas por categoría
        </CardTitle>
        <p className="text-sm text-blue-800">
          Fija el número máximo de fichas. Al llegar al límite, la categoría aparece completa y no se aceptan más inscripciones.
        </p>
      </CardHeader>
      <CardContent className="pt-6 space-y-3">
        {categories.map((cat) => {
          const est = getEstado(cat.nombre);
          const valor = limites[cat.id] ?? (cat.plazas_maximas ?? "");
          return (
            <div key={cat.id} className="flex flex-wrap items-center gap-3 border-b pb-3">
              <div className="flex-1 min-w-[200px]">
                <p className="font-medium text-slate-900">{cat.nombre}</p>
                <PlazasBadge estado={est} />
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  value={valor}
                  onChange={(e) => setLimites({ ...limites, [cat.id]: e.target.value })}
                  placeholder="Sin límite"
                  className="w-28"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    update.mutate({
                      id: cat.id,
                      data: { plazas_maximas: valor === "" ? null : Number(valor) },
                    })
                  }
                >
                  Guardar
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600">Inscripciones abiertas</span>
                <Switch
                  checked={cat.inscripciones_abiertas !== false}
                  onCheckedChange={(v) => update.mutate({ id: cat.id, data: { inscripciones_abiertas: v } })}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, Phone, Clock, Sun, Sunset, Download } from "lucide-react";

const ESTADO_COLORS = {
  pendiente: "bg-yellow-100 text-yellow-800",
  contactado: "bg-blue-100 text-blue-800",
  confirmado: "bg-green-100 text-green-800",
  descartado: "bg-slate-200 text-slate-600",
};

export default function VolunteersList() {
  const queryClient = useQueryClient();

  const { data: voluntarios = [], isLoading } = useQuery({
    queryKey: ["sanIsidroVoluntarios"],
    queryFn: () => base44.entities.SanIsidroVoluntario.list("-created_date", 500),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, estado }) => base44.entities.SanIsidroVoluntario.update(id, { estado }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sanIsidroVoluntarios"] }),
  });

  const exportCSV = () => {
    const headers = ["Nombre", "Teléfono", "Mañana", "Tarde", "Notas", "Estado", "Fecha"];
    const rows = voluntarios.map(v => [
      v.nombre,
      v.telefono,
      v.disponibilidad_manana ? "Sí" : "No",
      v.disponibilidad_tarde ? "Sí" : "No",
      v.notas || "",
      v.estado || "pendiente",
      new Date(v.created_date).toLocaleString("es-ES"),
    ]);
    const csv = [headers, ...rows].map(row => row.map(c => `"${(c || "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "voluntarios_san_isidro_2026.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <Heart className="w-4 h-4 text-pink-600" />
          <span>Voluntarios:</span>
          <Badge className="bg-pink-600 text-white">{voluntarios.length}</Badge>
        </div>
        {voluntarios.length > 0 && (
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1">
            <Download className="w-4 h-4" /> Exportar CSV
          </Button>
        )}
      </div>

      {voluntarios.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-slate-500">
            <Heart className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            No hay voluntarios apuntados todavía.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {voluntarios.map((v) => (
            <Card key={v.id} className="border-l-4 border-l-pink-500">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <p className="font-bold text-slate-800">{v.nombre}</p>
                    <a href={`tel:${v.telefono}`} className="flex items-center gap-1 text-sm text-slate-600 hover:text-pink-600 mt-0.5">
                      <Phone className="w-3 h-3" />{v.telefono}
                    </a>
                  </div>
                  <span className="text-xs text-slate-400 flex items-center gap-1 whitespace-nowrap">
                    <Clock className="w-3 h-3" />
                    {new Date(v.created_date).toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {v.disponibilidad_manana && (
                    <Badge className="bg-yellow-100 text-yellow-800">
                      <Sun className="w-3 h-3 mr-1" /> Mañana
                    </Badge>
                  )}
                  {v.disponibilidad_tarde && (
                    <Badge className="bg-orange-100 text-orange-800">
                      <Sunset className="w-3 h-3 mr-1" /> Tarde
                    </Badge>
                  )}
                </div>

                {v.notas && (
                  <p className="text-xs text-slate-600 bg-slate-50 rounded p-2 italic">📝 {v.notas}</p>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <Badge className={ESTADO_COLORS[v.estado || "pendiente"]}>
                    {v.estado || "pendiente"}
                  </Badge>
                  <Select
                    value={v.estado || "pendiente"}
                    onValueChange={(estado) => updateMutation.mutate({ id: v.id, estado })}
                  >
                    <SelectTrigger className="h-7 text-xs w-36 ml-auto">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="contactado">Contactado</SelectItem>
                      <SelectItem value="confirmado">Confirmado</SelectItem>
                      <SelectItem value="descartado">Descartado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
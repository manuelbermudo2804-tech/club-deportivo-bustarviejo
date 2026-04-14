import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shirt, Phone, Mail, Building2, User, Trash2 } from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS = {
  pendiente: "bg-yellow-100 text-yellow-800",
  contactado: "bg-blue-100 text-blue-800",
  adjudicado: "bg-green-100 text-green-800",
  descartado: "bg-slate-100 text-slate-500",
};

export default function SponsorInterestPanel() {
  const queryClient = useQueryClient();

  const { data: interests = [], isLoading } = useQuery({
    queryKey: ["sponsor-interests"],
    queryFn: () => base44.entities.SponsorInterest.list("-created_date"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SponsorInterest.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sponsor-interests"] });
      toast.success("Estado actualizado");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SponsorInterest.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sponsor-interests"] });
      toast.success("Solicitud eliminada");
    },
  });

  // Agrupar por posición
  const grouped = {};
  interests.forEach((i) => {
    if (!grouped[i.posicion]) grouped[i.posicion] = [];
    grouped[i.posicion].push(i);
  });

  if (isLoading) return <div className="text-center py-8 text-slate-400">Cargando solicitudes...</div>;
  if (interests.length === 0) return null;

  return (
    <Card className="border-orange-200 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shirt className="w-5 h-5 text-orange-600" />
          Solicitudes de Patrocinio en Camiseta
          <Badge className="bg-orange-100 text-orange-700 ml-2">{interests.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(grouped).map(([posicion, items]) => (
          <div key={posicion}>
            <div className="flex items-center gap-2 mb-3">
              <h4 className="font-bold text-slate-900">{posicion}</h4>
              {items.length > 1 && (
                <Badge className="bg-amber-100 text-amber-800 text-xs">
                  ⚠️ {items.length} interesados — subasta
                </Badge>
              )}
            </div>
            <div className="space-y-2">
              {items.map((interest) => (
                <div key={interest.id} className="bg-slate-50 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <span className="font-bold text-sm text-slate-900">{interest.nombre_comercio}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <User className="w-3 h-3" /> {interest.nombre_contacto}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {interest.email}</span>
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {interest.telefono}</span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {new Date(interest.created_date).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={interest.estado}
                      onValueChange={(val) => updateMutation.mutate({ id: interest.id, data: { estado: val } })}
                    >
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendiente">Pendiente</SelectItem>
                        <SelectItem value="contactado">Contactado</SelectItem>
                        <SelectItem value="adjudicado">Adjudicado</SelectItem>
                        <SelectItem value="descartado">Descartado</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-400 hover:text-red-600"
                      onClick={() => {
                        if (confirm("¿Eliminar esta solicitud?")) deleteMutation.mutate(interest.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
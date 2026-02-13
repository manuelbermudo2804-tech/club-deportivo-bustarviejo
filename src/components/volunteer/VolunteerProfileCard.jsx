import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Phone, Mail, Clock, UserPlus } from "lucide-react";

const AREA_LABELS = {
  dia_a_dia: "Día a día", eventos: "Eventos", logistica: "Logística",
  bar: "Bar", transporte: "Transporte", fotografia: "Fotografía"
};

export default function VolunteerProfileCard({ profile, onEdit }) {
  if (!profile) {
    return (
      <Card className="border-2 border-dashed border-green-300 bg-green-50/50">
        <CardContent className="p-6 text-center space-y-3">
          <div className="text-5xl">🤝</div>
          <h3 className="text-lg font-bold text-green-800">¡Hazte voluntario!</h3>
          <p className="text-sm text-green-700">Crea tu perfil para que podamos contar contigo en eventos y tareas del club.</p>
          <Button onClick={onEdit} className="bg-green-600 hover:bg-green-700">
            <UserPlus className="w-4 h-4 mr-2" /> Crear mi perfil de voluntario
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-green-200 bg-gradient-to-r from-green-50 to-white">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {profile.nombre?.[0]?.toUpperCase() || "?"}
            </div>
            <div>
              <h3 className="font-bold text-lg">{profile.nombre}</h3>
              <div className="flex items-center gap-3 text-sm text-slate-600 mt-0.5">
                <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {profile.email}</span>
                {profile.telefono && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {profile.telefono}</span>}
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="w-4 h-4 mr-1" /> Editar
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="secondary" className="capitalize">{profile.relacion}</Badge>
          {profile.activo !== false ? (
            <Badge className="bg-green-100 text-green-700 border-green-200">✅ Activo</Badge>
          ) : (
            <Badge className="bg-red-100 text-red-700 border-red-200">Inactivo</Badge>
          )}
          {(profile.areas || []).map(a => (
            <Badge key={a} className="bg-green-50 text-green-700 border-green-200">{AREA_LABELS[a] || a}</Badge>
          ))}
        </div>

        {profile.disponibilidad && (
          <div className="mt-2 text-sm text-slate-600 flex items-start gap-1">
            <Clock className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-400" />
            {profile.disponibilidad}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
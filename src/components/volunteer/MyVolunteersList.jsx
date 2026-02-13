import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, UserPlus } from "lucide-react";

const AREA_LABELS = {
  dia_a_dia: "Día a día",
  eventos: "Eventos",
  logistica: "Logística",
  bar: "Bar",
  transporte: "Transporte",
  fotografia: "Fotografía"
};

export default function MyVolunteersList({ profiles, onEdit, onDelete, onAdd }) {
  if (!profiles || profiles.length === 0) {
    return (
      <Card className="border-2 border-dashed border-green-300 bg-green-50/50">
        <CardContent className="p-6 text-center space-y-3">
          <div className="text-4xl">🤝</div>
          <p className="text-green-800 font-semibold">Aún no has registrado voluntarios</p>
          <p className="text-sm text-green-700">Puedes registrarte tú y también a familiares o amigos que quieran ayudar al club.</p>
          <Button onClick={onAdd} className="bg-green-600 hover:bg-green-700">
            <UserPlus className="w-4 h-4 mr-2" /> Registrar voluntario
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">Mis voluntarios registrados</h3>
          <Button size="sm" onClick={onAdd} className="bg-green-600 hover:bg-green-700">
            <UserPlus className="w-4 h-4 mr-1" /> Añadir
          </Button>
        </div>
        <div className="divide-y">
          {profiles.map((p) => (
            <div key={p.id} className="flex items-center gap-3 py-3">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold flex-shrink-0">
                {p.nombre?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold truncate">{p.nombre}</span>
                  <Badge variant="secondary" className="capitalize text-xs">{p.relacion}</Badge>
                  {p.activo === false && <Badge className="bg-red-100 text-red-700 text-xs">Inactivo</Badge>}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {p.telefono} · {p.email}
                </div>
                {p.areas?.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {p.areas.map(a => (
                      <Badge key={a} className="bg-green-50 text-green-700 border-green-200 text-[10px]">
                        {AREA_LABELS[a] || a}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button variant="ghost" size="icon" onClick={() => onEdit(p)} title="Editar">
                  <Pencil className="w-4 h-4 text-slate-500" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(p)} title="Eliminar">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Pencil, CheckCircle, XCircle } from "lucide-react";

export default function MedicalRecordCard({ record, onEdit, isAdmin }) {
  const gravedadColor = {
    Leve: "bg-blue-100 text-blue-800",
    Moderada: "bg-orange-100 text-orange-800",
    Grave: "bg-red-100 text-red-800"
  };

  const estadoColor = {
    Activo: "bg-red-100 text-red-800",
    "En Seguimiento": "bg-orange-100 text-orange-800",
    Recuperado: "bg-green-100 text-green-800"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="border-2">
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge className={gravedadColor[record.gravedad]}>
                {record.gravedad}
              </Badge>
              <Badge className={estadoColor[record.estado]}>
                {record.estado}
              </Badge>
              <Badge variant="outline">{record.tipo_registro}</Badge>
            </div>
            <h3 className="text-xl font-bold">{record.jugador_nombre}</h3>
            <p className="text-slate-600 text-sm">{record.categoria}</p>
          </div>
          {isAdmin && (
            <Button variant="ghost" size="icon" onClick={() => onEdit(record)}>
              <Pencil className="w-4 h-4" />
            </Button>
          )}
        </CardHeader>

        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{record.descripcion}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Calendar className="w-4 h-4" />
                <span>
                  Ocurrió: {new Date(record.fecha_ocurrencia).toLocaleDateString('es-ES')}
                </span>
              </div>

              {record.fecha_alta_estimada && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Calendar className="w-4 h-4" />
                  <span>
                    Alta estimada: {new Date(record.fecha_alta_estimada).toLocaleDateString('es-ES')}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                {record.puede_entrenar ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <span className="text-sm">Entrenar</span>
              </div>

              <div className="flex items-center gap-2">
                {record.puede_jugar ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <span className="text-sm">Jugar</span>
              </div>
            </div>

            {record.tratamiento && (
              <div className="border-t pt-3">
                <p className="text-xs text-slate-600 mb-1">Tratamiento:</p>
                <p className="text-sm text-slate-700">{record.tratamiento}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
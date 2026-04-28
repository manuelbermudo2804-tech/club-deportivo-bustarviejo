import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Users, Phone, Mail, Clock, MessageCircle, Trash2 } from "lucide-react";

const cleanPhone = (p) => (p || "").replace(/\D/g, "");

export default function RegistrationCard({ reg, onDelete }) {
  const isChapa = reg.modalidad?.startsWith("Fútbol Chapa");
  const colorClass = isChapa ? "border-l-orange-500" : "border-l-green-500";
  const phone = cleanPhone(reg.telefono_responsable);

  return (
    <Card className={`border-l-4 ${colorClass}`}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <Badge className={isChapa ? "bg-orange-100 text-orange-800" : "bg-green-100 text-green-800"}>
            {isChapa ? <Trophy className="w-3 h-3 mr-1" /> : <Users className="w-3 h-3 mr-1" />}
            {reg.modalidad}
          </Badge>
          <span className="text-xs text-slate-400 flex items-center gap-1 whitespace-nowrap">
            <Clock className="w-3 h-3" />
            {new Date(reg.created_date).toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        <div className="text-sm">
          <p className="font-bold text-slate-800">{reg.nombre_responsable}</p>
          <div className="flex flex-wrap items-center gap-3 text-slate-500 text-xs mt-1">
            <a href={`tel:${reg.telefono_responsable}`} className="flex items-center gap-1 hover:text-orange-600">
              <Phone className="w-3 h-3" />{reg.telefono_responsable}
            </a>
            {reg.email_responsable && (
              <a href={`mailto:${reg.email_responsable}`} className="flex items-center gap-1 hover:text-orange-600">
                <Mail className="w-3 h-3" />{reg.email_responsable}
              </a>
            )}
          </div>
        </div>

        {isChapa && reg.jugador_nombre && (
          <div className="bg-orange-50 rounded-lg px-3 py-2">
            <p className="text-xs text-orange-600 font-semibold">Jugador</p>
            <p className="text-sm font-bold text-orange-900">{reg.jugador_nombre}</p>
          </div>
        )}

        {!isChapa && (
          <div className="bg-green-50 rounded-lg px-3 py-2 space-y-1">
            {reg.nombre_equipo && <p className="text-sm font-bold text-green-900">🏅 {reg.nombre_equipo}</p>}
            <div className="grid grid-cols-3 gap-1">
              {[reg.jugador_1, reg.jugador_2, reg.jugador_3].map((j, i) => j && (
                <div key={i} className="text-xs text-green-700">
                  <span className="text-green-500 font-bold">J{i + 1}:</span> {j}
                </div>
              ))}
            </div>
          </div>
        )}

        {reg.notas && <p className="text-xs text-slate-500 italic">📝 {reg.notas}</p>}

        <div className="flex items-center gap-2 pt-1">
          {phone && (
            <a href={`https://wa.me/34${phone}`} target="_blank" rel="noreferrer" className="flex-1">
              <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-1 border-green-500 text-green-700 hover:bg-green-50">
                <MessageCircle className="w-3 h-3" /> WhatsApp
              </Button>
            </a>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDelete(reg)}
            className="h-8 text-xs gap-1 border-red-300 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-3 h-3" /> Borrar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, Mail, Calendar, User, Trophy, Clock, MessageCircle, ChevronDown, ChevronUp, Save } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import moment from "moment";

const estadoConfig = {
  nuevo: { label: "Nuevo", color: "bg-blue-100 text-blue-800 border-blue-200" },
  contactado: { label: "Contactado", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  en_seguimiento: { label: "En seguimiento", color: "bg-orange-100 text-orange-800 border-orange-200" },
  cerrado: { label: "Cerrado", color: "bg-green-100 text-green-800 border-green-200" },
};

export default function ContactCard({ contact, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [notas, setNotas] = useState(contact.notas_admin || "");
  const [saving, setSaving] = useState(false);
  const estado = estadoConfig[contact.estado] || estadoConfig.nuevo;

  const handleEstadoChange = async (newEstado) => {
    const data = { estado: newEstado };
    if (newEstado === "contactado" && !contact.fecha_contacto) {
      data.fecha_contacto = new Date().toISOString();
    }
    await base44.entities.ContactForm.update(contact.id, data);
    toast.success("Estado actualizado");
    onUpdate();
  };

  const handleSaveNotas = async () => {
    setSaving(true);
    await base44.entities.ContactForm.update(contact.id, { notas_admin: notas });
    toast.success("Notas guardadas");
    setSaving(false);
    onUpdate();
  };

  return (
    <Card className="border-l-4 transition-shadow hover:shadow-lg" style={{ borderLeftColor: contact.estado === 'nuevo' ? '#3b82f6' : contact.estado === 'contactado' ? '#eab308' : contact.estado === 'en_seguimiento' ? '#f97316' : '#22c55e' }}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 text-base truncate">{contact.nombre}</h3>
              <Badge className={`${estado.color} text-[10px] border`}>{estado.label}</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{moment(contact.created_date).format("DD/MM/YYYY HH:mm")}</p>
          </div>
          <div className="flex items-center gap-1">
            {contact.telefono && (
              <a href={`tel:${contact.telefono}`}>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:bg-green-50">
                  <Phone className="w-4 h-4" />
                </Button>
              </a>
            )}
            {contact.email && (
              <a href={`mailto:${contact.email}`}>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 hover:bg-blue-50">
                  <Mail className="w-4 h-4" />
                </Button>
              </a>
            )}
            {contact.telefono && (
              <a href={`https://wa.me/${contact.telefono.replace(/\s/g,'').replace(/^\+?34/,'34').replace(/^(?!34)/,'34')}`} target="_blank" rel="noopener noreferrer">
                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-700 hover:bg-green-50">
                  <MessageCircle className="w-4 h-4" />
                </Button>
              </a>
            )}
          </div>
        </div>

        {/* Info rápida */}
        <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-600">
          {contact.edad && <span className="bg-slate-100 px-2 py-0.5 rounded-full">📅 {contact.edad} años</span>}
          {contact.deporte && <span className="bg-slate-100 px-2 py-0.5 rounded-full">⚽ {contact.deporte}</span>}
          {contact.categoria && <span className="bg-slate-100 px-2 py-0.5 rounded-full">🏷️ {contact.categoria}</span>}
          {contact.futbol_femenino && contact.futbol_femenino.toLowerCase().includes("sí") && <span className="bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full">👧 Femenino</span>}
        </div>

        {/* Expandir */}
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 mt-2 text-xs text-slate-500 hover:text-slate-700">
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? "Menos detalles" : "Más detalles"}
        </button>

        {expanded && (
          <div className="mt-3 space-y-3 animate-fade-in">
            {/* Datos completos */}
            <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-sm">
              {contact.telefono && <div className="flex gap-2"><Phone className="w-3.5 h-3.5 text-slate-400 mt-0.5" /><span>{contact.telefono}</span></div>}
              {contact.email && <div className="flex gap-2"><Mail className="w-3.5 h-3.5 text-slate-400 mt-0.5" /><span>{contact.email}</span></div>}
              {contact.experiencia && <div className="flex gap-2"><Trophy className="w-3.5 h-3.5 text-slate-400 mt-0.5" /><span>Experiencia: {contact.experiencia}</span></div>}
              {contact.disponibilidad && <div className="flex gap-2"><Clock className="w-3.5 h-3.5 text-slate-400 mt-0.5" /><span>Disponibilidad: {contact.disponibilidad}</span></div>}
              {contact.mensaje && <div className="flex gap-2"><MessageCircle className="w-3.5 h-3.5 text-slate-400 mt-0.5" /><span className="italic text-slate-600">"{contact.mensaje}"</span></div>}
            </div>

            {/* Cambiar estado */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Estado:</span>
              <Select value={contact.estado || "nuevo"} onValueChange={handleEstadoChange}>
                <SelectTrigger className="h-8 text-xs w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nuevo">🔵 Nuevo</SelectItem>
                  <SelectItem value="contactado">🟡 Contactado</SelectItem>
                  <SelectItem value="en_seguimiento">🟠 En seguimiento</SelectItem>
                  <SelectItem value="cerrado">🟢 Cerrado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notas */}
            <div>
              <Textarea
                placeholder="Notas internas sobre este contacto..."
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className="text-sm min-h-[60px]"
              />
              <Button size="sm" onClick={handleSaveNotas} disabled={saving} className="mt-1.5 bg-orange-600 hover:bg-orange-700 text-xs h-7">
                <Save className="w-3 h-3 mr-1" />
                {saving ? "Guardando..." : "Guardar notas"}
              </Button>
            </div>

            {contact.fecha_contacto && (
              <p className="text-[11px] text-slate-400">Contactado el {moment(contact.fecha_contacto).format("DD/MM/YYYY HH:mm")}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
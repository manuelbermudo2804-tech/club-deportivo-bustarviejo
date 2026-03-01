import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Phone, MessageCircle, Clock, User, Tag, ChevronDown, ChevronUp, Send } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const STATUS_CONFIG = {
  nuevo: { label: "Nuevo", color: "bg-red-500 text-white", icon: "🔴" },
  contactado: { label: "Contactado", color: "bg-blue-500 text-white", icon: "📞" },
  inscrito: { label: "Inscrito", color: "bg-green-500 text-white", icon: "✅" },
  descartado: { label: "Descartado", color: "bg-slate-400 text-white", icon: "❌" },
};

export default function ContactRequestCard({ contact, onStatusChange, onAddNote, onSendEmail }) {
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState("");
  const status = STATUS_CONFIG[contact.estado] || STATUS_CONFIG.nuevo;

  const timeAgo = contact.created_date
    ? format(new Date(contact.created_date), "d MMM yyyy, HH:mm", { locale: es })
    : "";

  return (
    <Card className={`border-l-4 ${contact.estado === 'nuevo' ? 'border-l-red-500 bg-red-50/30' : contact.estado === 'contactado' ? 'border-l-blue-500' : contact.estado === 'inscrito' ? 'border-l-green-500' : 'border-l-slate-300'} shadow-sm hover:shadow-md transition-shadow`}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 text-base">{contact.nombre}</h3>
              <Badge className={status.color + " text-[10px]"}>
                {status.icon} {status.label}
              </Badge>
              {contact.origen && contact.origen !== 'web' && (
                <Badge variant="outline" className="text-[10px]">{contact.origen}</Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-slate-600">
              <a href={`mailto:${contact.email}`} className="flex items-center gap-1 hover:text-orange-600">
                <Mail className="w-3.5 h-3.5" /> {contact.email}
              </a>
              {contact.telefono && (
                <a href={`tel:${contact.telefono}`} className="flex items-center gap-1 hover:text-orange-600">
                  <Phone className="w-3.5 h-3.5" /> {contact.telefono}
                </a>
              )}
            </div>
            {contact.categoria_interes && (
              <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                <Tag className="w-3 h-3" /> Interesado en: <strong>{contact.categoria_interes}</strong>
              </div>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {timeAgo}
            </p>
          </div>
        </div>

        {/* Message */}
        {contact.mensaje && (
          <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200 text-sm text-slate-700">
            <MessageCircle className="w-3.5 h-3.5 inline mr-1.5 text-slate-400" />
            "{contact.mensaje}"
          </div>
        )}

        {/* Quick actions */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <Select value={contact.estado} onValueChange={(val) => onStatusChange(contact.id, val)}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nuevo">🔴 Nuevo</SelectItem>
              <SelectItem value="contactado">📞 Contactado</SelectItem>
              <SelectItem value="inscrito">✅ Inscrito</SelectItem>
              <SelectItem value="descartado">❌ Descartado</SelectItem>
            </SelectContent>
          </Select>

          {contact.telefono && (
            <a href={`https://wa.me/${contact.telefono.replace(/\s/g, '').replace(/^\+/, '')}`} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="h-8 text-xs text-green-700 border-green-300 hover:bg-green-50">
                💬 WhatsApp
              </Button>
            </a>
          )}

          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => onSendEmail(contact)}>
            <Send className="w-3 h-3 mr-1" /> Enviar email
          </Button>

          <Button size="sm" variant="ghost" className="h-8 text-xs ml-auto" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Notas
          </Button>
        </div>

        {/* Expanded: Notes */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
            {contact.notas_admin && (
              <div className="p-2 bg-yellow-50 rounded-lg text-xs text-yellow-800 border border-yellow-200">
                <strong>📝 Notas:</strong> {contact.notas_admin}
              </div>
            )}
            {contact.respondido_por && (
              <p className="text-[10px] text-slate-400">
                Respondido por {contact.respondido_por} el {contact.fecha_respuesta ? format(new Date(contact.fecha_respuesta), "d MMM yyyy", { locale: es }) : ''}
              </p>
            )}
            <div className="flex gap-2">
              <Textarea
                placeholder="Añadir nota..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="text-xs min-h-[60px]"
              />
              <Button
                size="sm"
                className="bg-orange-600 hover:bg-orange-700 self-end"
                disabled={!note.trim()}
                onClick={() => { onAddNote(contact.id, note); setNote(""); }}
              >
                Guardar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
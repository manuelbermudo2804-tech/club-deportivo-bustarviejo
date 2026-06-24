import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Handshake, Phone, Mail, Building2, User, Trash2, ChevronDown, ChevronUp, Package, Euro, MessageSquare, ExternalLink, StickyNote, UserPlus } from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS = {
  nueva: "bg-blue-100 text-blue-800 border-blue-300",
  en_conversacion: "bg-amber-100 text-amber-800 border-amber-300",
  aceptada: "bg-green-100 text-green-800 border-green-300",
  descartada: "bg-slate-100 text-slate-500 border-slate-300",
};

const STATUS_LABELS = {
  nueva: "🆕 Nueva",
  en_conversacion: "💬 En conversación",
  aceptada: "✅ Aceptada",
  descartada: "❌ Descartada",
};

function PropuestaCard({ propuesta, onUpdate, onDelete, onConvertToSponsor }) {
  const [expanded, setExpanded] = useState(propuesta.estado === "nueva");
  const [notasEdit, setNotasEdit] = useState(propuesta.notas_internas || "");
  const [editingNotes, setEditingNotes] = useState(false);

  const total = Number(propuesta.total_estimado || 0);
  const paquetes = propuesta.paquetes_seleccionados || [];
  const fechaStr = new Date(propuesta.created_date).toLocaleString("es-ES", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
  });

  const handleSaveNotes = () => {
    onUpdate({ notas_internas: notasEdit });
    setEditingNotes(false);
  };

  return (
    <div className={`border rounded-xl bg-white overflow-hidden ${propuesta.estado === "nueva" ? "border-blue-300 shadow-sm" : "border-slate-200"}`}>
      {/* Header siempre visible */}
      <div className="p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center flex-shrink-0">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-black text-slate-900 truncate">{propuesta.empresa}</h4>
            <Badge className={`${STATUS_COLORS[propuesta.estado]} text-[10px] border`}>
              {STATUS_LABELS[propuesta.estado]}
            </Badge>
          </div>
          <p className="text-sm text-slate-600 mt-0.5 flex items-center gap-1.5">
            <User className="w-3 h-3" /> {propuesta.contacto_nombre}
          </p>
          <p className="text-[11px] text-slate-400">{fechaStr} · {propuesta.origen && <span>origen: /{propuesta.origen}</span>}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-slate-500">Total</p>
          <p className="font-black text-orange-600 text-lg">{total.toLocaleString("es-ES")} €</p>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="px-4 pb-3 flex flex-wrap gap-2 items-center">
        <Select
          value={propuesta.estado}
          onValueChange={(val) => onUpdate({ estado: val })}
        >
          <SelectTrigger className="w-44 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nueva">🆕 Nueva</SelectItem>
            <SelectItem value="en_conversacion">💬 En conversación</SelectItem>
            <SelectItem value="aceptada">✅ Aceptada</SelectItem>
            <SelectItem value="descartada">❌ Descartada</SelectItem>
          </SelectContent>
        </Select>
        <a href={`mailto:${propuesta.contacto_email}`} className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-orange-600 px-2 py-1 rounded-md hover:bg-orange-50">
          <Mail className="w-3.5 h-3.5" /> {propuesta.contacto_email}
        </a>
        {propuesta.contacto_telefono && (
          <a href={`tel:${propuesta.contacto_telefono}`} className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-orange-600 px-2 py-1 rounded-md hover:bg-orange-50">
            <Phone className="w-3.5 h-3.5" /> {propuesta.contacto_telefono}
          </a>
        )}
        <div className="ml-auto flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <><ChevronUp className="w-3.5 h-3.5" /> Ocultar</> : <><ChevronDown className="w-3.5 h-3.5" /> Detalles</>}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-red-400 hover:text-red-600"
            onClick={() => {
              if (confirm(`¿Eliminar la propuesta de ${propuesta.empresa}?`)) onDelete();
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Detalle expandido */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/50 p-4 space-y-4">
          {/* Paquetes */}
          <div>
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" /> Paquetes seleccionados ({paquetes.length})
            </p>
            <ul className="space-y-1.5">
              {paquetes.map((p, idx) => (
                <li key={idx} className="flex justify-between items-center bg-white rounded-lg px-3 py-2 text-sm border border-slate-100">
                  <span className="font-medium text-slate-800">{p.nombre}</span>
                  <span className="font-bold text-slate-900 flex items-center gap-1">
                    {p.precio === null || p.precio === undefined ? (
                      <span className="text-xs text-slate-500 italic">A convenir</span>
                    ) : (
                      <>{Number(p.precio).toLocaleString("es-ES")} <Euro className="w-3 h-3" /></>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Mensaje del contacto */}
          {propuesta.mensaje && (
            <div>
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> Mensaje del contacto
              </p>
              <div className="bg-white border-l-4 border-orange-400 rounded-lg p-3 text-sm text-slate-700 italic whitespace-pre-line">
                {propuesta.mensaje}
              </div>
            </div>
          )}

          {/* Notas internas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <StickyNote className="w-3.5 h-3.5" /> Notas internas
              </p>
              {!editingNotes && (
                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setEditingNotes(true)}>
                  Editar
                </Button>
              )}
            </div>
            {editingNotes ? (
              <div className="space-y-2">
                <Textarea
                  value={notasEdit}
                  onChange={(e) => setNotasEdit(e.target.value)}
                  placeholder="Apuntes sobre la conversación, condiciones acordadas, próximos pasos..."
                  rows={3}
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" className="bg-orange-600 hover:bg-orange-700 h-7 text-xs" onClick={handleSaveNotes}>Guardar</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setNotasEdit(propuesta.notas_internas || ""); setEditingNotes(false); }}>Cancelar</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-600 bg-white rounded-lg p-3 border border-slate-100 min-h-[40px]">
                {propuesta.notas_internas || <span className="text-slate-400 italic">Sin notas todavía</span>}
              </p>
            )}
          </div>

          {/* Link a la propuesta */}
          {propuesta.origen && (
            <a
              href={`/PropuestaGVCGaesco?empresa=${encodeURIComponent(propuesta.empresa)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-orange-600 hover:text-orange-700 font-semibold"
            >
              <ExternalLink className="w-3 h-3" /> Ver propuesta que recibieron
            </a>
          )}

          {/* Convertir propuesta aceptada en patrocinador */}
          {propuesta.estado === "aceptada" && onConvertToSponsor && (
            <Button
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={() => onConvertToSponsor({
                nombre: propuesta.empresa,
                contacto_nombre: propuesta.contacto_nombre,
                contacto_email: propuesta.contacto_email,
                contacto_telefono: propuesta.contacto_telefono || "",
                precio_anual: Number(propuesta.total_estimado || 0),
                nivel_patrocinio: "Principal",
                beneficios_acordados: paquetes.map((p) => p.nombre).join(", "),
              })}
            >
              <UserPlus className="w-4 h-4 mr-2" /> Crear patrocinador con estos datos
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default function PropuestasPatrocinioPanel({ onConvertToSponsor }) {
  const queryClient = useQueryClient();
  const [filterEstado, setFilterEstado] = useState("all");

  const { data: propuestas = [], isLoading } = useQuery({
    queryKey: ["propuestas-patrocinio"],
    queryFn: () => base44.entities.PropuestaPatrocinio.list("-created_date"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PropuestaPatrocinio.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["propuestas-patrocinio"] });
      toast.success("Propuesta actualizada");
    },
    onError: () => toast.error("Error al actualizar"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PropuestaPatrocinio.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["propuestas-patrocinio"] });
      toast.success("Propuesta eliminada");
    },
    onError: () => toast.error("Error al eliminar"),
  });

  if (isLoading) return <div className="text-center py-8 text-slate-400">Cargando propuestas...</div>;
  if (propuestas.length === 0) return null;

  const counts = {
    all: propuestas.length,
    nueva: propuestas.filter((p) => p.estado === "nueva").length,
    en_conversacion: propuestas.filter((p) => p.estado === "en_conversacion").length,
    aceptada: propuestas.filter((p) => p.estado === "aceptada").length,
    descartada: propuestas.filter((p) => p.estado === "descartada").length,
  };

  const filtered = filterEstado === "all" ? propuestas : propuestas.filter((p) => p.estado === filterEstado);

  return (
    <Card className="border-rose-200 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg flex-wrap">
          <Handshake className="w-5 h-5 text-rose-600" />
          Propuestas de Patrocinio Premium
          <Badge className="bg-rose-100 text-rose-700">{propuestas.length}</Badge>
          {counts.nueva > 0 && (
            <Badge className="bg-blue-500 text-white animate-pulse">
              {counts.nueva} sin atender
            </Badge>
          )}
        </CardTitle>
        <p className="text-xs text-slate-500 mt-1">
          Solicitudes recibidas desde las landings personalizadas (/PropuestaGVCGaesco, etc.). Manolo también las recibe por email — aquí las gestionas.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Filtros */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: "all", label: "Todas" },
            { key: "nueva", label: "🆕 Nuevas" },
            { key: "en_conversacion", label: "💬 En conversación" },
            { key: "aceptada", label: "✅ Aceptadas" },
            { key: "descartada", label: "❌ Descartadas" },
          ].map((f) => (
            <Button
              key={f.key}
              size="sm"
              variant={filterEstado === f.key ? "default" : "outline"}
              onClick={() => setFilterEstado(f.key)}
              className={`h-7 text-xs ${filterEstado === f.key ? "bg-rose-600 hover:bg-rose-700" : ""}`}
            >
              {f.label} ({counts[f.key]})
            </Button>
          ))}
        </div>

        {/* Lista de propuestas */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <p className="text-center text-slate-400 italic py-6 text-sm">Sin propuestas en este estado</p>
          ) : (
            filtered.map((propuesta) => (
              <PropuestaCard
                key={propuesta.id}
                propuesta={propuesta}
                onUpdate={(data) => updateMutation.mutate({ id: propuesta.id, data })}
                onDelete={() => deleteMutation.mutate(propuesta.id)}
                onConvertToSponsor={onConvertToSponsor}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
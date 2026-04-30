import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, Phone, Clock, Download, Search, MessageCircle, Trash2, Lock, Users } from "lucide-react";
import { toast } from "sonner";
import { TURNOS, countByTurno, isTurnoCompleto, getTurno } from "./turnosConfig";
import ShareWhatsAppButton from "./ShareWhatsAppButton.jsx";
import { buildVoluntariosText } from "./sanIsidroShareText";

const ESTADO_COLORS = {
  pendiente: "bg-orange-100 text-orange-800 border border-orange-300",
  contactado: "bg-blue-100 text-blue-800",
  confirmado: "bg-green-100 text-green-800",
  descartado: "bg-slate-200 text-slate-600",
};

const cleanPhone = (p) => (p || "").replace(/\D/g, "");

export default function VolunteersList() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("all");
  const [turnoFilter, setTurnoFilter] = useState("all");

  const { data: voluntarios = [], isLoading } = useQuery({
    queryKey: ["sanIsidroVoluntarios"],
    queryFn: () => base44.entities.SanIsidroVoluntario.list("-created_date", 500),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SanIsidroVoluntario.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sanIsidroVoluntarios"] }),
  });

  const handleDelete = async (v) => {
    const ok = window.confirm(`¿Borrar el voluntario ${v.nombre}?`);
    if (!ok) return;
    try {
      await base44.entities.SanIsidroVoluntario.delete(v.id);
      toast.success("Voluntario borrado");
      queryClient.invalidateQueries({ queryKey: ["sanIsidroVoluntarios"] });
    } catch {
      toast.error("No se pudo borrar");
    }
  };

  const turnoCounts = useMemo(() => countByTurno(voluntarios), [voluntarios]);

  const counts = useMemo(() => ({
    all: voluntarios.length,
    pendiente: voluntarios.filter(v => (v.estado || "pendiente") === "pendiente").length,
    contactado: voluntarios.filter(v => v.estado === "contactado").length,
    confirmado: voluntarios.filter(v => v.estado === "confirmado").length,
    descartado: voluntarios.filter(v => v.estado === "descartado").length,
  }), [voluntarios]);

  const filtered = useMemo(() => {
    let list = voluntarios;
    if (estadoFilter !== "all") {
      list = list.filter(v => (v.estado || "pendiente") === estadoFilter);
    }
    if (turnoFilter !== "all") {
      list = list.filter(v => v.turno === turnoFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(v =>
        (v.nombre || "").toLowerCase().includes(q) ||
        (v.telefono || "").toLowerCase().includes(q) ||
        (v.notas || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [voluntarios, estadoFilter, turnoFilter, search]);

  const exportCSV = () => {
    const source = filtered.length > 0 ? filtered : voluntarios;
    const headers = ["Nombre", "Teléfono", "Turno", "Horario", "Notas", "Estado", "Fecha"];
    const rows = source.map(v => {
      const t = getTurno(v.turno);
      return [
        v.nombre,
        v.telefono,
        t ? t.label : "(sin turno)",
        t ? t.horario : "",
        v.notas || "",
        v.estado || "pendiente",
        new Date(v.created_date).toLocaleString("es-ES"),
      ];
    });
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
          <div className="flex items-center gap-2 flex-wrap">
            <ShareWhatsAppButton
              label="Enviar por WhatsApp"
              count={(filtered.length > 0 ? filtered : voluntarios).length}
              buildText={() => buildVoluntariosText(filtered.length > 0 ? filtered : voluntarios)}
            />
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1">
              <Download className="w-4 h-4" /> CSV
            </Button>
          </div>
        )}
      </div>

      {/* Resumen de turnos con cupos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {TURNOS.map(t => {
          const ocupadas = turnoCounts[t.id] || 0;
          const completo = isTurnoCompleto(t, ocupadas);
          const pct = Math.min(100, Math.round((ocupadas / t.plazas) * 100));
          return (
            <Card
              key={t.id}
              onClick={() => setTurnoFilter(turnoFilter === t.id ? "all" : t.id)}
              className={`cursor-pointer transition-all ${turnoFilter === t.id ? "ring-2 ring-pink-500" : ""} ${completo ? "bg-slate-50" : ""}`}
            >
              <CardContent className="p-2.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-lg">{t.emoji}</span>
                  {completo && (
                    <Badge className="bg-slate-700 text-white text-[10px] gap-1 h-5">
                      <Lock className="w-2.5 h-2.5" /> COMPLETO
                    </Badge>
                  )}
                </div>
                <p className="text-xs font-bold text-slate-800 leading-tight">{t.label}</p>
                <p className="text-[10px] text-slate-500">{t.horario}</p>
                <div className="flex items-center gap-1 text-xs font-bold text-slate-700">
                  <Users className="w-3 h-3" />
                  {ocupadas}/{t.plazas}
                </div>
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${completo ? "bg-slate-500" : pct >= 75 ? "bg-orange-500" : "bg-green-500"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {voluntarios.length > 0 && (
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar por nombre, teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {voluntarios.length > 0 && (
        <Tabs value={estadoFilter} onValueChange={setEstadoFilter}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="all" className="text-xs">Todos ({counts.all})</TabsTrigger>
            <TabsTrigger value="pendiente" className="text-xs">⚠️ Pendientes ({counts.pendiente})</TabsTrigger>
            <TabsTrigger value="contactado" className="text-xs">📞 Contactados ({counts.contactado})</TabsTrigger>
            <TabsTrigger value="confirmado" className="text-xs">✅ Confirmados ({counts.confirmado})</TabsTrigger>
            <TabsTrigger value="descartado" className="text-xs">❌ Descartados ({counts.descartado})</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {voluntarios.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-slate-500">
            <Heart className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            No hay voluntarios apuntados todavía.
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-slate-500 text-sm">
            No hay voluntarios que coincidan con el filtro/búsqueda.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((v) => {
            const phone = cleanPhone(v.telefono);
            const estado = v.estado || "pendiente";
            const turno = getTurno(v.turno);
            return (
              <Card key={v.id} className={`border-l-4 ${estado === "pendiente" ? "border-l-orange-500" : estado === "confirmado" ? "border-l-green-500" : "border-l-pink-500"}`}>
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
                    {turno ? (
                      <Badge className="bg-pink-100 text-pink-800 border border-pink-300">
                        {turno.emoji} {turno.label} · {turno.horario}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-500">Sin turno</Badge>
                    )}
                  </div>

                  {v.notas && (
                    <p className="text-xs text-slate-600 bg-slate-50 rounded p-2 italic">📝 {v.notas}</p>
                  )}

                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <Badge className={ESTADO_COLORS[estado]}>{estado}</Badge>
                    <Select
                      value={estado}
                      onValueChange={(nuevo) => updateMutation.mutate({ id: v.id, data: { estado: nuevo } })}
                    >
                      <SelectTrigger className="h-7 text-xs w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendiente">Pendiente</SelectItem>
                        <SelectItem value="contactado">Contactado</SelectItem>
                        <SelectItem value="confirmado">Confirmado</SelectItem>
                        <SelectItem value="descartado">Descartado</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={v.turno || ""}
                      onValueChange={(nuevo) => updateMutation.mutate({ id: v.id, data: { turno: nuevo } })}
                    >
                      <SelectTrigger className="h-7 text-xs w-36">
                        <SelectValue placeholder="Turno" />
                      </SelectTrigger>
                      <SelectContent>
                        {TURNOS.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.emoji} {t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {phone && (
                      <a href={`https://wa.me/34${phone}`} target="_blank" rel="noreferrer" className="ml-auto">
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-green-500 text-green-700 hover:bg-green-50">
                          <MessageCircle className="w-3 h-3" /> WhatsApp
                        </Button>
                      </a>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(v)}
                      className="h-7 text-xs gap-1 border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
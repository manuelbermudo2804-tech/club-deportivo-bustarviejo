import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Download, Heart, Search } from "lucide-react";
import { toast } from "sonner";
import VolunteersList from "../components/sanisidro/VolunteersList.jsx";
import RegistrationCard from "../components/sanisidro/RegistrationCard.jsx";
import ShareWhatsAppButton from "../components/sanisidro/ShareWhatsAppButton.jsx";
import DuplicatesAlert from "../components/sanisidro/DuplicatesAlert.jsx";
import SuspiciousDevicesPanel from "../components/sanisidro/SuspiciousDevicesPanel.jsx";
import { buildInscripcionesText } from "../components/sanisidro/sanIsidroShareText";

const MODALIDADES = [
  "Fútbol Chapa - Niños/Jóvenes",
  "Fútbol Chapa - Adultos",
  "3 para 3 (7-10 años)",
  "3 para 3 (11-15 años)",
];

export default function SanIsidroAdmin() {
  const [section, setSection] = useState("inscripciones");
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ["sanIsidroRegistrations"],
    queryFn: () => base44.entities.SanIsidroRegistration.list("-created_date", 500),
  });

  const { data: voluntarios = [] } = useQuery({
    queryKey: ["sanIsidroVoluntariosCount"],
    queryFn: () => base44.entities.SanIsidroVoluntario.list("-created_date", 500),
  });

  const filtered = useMemo(() => {
    let list = tab === "all" ? registrations : registrations.filter(r => r.modalidad === tab);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(r =>
        (r.nombre_responsable || "").toLowerCase().includes(q) ||
        (r.telefono_responsable || "").toLowerCase().includes(q) ||
        (r.email_responsable || "").toLowerCase().includes(q) ||
        (r.jugador_nombre || "").toLowerCase().includes(q) ||
        (r.nombre_equipo || "").toLowerCase().includes(q) ||
        (r.jugador_1 || "").toLowerCase().includes(q) ||
        (r.jugador_2 || "").toLowerCase().includes(q) ||
        (r.jugador_3 || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [registrations, tab, search]);

  const countByMod = (mod) => registrations.filter(r => r.modalidad === mod).length;
  const isChapa = (mod) => mod?.startsWith("Fútbol Chapa");

  const handleDelete = async (reg) => {
    const ok = window.confirm(`¿Borrar la inscripción de ${reg.nombre_responsable}?\n\nEsta acción no se puede deshacer.`);
    if (!ok) return;
    try {
      await base44.entities.SanIsidroRegistration.delete(reg.id);
      toast.success("Inscripción borrada");
      queryClient.invalidateQueries({ queryKey: ["sanIsidroRegistrations"] });
    } catch {
      toast.error("No se pudo borrar la inscripción");
    }
  };

  const exportCSV = () => {
    const source = filtered.length > 0 ? filtered : registrations;
    const headers = ["Modalidad", "Responsable", "Teléfono", "Email", "Jugador/Equipo", "Jugador 1", "Jugador 2", "Jugador 3", "Notas", "Fecha"];
    const rows = source.map(r => [
      r.modalidad,
      r.nombre_responsable,
      r.telefono_responsable,
      r.email_responsable || "",
      isChapa(r.modalidad) ? r.jugador_nombre : r.nombre_equipo,
      r.jugador_1 || "",
      r.jugador_2 || "",
      r.jugador_3 || "",
      r.notas || "",
      new Date(r.created_date).toLocaleString("es-ES"),
    ]);
    const csv = [headers, ...rows].map(row => row.map(c => `"${(c || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inscripciones_san_isidro_2026.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 p-3 sm:p-5 lg:p-6">
      <div className="rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-orange-900 p-5 sm:p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-500/20 text-orange-300 ring-1 ring-orange-400/30">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">San Isidro 2027</h1>
              <p className="mt-1 text-sm text-slate-300">Gestión de inscripciones y voluntariado de las fiestas</p>
              <p className="mt-2 text-xs text-orange-200">Fútbol Chapa · Torneos 3×3 · Equipo de voluntarios</p>
            </div>
          </div>
          {section === "inscripciones" && (
            <div className="flex flex-wrap items-center gap-2">
            <ShareWhatsAppButton
              label="Enviar por WhatsApp"
              count={(filtered.length > 0 ? filtered : registrations).length}
              buildText={() => buildInscripcionesText(filtered.length > 0 ? filtered : registrations)}
            />
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
              <Download className="w-4 h-4" /> Exportar CSV
            </Button>
          </div>
          )}
        </div>
      </div>

      {/* Selector sección */}
      <Tabs value={section} onValueChange={setSection}>
        <TabsList className="grid h-auto w-full grid-cols-2 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <TabsTrigger value="inscripciones" className="flex-1 gap-1">
            <Trophy className="w-4 h-4" /> Inscripciones ({registrations.length})
          </TabsTrigger>
          <TabsTrigger value="voluntarios" className="flex-1 gap-1">
            <Heart className="w-4 h-4" /> Voluntarios ({voluntarios.length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {section === "voluntarios" ? (
        <VolunteersList />
      ) : (
        <>
          {/* Resumen */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {MODALIDADES.map(mod => (
              <Card key={mod} className={`cursor-pointer rounded-xl border bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md ${tab === mod ? "border-orange-400 ring-1 ring-orange-200" : "border-slate-200"}`} onClick={() => setTab(mod)}>
                <CardContent className="p-3 sm:p-4 text-center">
                  <p className="text-2xl font-black text-orange-600">{countByMod(mod)}</p>
                  <p className="text-xs text-slate-600 font-medium leading-tight">{mod}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <span>Total inscripciones:</span>
                <Badge className="bg-red-600 text-white">{registrations.length}</Badge>
                {(search || tab !== "all") && (
                  <Badge variant="outline" className="ml-auto">Mostrando: {filtered.length}</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <DuplicatesAlert registrations={registrations} voluntarios={voluntarios} />

          <SuspiciousDevicesPanel registrations={registrations} voluntarios={voluntarios} />

          {/* Buscador */}
          <div className="relative rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <Search className="w-4 h-4 absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar por nombre, teléfono, email, equipo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 border-slate-200 focus-visible:ring-orange-500"
            />
          </div>

          {/* Filtros */}
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="flex h-auto flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-2">
              <TabsTrigger value="all" className="text-xs">Todas ({registrations.length})</TabsTrigger>
              {MODALIDADES.map(mod => (
                <TabsTrigger key={mod} value={mod} className="text-xs">
                  {mod.replace("Fútbol Chapa - ", "Chapa ").replace("3 para 3 ", "3×3 ")} ({countByMod(mod)})
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Listado */}
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto" />
            </div>
          ) : filtered.length === 0 ? (
            <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <CardContent className="p-8 text-center text-slate-500">
                {search ? "No se encontraron inscripciones con esa búsqueda." : `No hay inscripciones${tab !== "all" ? " en esta categoría" : ""} todavía.`}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filtered.map((reg) => (
                <RegistrationCard key={reg.id} reg={reg} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
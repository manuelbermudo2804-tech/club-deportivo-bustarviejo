import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trophy, Users, Phone, Mail, Clock, Download } from "lucide-react";

const MODALIDADES = [
  "Fútbol Chapa - Niños/Jóvenes",
  "Fútbol Chapa - Adultos",
  "3 para 3 (7-10 años)",
  "3 para 3 (11-15 años)",
];

export default function SanIsidroAdmin() {
  const [tab, setTab] = useState("all");

  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ["sanIsidroRegistrations"],
    queryFn: () => base44.entities.SanIsidroRegistration.list("-created_date", 500),
  });

  const filtered = tab === "all" ? registrations : registrations.filter(r => r.modalidad === tab);

  const countByMod = (mod) => registrations.filter(r => r.modalidad === mod).length;

  const isChapa = (mod) => mod?.startsWith("Fútbol Chapa");

  const exportCSV = () => {
    const headers = ["Modalidad", "Responsable", "Teléfono", "Email", "Jugador/Equipo", "Jugador 1", "Jugador 2", "Jugador 3", "Notas", "Fecha"];
    const rows = registrations.map(r => [
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
    <div className="p-4 lg:p-6 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            🎉 San Isidro 2026
          </h1>
          <p className="text-slate-500 text-sm">Inscripciones a los torneos deportivos</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1">
          <Download className="w-4 h-4" /> Exportar CSV
        </Button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {MODALIDADES.map(mod => (
          <Card key={mod} className="cursor-pointer hover:border-orange-300 transition-colors" onClick={() => setTab(mod)}>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-black text-orange-600">{countByMod(mod)}</p>
              <p className="text-xs text-slate-600 font-medium leading-tight">{mod}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <span>Total inscripciones:</span>
            <Badge className="bg-red-600 text-white">{registrations.length}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="all" className="text-xs">Todas ({registrations.length})</TabsTrigger>
          {MODALIDADES.map(mod => (
            <TabsTrigger key={mod} value={mod} className="text-xs">{mod.replace("Fútbol Chapa - ", "Chapa ").replace("3 para 3 ", "3×3 ")} ({countByMod(mod)})</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Listado */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-slate-500">
            No hay inscripciones{tab !== "all" ? " en esta categoría" : ""} todavía.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((reg) => (
            <RegistrationCard key={reg.id} reg={reg} />
          ))}
        </div>
      )}
    </div>
  );
}

function RegistrationCard({ reg }) {
  const isChapa = reg.modalidad?.startsWith("Fútbol Chapa");
  const colorClass = isChapa ? "border-l-orange-500" : "border-l-green-500";

  return (
    <Card className={`border-l-4 ${colorClass}`}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Badge className={isChapa ? "bg-orange-100 text-orange-800" : "bg-green-100 text-green-800"}>
              {isChapa ? <Trophy className="w-3 h-3 mr-1" /> : <Users className="w-3 h-3 mr-1" />}
              {reg.modalidad}
            </Badge>
          </div>
          <span className="text-xs text-slate-400 flex items-center gap-1 whitespace-nowrap">
            <Clock className="w-3 h-3" />
            {new Date(reg.created_date).toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        <div className="text-sm">
          <p className="font-bold text-slate-800">{reg.nombre_responsable}</p>
          <div className="flex flex-wrap items-center gap-3 text-slate-500 text-xs mt-1">
            <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{reg.telefono_responsable}</span>
            {reg.email_responsable && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{reg.email_responsable}</span>}
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

        {reg.notas && (
          <p className="text-xs text-slate-500 italic">📝 {reg.notas}</p>
        )}
      </CardContent>
    </Card>
  );
}
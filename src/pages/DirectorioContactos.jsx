import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download, Users } from "lucide-react";
import { buildDirectorioContactos } from "@/lib/buildDirectorioContactos";
import DirectorioTabla from "@/components/directorio/DirectorioTabla";
import DirectorioFiltros from "@/components/directorio/DirectorioFiltros";

export default function DirectorioContactos() {
  const [busqueda, setBusqueda] = useState("");
  const [origen, setOrigen] = useState("todos");
  const [consent, setConsent] = useState("todos");

  const { data: contactos = [], isLoading } = useQuery({
    queryKey: ["directorio-contactos"],
    queryFn: buildDirectorioContactos,
    staleTime: 5 * 60 * 1000,
  });

  const origenes = useMemo(() => {
    const set = new Set();
    contactos.forEach((c) => c.origenes.forEach((o) => set.add(o)));
    return Array.from(set).sort();
  }, [contactos]);

  const q = busqueda.trim().toLowerCase();
  const filtrados = contactos.filter((c) => {
    if (origen !== "todos" && !c.origenes.includes(origen)) return false;
    const tiene = c.acepta_promociones || c.acepta_patrocinadores;
    if (consent === "si" && !tiene) return false;
    if (consent === "no" && tiene) return false;
    if (!q) return true;
    return [c.nombre, c.email, c.telefono, ...c.detalles]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  const conConsentimiento = contactos.filter((c) => c.acepta_promociones || c.acepta_patrocinadores).length;

  const exportarCSV = () => {
    const cabecera = ["Nombre", "Email", "Teléfono", "Procedencia", "Detalle", "Consentimiento"];
    const filas = filtrados.map((c) => [
      c.nombre,
      c.email,
      c.telefono,
      c.origenes.join(" / "),
      c.detalles.join(" · "),
      c.acepta_promociones || c.acepta_patrocinadores ? "Sí" : "No",
    ]);
    const csv = [cabecera, ...filas]
      .map((f) => f.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `directorio-contactos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="flex items-center gap-2">
          <Users className="w-7 h-7 text-orange-600" />
          Directorio de contactos
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Todas las personas registradas en la app (familias, jugadores, socios, porra e inscripciones
          web), sin duplicados. Para uso interno del club: solo puedes hacer comunicación comercial a
          quien ha dado su consentimiento.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-3xl font-bold text-slate-900">{contactos.length}</p>
            <p className="text-xs text-slate-500 mt-1">Personas distintas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-3xl font-bold text-green-700">{conConsentimiento}</p>
            <p className="text-xs text-slate-500 mt-1">Con consentimiento comercial</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-lg">Listado ({filtrados.length})</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Buscar nombre, email, teléfono..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-9 w-full sm:w-64"
                />
              </div>
              <Button variant="outline" onClick={exportarCSV} disabled={filtrados.length === 0}>
                <Download className="w-4 h-4 mr-2" /> Exportar
              </Button>
            </div>
          </div>
          <DirectorioFiltros
            origenes={origenes}
            activo={origen}
            onChange={setOrigen}
            consent={consent}
            onConsentChange={setConsent}
          />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-slate-500 text-sm">Reuniendo contactos...</div>
          ) : (
            <DirectorioTabla contactos={filtrados} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
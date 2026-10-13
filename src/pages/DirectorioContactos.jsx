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
    <div className="mx-auto w-full max-w-[1600px] space-y-5 p-3 sm:p-5 lg:p-6">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-md sm:p-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15 sm:h-14 sm:w-14">
            <Users className="h-6 w-6 text-orange-400 sm:h-7 sm:w-7" />
          </div>
          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-orange-300 sm:text-xs">Base de datos de contactos</p>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Directorio de contactos</h1>
            <p className="mt-1 max-w-4xl text-sm leading-relaxed text-slate-300">Personas de familias, jugadores, socios, inscripciones, web, voluntariado y patrocinadores, agrupadas sin duplicados. El uso comercial requiere consentimiento específico.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <CardContent className="flex items-center justify-between gap-3 p-4 sm:p-5">
            <div>
              <p className="text-sm font-medium text-slate-500">Personas distintas</p>
              <p className="mt-1 text-3xl font-black tracking-tight text-slate-900">{contactos.length}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Users className="h-5 w-5" /></div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <CardContent className="flex items-center justify-between gap-3 p-4 sm:p-5">
            <div>
              <p className="text-sm font-medium text-slate-500">Con consentimiento comercial</p>
              <p className="mt-1 text-3xl font-black tracking-tight text-emerald-700">{conConsentimiento}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><ShieldCheck className="h-5 w-5" /></div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <CardHeader className="space-y-4 border-b border-slate-100 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">Listado de contactos</CardTitle>
              <p className="mt-1 text-sm text-slate-500">Mostrando {filtrados.length} de {contactos.length} personas</p>
            </div>
            <Button variant="outline" onClick={exportarCSV} disabled={filtrados.length === 0} className="h-11 w-full rounded-xl border-slate-200 sm:w-auto">
              <Download className="mr-2 h-4 w-4" /> Exportar listado
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Buscar nombre, email, teléfono..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="h-11 w-full rounded-xl border-slate-200 bg-slate-50 pl-9"
                />
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
        <CardContent className="p-3 sm:p-5">
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
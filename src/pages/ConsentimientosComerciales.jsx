import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, Search, ShieldCheck } from "lucide-react";
import ConsentimientosStats from "@/components/consent/ConsentimientosStats";
import ConsentimientosTabla from "@/components/consent/ConsentimientosTabla";

export default function ConsentimientosComerciales() {
  const [busqueda, setBusqueda] = useState("");
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["consentimientos"],
    queryFn: () => base44.entities.ConsentimientoComercial.list("-fecha", 1000),
  });

  const cambiarEstado = useMutation({
    mutationFn: ({ id, revocado }) =>
      base44.entities.ConsentimientoComercial.update(id, {
        revocado,
        fecha_revocacion: revocado ? new Date().toISOString() : null,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["consentimientos"] }),
  });

  const q = busqueda.trim().toLowerCase();
  const filtrados = q
    ? items.filter((c) =>
        [c.nombre, c.email, c.telefono, c.origen]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(q))
      )
    : items;

  const exportarCSV = () => {
    const cabecera = ["Nombre", "Email", "Teléfono", "Origen", "Promociones club", "Patrocinadores", "Fecha", "Estado"];
    const filas = filtrados.map((c) => [
      c.nombre || "",
      c.email || "",
      c.telefono || "",
      c.origen || "",
      c.acepta_promociones ? "Sí" : "No",
      c.acepta_patrocinadores ? "Sí" : "No",
      c.fecha ? new Date(c.fecha).toLocaleDateString("es-ES") : "",
      c.revocado ? "Baja" : "Activo",
    ]);
    const csv = [cabecera, ...filas]
      .map((f) => f.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `consentimientos-comerciales-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 p-3 sm:p-5 lg:p-6">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-md sm:p-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15 sm:h-14 sm:w-14">
            <ShieldCheck className="h-6 w-6 text-orange-400 sm:h-7 sm:w-7" />
          </div>
          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-orange-300 sm:text-xs">Privacidad y comunicaciones</p>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Consentimientos comerciales</h1>
            <p className="mt-1 text-sm text-slate-300">Consulta y gestiona las autorizaciones de comunicación de cada persona</p>
          </div>
        </div>
      </div>

      <ConsentimientosStats items={items} />

      <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex flex-col items-stretch justify-between gap-3 border-b border-slate-100 sm:flex-row sm:items-center sm:flex-wrap">
          <CardTitle className="text-lg">Listado ({filtrados.length})</CardTitle>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar por nombre, email u origen..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="h-11 w-full rounded-xl border-slate-200 bg-slate-50 pl-9 sm:w-72"
              />
            </div>
            <Button variant="outline" onClick={exportarCSV} disabled={filtrados.length === 0} className="h-11 w-full rounded-xl border-slate-200 sm:w-auto">
              <Download className="w-4 h-4 mr-2" /> Exportar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-5">
          {isLoading ? (
            <div className="py-12 text-center text-slate-500 text-sm">Cargando...</div>
          ) : (
            <ConsentimientosTabla
              items={filtrados}
              onRevocar={(c) => cambiarEstado.mutate({ id: c.id, revocado: true })}
              onReactivar={(c) => cambiarEstado.mutate({ id: c.id, revocado: false })}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
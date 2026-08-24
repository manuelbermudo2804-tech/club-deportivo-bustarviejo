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
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="flex items-center gap-2">
          <ShieldCheck className="w-7 h-7 text-green-600" />
          Consentimientos comerciales
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Personas que han autorizado expresamente recibir comunicaciones. Solo puedes usar esta
          lista para lo que cada una aceptó.
        </p>
      </div>

      <ConsentimientosStats items={items} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-lg">Listado ({filtrados.length})</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar por nombre, email u origen..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-9 w-full sm:w-72"
              />
            </div>
            <Button variant="outline" onClick={exportarCSV} disabled={filtrados.length === 0}>
              <Download className="w-4 h-4 mr-2" /> Exportar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
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
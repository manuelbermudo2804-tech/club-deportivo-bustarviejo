import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Users } from "lucide-react";

// Agrupa los errores de los últimos 7 días por mensaje, para detectar
// problemas reales sin depender de que nadie escriba feedback.
export default function ErroresAgrupados() {
  const { data: grupos = [], isLoading } = useQuery({
    queryKey: ["erroresAgrupados"],
    queryFn: async () => {
      const [app, js] = await Promise.all([
        base44.entities.UploadDiagnostic.filter({ event_type: "app_error" }, "-created_date", 300),
        base44.entities.UploadDiagnostic.filter({ event_type: "js_error" }, "-created_date", 300),
      ]);
      const desde = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const recientes = [...app, ...js].filter((e) => new Date(e.created_date).getTime() > desde);

      const mapa = {};
      for (const e of recientes) {
        const clave = (e.error_message || "(sin mensaje)").slice(0, 120);
        if (!mapa[clave]) {
          mapa[clave] = { mensaje: clave, total: 0, usuarios: new Set(), paginas: new Set(), ultima: e.created_date };
        }
        const g = mapa[clave];
        g.total += 1;
        if (e.user_email) g.usuarios.add(e.user_email);
        if (e.page_path) g.paginas.add(e.page_path);
        if (new Date(e.created_date) > new Date(g.ultima)) g.ultima = e.created_date;
      }

      return Object.values(mapa)
        .map((g) => ({ ...g, usuarios: g.usuarios.size, paginas: [...g.paginas].slice(0, 3) }))
        .sort((a, b) => b.usuarios - a.usuarios || b.total - a.total)
        .slice(0, 8);
    },
    staleTime: 60000,
  });

  return (
    <Card className="border-red-200">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          Problemas detectados automáticamente (7 días)
        </CardTitle>
        <p className="text-xs text-slate-500">
          Errores que ha dado la app, agrupados. No dependen de que nadie los reporte.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-slate-400 py-4 text-center">Cargando...</p>
        ) : grupos.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">✅ Sin errores en los últimos 7 días</p>
        ) : (
          <div className="space-y-2">
            {grupos.map((g) => (
              <div key={g.mensaje} className="border border-red-100 bg-red-50/50 rounded-xl p-3">
                <p className="text-sm font-medium text-slate-900 break-words">{g.mensaje}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {g.usuarios} {g.usuarios === 1 ? "usuario" : "usuarios"}
                  </Badge>
                  <Badge variant="outline" className="text-xs">{g.total} veces</Badge>
                  {g.paginas.map((p) => (
                    <Badge key={p} variant="outline" className="text-xs">📍 {p}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
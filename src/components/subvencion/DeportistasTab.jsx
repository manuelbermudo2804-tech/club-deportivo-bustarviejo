import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Loader2, AlertTriangle } from "lucide-react";
import { seasonRange } from "@/components/subvencion/expedienteConfig";
import { downloadExcel } from "@/components/subvencion/exportExcel";
import IndicadorCard from "@/components/subvencion/IndicadorCard";

const edadEn = (nac, fecha) => {
  if (!nac) return null;
  const n = new Date(nac), f = new Date(fecha);
  let e = f.getFullYear() - n.getFullYear();
  if (f < new Date(f.getFullYear(), n.getMonth(), n.getDate())) e--;
  return e;
};
const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();

export default function DeportistasTab({ temporada }) {
  const [players, setPlayers] = useState(null);
  const [ligas, setLigas] = useState(0);

  useEffect(() => {
    base44.entities.Player.filter({ activo: true }, "nombre", 2000).then(setPlayers);
    base44.entities.CategoryConfig.filter({ compite_en_liga: true, activa: true }, "nombre", 200)
      .then((c) => setLigas(new Set(c.map((x) => x.nombre)).size));
  }, [temporada]);

  const data = useMemo(() => {
    if (!players) return null;
    const inicio = `${seasonRange(temporada).inicio}-09-01`;
    const rows = players.map((p) => {
      const edad = edadEn(p.fecha_nacimiento, inicio);
      return { nombre: p.nombre, categoria: p.categoria_principal || p.deporte || "Sin categoría", anio: p.fecha_nacimiento?.slice(0, 4) || "", menor: edad !== null && edad < 18 };
    });
    const porCat = {};
    rows.forEach((r) => { (porCat[r.categoria] = porCat[r.categoria] || []).push(r); });
    const vistos = {}, duplicados = [];
    rows.forEach((r) => { const k = norm(r.nombre); if (vistos[k]) duplicados.push(r.nombre); vistos[k] = true; });
    return { rows, porCat, menores: rows.filter((r) => r.menor).length, duplicados };
  }, [players, temporada]);

  if (!data) return <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-orange-500" /></div>;

  const exportar = () => downloadExcel(`Listado_inscritos_${temporada}.xlsx`, [{
    name: "Inscritos",
    rows: Object.keys(data.porCat).sort().flatMap((cat) => data.porCat[cat].map((r, i) => ({ "Categoría": cat, "Nº": i + 1, "Nombre y apellidos": r.nombre, "Año nacimiento": r.anio, "Menor de edad": r.menor ? "Sí" : "No" }))),
  }, {
    name: "Indicadores",
    rows: [{ "Temporada": temporada, "Deportistas": data.rows.length, "Menores de 18": data.menores, "Mayores de edad": data.rows.length - data.menores, "Categorías": Object.keys(data.porCat).length, "Equipos en competición federada": ligas }],
  }]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <IndicadorCard label="Deportistas" value={data.rows.length} />
        <IndicadorCard label="Menores de 18" value={data.menores} />
        <IndicadorCard label="Categorías" value={Object.keys(data.porCat).length} />
        <IndicadorCard label="Equipos en liga federada" value={ligas} />
      </div>
      <p className="text-xs text-slate-500">Una sola fuente para todos los documentos: usa estas mismas cifras en las memorias. El listado no incluye DNI ni datos de contacto.</p>
      {data.duplicados.length > 0 && (
        <p className="text-sm text-amber-700 flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Nombres repetidos (revísalos): {data.duplicados.join(", ")}</p>
      )}
      <Button onClick={exportar} className="bg-orange-600 hover:bg-orange-700"><Download className="w-4 h-4 mr-2" /> Descargar listado de inscritos (Excel)</Button>
      <div className="grid md:grid-cols-2 gap-3">
        {Object.keys(data.porCat).sort().map((cat) => (
          <Card key={cat} className="rounded-xl">
            <CardContent className="p-3">
              <p className="font-semibold text-sm text-slate-800 mb-1">{cat} · {data.porCat[cat].length}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{data.porCat[cat].map((r) => r.nombre).join(" · ")}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
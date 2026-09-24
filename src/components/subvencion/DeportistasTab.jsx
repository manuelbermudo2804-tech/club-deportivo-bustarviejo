import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Loader2, AlertTriangle, FileText, Lock, RefreshCw } from "lucide-react";
import { generarListadoInscritosPdf } from "@/components/subvencion/listadoInscritosPdf";
import { seasonRange, normSeason, fmtDate } from "@/components/subvencion/expedienteConfig";
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

export default function DeportistasTab({ exp, updateExp }) {
  const temporada = exp.temporada;
  const [rows, setRows] = useState(null);
  const [ligas, setLigas] = useState(0);
  const [esActiva, setEsActiva] = useState(false);
  const [generando, setGenerando] = useState(false);

  useEffect(() => {
    (async () => {
      const [activa] = await base44.entities.SeasonConfig.filter({ activa: true });
      const actual = normSeason(activa?.temporada) === normSeason(temporada);
      setEsActiva(actual);
      if (!actual) {
        setRows(exp.deportistas_snapshot || []);
        setLigas(exp.snapshot_ligas || 0);
        return;
      }
      // Temporada en curso: listado en vivo, y se guarda la foto en el expediente
      const [players, cats] = await Promise.all([
        base44.entities.Player.filter({ activo: true }, "nombre", 2000),
        base44.entities.CategoryConfig.filter({ compite_en_liga: true, activa: true }, "nombre", 200),
      ]);
      const inicio = `${seasonRange(temporada).inicio}-09-01`;
      const live = players.map((p) => {
        const edad = edadEn(p.fecha_nacimiento, inicio);
        return { nombre: p.nombre, categoria: p.categoria_principal || p.deporte || "Sin categoría", nacimiento: p.fecha_nacimiento || "", dni: (p.dni_jugador || "").toUpperCase(), menor: edad !== null && edad < 18 };
      });
      const nLigas = new Set(cats.map((x) => x.nombre)).size;
      setRows(live);
      setLigas(nLigas);
      if (JSON.stringify(live) !== JSON.stringify(exp.deportistas_snapshot || []) || nLigas !== exp.snapshot_ligas) {
        updateExp({ deportistas_snapshot: live, snapshot_ligas: nLigas, snapshot_fecha: new Date().toISOString() });
      }
    })();
  }, [temporada]);

  const data = useMemo(() => {
    if (!rows) return null;
    const porCat = {};
    rows.forEach((r) => { (porCat[r.categoria] = porCat[r.categoria] || []).push(r); });
    const vistos = {}, duplicados = [];
    rows.forEach((r) => { const k = norm(r.nombre); if (vistos[k]) duplicados.push(r.nombre); vistos[k] = true; });
    return { porCat, menores: rows.filter((r) => r.menor).length, duplicados, sinDni: rows.filter((r) => !r.dni).length };
  }, [rows]);

  if (!data) return <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-orange-500" /></div>;

  if (!rows.length) {
    return <p className="text-center text-slate-500 py-10">Esta temporada no tiene listado guardado. Se rellenará solo cuando sea la temporada activa del club.</p>;
  }

  const exportarPdf = async () => {
    setGenerando(true);
    await generarListadoInscritosPdf({ temporada, porCat: data.porCat, total: rows.length, menores: data.menores });
    setGenerando(false);
  };

  const exportar = () => downloadExcel(`Listado_inscritos_${temporada}.xlsx`, [{
    name: "Inscritos",
    rows: Object.keys(data.porCat).sort().flatMap((cat) => data.porCat[cat].map((r, i) => ({ "Categoría": cat, "Nº": i + 1, "Nombre y apellidos": r.nombre, "Fecha nacimiento": r.nacimiento, "DNI / NIE": r.dni, "Menor de edad": r.menor ? "Sí" : "No" }))),
  }, {
    name: "Indicadores",
    rows: [{ "Temporada": temporada, "Deportistas": rows.length, "Menores de 18": data.menores, "Mayores de edad": rows.length - data.menores, "Categorías": Object.keys(data.porCat).length, "Equipos en competición federada": ligas }],
  }]);

  return (
    <div className="space-y-4">
      <div className={`text-xs rounded-lg px-3 py-2 flex items-center gap-2 ${esActiva ? "bg-green-50 text-green-800" : "bg-slate-100 text-slate-700"}`}>
        {esActiva ? <RefreshCw className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
        {esActiva
          ? "Temporada en curso: el listado se actualiza solo con cada nueva inscripción y queda guardado en el expediente."
          : `Listado guardado de la temporada${exp.snapshot_fecha ? ` (última actualización ${fmtDate(exp.snapshot_fecha)})` : ""}. Ya no cambia aunque se resetee o se inscriban jugadores nuevos.`}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <IndicadorCard label="Deportistas" value={rows.length} />
        <IndicadorCard label="Menores de 18" value={data.menores} />
        <IndicadorCard label="Categorías" value={Object.keys(data.porCat).length} />
        <IndicadorCard label="Equipos en liga federada" value={ligas} />
      </div>
      <p className="text-xs text-slate-500">Una sola fuente para todos los documentos: usa estas mismas cifras en las memorias. El listado incluye nombre, fecha de nacimiento y DNI (sin datos de contacto).</p>
      {data.sinDni > 0 && <p className="text-xs text-amber-700">{data.sinDni} deportistas no tienen DNI en su ficha (aparecerán con «—»).</p>}
      {data.duplicados.length > 0 && (
        <p className="text-sm text-amber-700 flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Nombres repetidos (revísalos): {data.duplicados.join(", ")}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button onClick={exportarPdf} disabled={generando} className="bg-green-700 hover:bg-green-800">
          {generando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />} Descargar listado en PDF
        </Button>
        <Button onClick={exportar} variant="outline"><Download className="w-4 h-4 mr-2" /> Excel</Button>
      </div>
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
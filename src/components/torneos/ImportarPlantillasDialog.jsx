import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Loader2 } from "lucide-react";

// Lee un fichero Excel/CSV y devuelve filas como arrays.
function leerFichero(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// Detecta la columna según la cabecera.
function detectarColumnas(cabecera) {
  const norm = (s) => String(s || "").trim().toLowerCase();
  let colEquipo = -1, colJugador = -1, colDorsal = -1;
  cabecera.forEach((c, i) => {
    const n = norm(c);
    if (colEquipo === -1 && (n.includes("equipo") || n.includes("club"))) colEquipo = i;
    else if (colJugador === -1 && (n.includes("jugador") || n.includes("nombre"))) colJugador = i;
    else if (colDorsal === -1 && (n.includes("dorsal") || n === "#" || n.includes("numero") || n.includes("número"))) colDorsal = i;
  });
  return { colEquipo, colJugador, colDorsal };
}

export default function ImportarPlantillasDialog({ open, onOpenChange, torneo, categoria, equipos, onDone }) {
  const [procesando, setProcesando] = useState(false);

  const equiposCat = equipos.filter((e) => e.categoria_id === categoria.id);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setProcesando(true);
    try {
      const rows = await leerFichero(file);
      if (rows.length < 2) {
        toast.error("El fichero está vacío o no tiene datos");
        return;
      }
      const { colEquipo, colJugador, colDorsal } = detectarColumnas(rows[0]);
      if (colEquipo === -1 || colJugador === -1) {
        toast.error("No encuentro columnas 'Equipo' y 'Jugador'. Revisa las cabeceras.");
        return;
      }

      // Mapa de equipos existentes por nombre (normalizado)
      const norm = (s) => String(s || "").trim().toLowerCase();
      const equiposMap = {};
      equiposCat.forEach((eq) => { equiposMap[norm(eq.nombre)] = eq.id; });

      // Recorrer filas, crear equipos nuevos si hace falta
      const filas = rows.slice(1)
        .map((r) => ({
          equipo: String(r[colEquipo] || "").trim(),
          jugador: String(r[colJugador] || "").trim(),
          dorsal: colDorsal !== -1 ? String(r[colDorsal] || "").trim() : "",
        }))
        .filter((f) => f.equipo && f.jugador);

      if (filas.length === 0) {
        toast.error("No hay filas válidas (necesito equipo y jugador en cada fila)");
        return;
      }

      // Crear equipos que aún no existen
      const nombresEquipos = [...new Set(filas.map((f) => f.equipo))];
      let equiposCreados = 0;
      for (const nombre of nombresEquipos) {
        if (!equiposMap[norm(nombre)]) {
          const nuevo = await base44.entities.TorneoEquipo.create({
            torneo_id: torneo.id,
            categoria_id: categoria.id,
            nombre,
          });
          equiposMap[norm(nombre)] = nuevo.id;
          equiposCreados++;
        }
      }

      // Crear todos los jugadores de golpe
      const jugadores = filas.map((f) => ({
        torneo_id: torneo.id,
        categoria_id: categoria.id,
        equipo_id: equiposMap[norm(f.equipo)],
        nombre: f.jugador,
        dorsal: f.dorsal,
      }));
      await base44.entities.TorneoJugador.bulkCreate(jugadores);

      toast.success(`${jugadores.length} jugadores importados${equiposCreados ? ` · ${equiposCreados} equipos nuevos` : ""}`);
      onDone?.();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Error al leer el fichero");
    } finally {
      setProcesando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            Importar plantillas desde Excel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600 space-y-2">
            <p className="font-medium text-slate-800">Formato del fichero (Excel o CSV):</p>
            <p>La primera fila son las cabeceras. Necesita al menos estas columnas:</p>
            <div className="bg-white rounded border overflow-hidden text-xs">
              <div className="grid grid-cols-3 font-semibold bg-slate-100 border-b">
                <span className="px-2 py-1 border-r">Equipo</span>
                <span className="px-2 py-1 border-r">Dorsal</span>
                <span className="px-2 py-1">Jugador</span>
              </div>
              <div className="grid grid-cols-3 border-b">
                <span className="px-2 py-1 border-r">Real Madrid</span>
                <span className="px-2 py-1 border-r">10</span>
                <span className="px-2 py-1">Modric</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="px-2 py-1 border-r">Barça</span>
                <span className="px-2 py-1 border-r">8</span>
                <span className="px-2 py-1">Pedri</span>
              </div>
            </div>
            <p className="text-xs">La columna <strong>Dorsal</strong> es opcional. Los equipos que no existan se crean automáticamente.</p>
          </div>

          <label className="block">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFile}
              disabled={procesando}
              className="hidden"
            />
            <div className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-lg py-6 cursor-pointer transition ${procesando ? "border-slate-200 text-slate-300" : "border-slate-300 text-slate-600 hover:border-green-500 hover:text-green-600"}`}>
              {procesando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
              <span className="font-medium">{procesando ? "Importando..." : "Selecciona el fichero"}</span>
            </div>
          </label>
        </div>
      </DialogContent>
    </Dialog>
  );
}
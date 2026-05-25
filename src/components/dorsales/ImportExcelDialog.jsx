import React, { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { normalizarNombre, resolverPrioridad } from "./dorsalHelpers";

// Mapea texto de equipo del Excel (FEMENINO, BENJAMIN, CADETE...) a categoría oficial del club
function mapEquipoACategoria(equipo) {
  if (!equipo) return "";
  const k = String(equipo).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  if (k.includes("FEMENINO") || k.includes("FEMENINA")) return "Fútbol Femenino";
  if (k.includes("PRE-BENJAMIN") || k.includes("PREBENJAMIN") || k.includes("PRE BENJAMIN")) return "Fútbol Pre-Benjamín (Mixto)";
  if (k.includes("BENJAMIN")) return "Fútbol Benjamín (Mixto)";
  if (k.includes("ALEVIN")) return "Fútbol Alevín (Mixto)";
  if (k.includes("INFANTIL")) return "Fútbol Infantil (Mixto)";
  if (k.includes("CADETE")) return "Fútbol Cadete";
  if (k.includes("JUVENIL")) return "Fútbol Juvenil";
  if (k.includes("AFICIONADO") || k.includes("SENIOR") || k.includes("SÉNIOR")) return "Fútbol Aficionado";
  if (k.includes("BALONCESTO") || k.includes("BASKET")) return "Baloncesto (Mixto)";
  return equipo;
}

// Busca la columna que contenga uno de los alias dados
function findCol(headers, aliases) {
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  for (const h of headers) {
    const nh = norm(h);
    for (const a of aliases) {
      if (nh === norm(a) || nh.includes(norm(a))) return h;
    }
  }
  return null;
}

// Detecta si el nombre de la hoja es del estilo 'YY_YY' (ej '25_26') → es hoja resumen, la saltamos
function isResumenSheet(name) {
  return /^\d{2}_\d{2}$/.test(String(name || "").trim());
}

// Lee un .xlsx/.xls/.csv localmente y devuelve [{nombre, equipo, dorsal}]
function parseExcelFile(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: "array" });
  const allRows = [];

  // Si hay hojas tipo '25_26' (resumen con todas las categorías) usamos solo la más reciente
  const sheetNames = wb.SheetNames;
  const resumenSheets = sheetNames.filter(isResumenSheet);
  const categoriaSheets = sheetNames.filter((s) => !isResumenSheet(s));

  let sheetsToUse;
  if (resumenSheets.length > 0) {
    // Usar la hoja resumen más reciente (orden alfabético inverso)
    const latest = resumenSheets.sort().reverse()[0];
    sheetsToUse = [latest];
  } else {
    sheetsToUse = categoriaSheets;
  }

  for (const sheetName of sheetsToUse) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;
    const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
    if (!json.length) continue;

    const headers = Object.keys(json[0] || {});
    const colNombre = findCol(headers, ["nombre y apellidos", "nombre completo", "nombre", "jugador", "player"]);
    const colEquipo = findCol(headers, ["equipo", "categoria", "team", "grupo"]);
    const colDorsal = findCol(headers, ["dorsal", "numero", "nº", "n.", "number"]);

    for (const row of json) {
      const nombre = colNombre ? String(row[colNombre] || "").trim() : "";
      if (!nombre) continue;
      const equipo = colEquipo ? String(row[colEquipo] || "").trim() : sheetName; // si no hay col Equipo, usar nombre de hoja
      const dorsalRaw = colDorsal ? row[colDorsal] : null;
      const dorsal = dorsalRaw !== null && dorsalRaw !== "" ? Number(dorsalRaw) : null;
      allRows.push({ nombre, equipo, dorsal: Number.isFinite(dorsal) ? dorsal : null });
    }
  }
  return allRows;
}

export default function ImportExcelDialog({ open, onOpenChange, temporada, players = [], allAssignments = [], onImported }) {
  const [step, setStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [rows, setRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [fileName, setFileName] = useState("");

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    setErrorMsg("");
    if (!file) return;
    setFileName(file.name);
    setUploading(true);
    console.log("[ImportExcel] Archivo:", file.name, file.size, file.type);

    try {
      const buf = await file.arrayBuffer();
      const extracted = parseExcelFile(buf);
      console.log("[ImportExcel] Filas extraídas:", extracted.length, extracted.slice(0, 3));

      if (extracted.length === 0) {
        setErrorMsg("No se encontraron filas con datos. Asegúrate de que el Excel tiene columnas con el nombre del jugador, equipo y dorsal.");
        setUploading(false);
        return;
      }

      // Deduplicar por nombre + matching con jugadores existentes
      const seen = new Set();
      const matched = extracted
        .map((r) => {
          const norm = normalizarNombre(r.nombre);
          if (seen.has(norm)) return null;
          seen.add(norm);
          const match = players.find((p) => normalizarNombre(p.nombre) === norm) ||
                        players.find((p) => {
                          const np = normalizarNombre(p.nombre);
                          return np && norm && (np.includes(norm) || norm.includes(np));
                        });
          return {
            nombre_excel: r.nombre,
            equipo_raw: r.equipo,
            categoria: mapEquipoACategoria(r.equipo),
            dorsal: r.dorsal,
            matchedPlayer: match || null,
          };
        })
        .filter(Boolean);

      setRows(matched);
      setStep(2);
      toast.success(`${matched.length} jugadores leídos del archivo`);
    } catch (err) {
      console.error("[ImportExcel] Error:", err);
      setErrorMsg(`Error leyendo el archivo: ${err?.message || String(err)}`);
      toast.error("No se pudo leer el archivo");
    } finally {
      setUploading(false);
      if (e?.target) e.target.value = "";
    }
  };

  // Detectar conflictos: dos filas pidiendo el mismo dorsal en la misma categoría
  const conflicts = useMemo(() => {
    const grupos = {};
    rows.forEach((r, i) => {
      if (!r.dorsal || !r.categoria) return;
      const key = `${r.categoria}__${r.dorsal}`;
      if (!grupos[key]) grupos[key] = [];
      grupos[key].push({ ...r, index: i });
    });
    return Object.entries(grupos)
      .filter(([, arr]) => arr.length > 1)
      .map(([key, arr]) => {
        const [categoria, dorsal] = key.split("__");
        const candidatos = arr
          .filter((x) => x.matchedPlayer)
          .map((x) => ({
            jugadorId: x.matchedPlayer.id,
            nombre: x.matchedPlayer.nombre,
            fechaNacimiento: x.matchedPlayer.fecha_nacimiento,
            dorsal: Number(dorsal),
            historial: allAssignments
              .filter((a) => a.jugador_id === x.matchedPlayer.id && a.estado === "asignado")
              .sort((a, b) => String(b.temporada).localeCompare(String(a.temporada))),
            originalRow: x,
          }));
        const ganador = resolverPrioridad(candidatos);
        return { categoria, dorsal: Number(dorsal), arr, ganador };
      });
  }, [rows, allAssignments]);

  const stats = useMemo(() => {
    const sinMatch = rows.filter((r) => !r.matchedPlayer).length;
    const sinDorsal = rows.filter((r) => !r.dorsal).length;
    const sinCategoria = rows.filter((r) => !r.categoria).length;
    const conflictIndices = new Set(conflicts.flatMap((c) => c.arr.map((x) => x.index)));
    const ok = rows.filter((r, i) => r.matchedPlayer && r.dorsal && r.categoria && !conflictIndices.has(i)).length;
    return { ok, sinMatch, sinDorsal, sinCategoria, conflictCount: conflictIndices.size };
  }, [rows, conflicts]);

  const handleImport = async () => {
    if (!confirm(`¿Importar ${stats.ok} dorsales y enviar emails a las familias?`)) return;
    setImporting(true);
    try {
      const ganadoresConflicto = new Set(
        conflicts.map((c) => c.ganador?.originalRow.index).filter((i) => i !== undefined)
      );
      const conflictIndices = new Set(conflicts.flatMap((c) => c.arr.map((x) => x.index)));

      const toImport = rows.filter((r, i) => {
        if (!r.matchedPlayer || !r.dorsal || !r.categoria) return false;
        if (conflictIndices.has(i)) return ganadoresConflicto.has(i);
        return true;
      });

      let ok = 0;
      let failed = 0;
      for (const row of toImport) {
        try {
          const existing = await base44.entities.DorsalAssignment.filter({
            jugador_id: row.matchedPlayer.id,
            temporada,
          });
          const payload = {
            jugador_id: row.matchedPlayer.id,
            jugador_nombre: row.matchedPlayer.nombre,
            temporada,
            categoria: row.categoria,
            dorsal: Number(row.dorsal),
            estado: "asignado",
            origen: "import_excel",
            email_enviado: false,
          };
          let id;
          if (existing?.[0]) {
            await base44.entities.DorsalAssignment.update(existing[0].id, payload);
            id = existing[0].id;
          } else {
            const created = await base44.entities.DorsalAssignment.create(payload);
            id = created.id;
          }
          try {
            await base44.functions.invoke("sendDorsalAssignmentEmail", { assignment_id: id });
          } catch {}
          ok++;
        } catch (e) {
          console.error("Error fila:", row, e);
          failed++;
        }
      }
      toast.success(`✅ ${ok} dorsales importados${failed ? ` · ${failed} con error` : ""}`);
      onImported?.();
      onOpenChange(false);
      setStep(1);
      setRows([]);
      setFileName("");
    } catch (err) {
      console.error(err);
      toast.error("Error en la importación");
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setStep(1);
    setRows([]);
    setFileName("");
    setErrorMsg("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            Importar dorsales desde Excel · {temporada}
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">
              <strong>📋 Formatos aceptados:</strong>
              <ul className="mt-2 space-y-1 text-xs text-blue-800 list-disc list-inside">
                <li>Columnas con nombre del jugador (<code>Nombre y Apellidos</code>, <code>Nombre</code>, <code>Jugador</code>).</li>
                <li>Columna de equipo/categoría (<code>Equipo</code>, <code>Categoría</code>) <strong>o</strong> usa el nombre de cada hoja como equipo (FEMENINO, BENJAMIN, ALEVIN…).</li>
                <li>Columna <code>Dorsal</code> con el número.</li>
                <li>Varias hojas en un archivo: se unen automáticamente. Si hay hoja resumen tipo <code>25_26</code> o <code>26_27</code>, se usa solo la más reciente.</li>
              </ul>
            </div>

            <label className="block">
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 cursor-pointer transition-colors">
                <Upload className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                <div className="font-semibold">
                  {uploading ? "Leyendo archivo..." : "Haz clic aquí para seleccionar tu Excel"}
                </div>
                <div className="text-xs text-slate-500 mt-1">.xlsx, .xls, .csv</div>
                {fileName && !uploading && (
                  <div className="text-xs text-slate-700 mt-2 font-medium">Último archivo: {fileName}</div>
                )}
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleFile}
                  disabled={uploading}
                />
              </div>
            </label>

            {uploading && (
              <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                Leyendo el Excel en tu navegador... (instantáneo)
              </div>
            )}

            {errorMsg && (
              <div className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg p-3">
                <strong>⚠️ Error:</strong>
                <div className="mt-1">{errorMsg}</div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
                <div className="text-2xl font-bold text-green-700">{stats.ok}</div>
                <div className="text-xs text-green-800">OK</div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-center">
                <div className="text-2xl font-bold text-red-700">{stats.sinMatch}</div>
                <div className="text-xs text-red-800">Sin jugador</div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-center">
                <div className="text-2xl font-bold text-amber-700">{stats.sinDorsal}</div>
                <div className="text-xs text-amber-800">Sin dorsal</div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-center">
                <div className="text-2xl font-bold text-amber-700">{stats.sinCategoria}</div>
                <div className="text-xs text-amber-800">Sin categoría</div>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 text-center">
                <div className="text-2xl font-bold text-orange-700">{conflicts.length}</div>
                <div className="text-xs text-orange-800">Conflictos</div>
              </div>
            </div>

            {conflicts.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="font-semibold text-amber-900 flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  Conflictos — se asignará al jugador con más antigüedad
                </div>
                <div className="space-y-2">
                  {conflicts.map((c, i) => (
                    <div key={i} className="bg-white border border-amber-300 rounded-lg p-2 text-sm">
                      <div className="font-semibold">{c.categoria} · #{c.dorsal}</div>
                      <ul className="mt-1 space-y-1">
                        {c.arr.map((x, j) => (
                          <li key={j} className="flex items-center gap-2">
                            {x.matchedPlayer?.id === c.ganador?.jugadorId ? (
                              <Badge className="bg-green-600 text-white text-xs">Gana</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">No gana</Badge>
                            )}
                            <span>{x.nombre_excel}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-96 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 sticky top-0">
                    <tr>
                      <th className="px-2 py-1 text-left">Estado</th>
                      <th className="px-2 py-1 text-left">Nombre (Excel)</th>
                      <th className="px-2 py-1 text-left">Jugador encontrado</th>
                      <th className="px-2 py-1 text-left">Equipo (Excel)</th>
                      <th className="px-2 py-1 text-left">Categoría mapeada</th>
                      <th className="px-2 py-1 text-right">Dorsal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const conflictRow = conflicts.find((c) => c.arr.some((x) => x.index === i));
                      const isLoser = conflictRow && conflictRow.ganador?.jugadorId !== r.matchedPlayer?.id;
                      return (
                        <tr key={i} className="border-t">
                          <td className="px-2 py-1">
                            {!r.matchedPlayer ? <XCircle className="w-4 h-4 text-red-500" /> :
                             !r.dorsal || !r.categoria ? <AlertTriangle className="w-4 h-4 text-amber-500" /> :
                             isLoser ? <AlertTriangle className="w-4 h-4 text-orange-500" /> :
                             <CheckCircle2 className="w-4 h-4 text-green-500" />}
                          </td>
                          <td className="px-2 py-1">{r.nombre_excel}</td>
                          <td className="px-2 py-1 text-slate-600">
                            {r.matchedPlayer ? r.matchedPlayer.nombre : <span className="text-red-600">No encontrado</span>}
                          </td>
                          <td className="px-2 py-1 text-slate-500 text-xs">{r.equipo_raw || "—"}</td>
                          <td className="px-2 py-1 text-slate-600">{r.categoria || "—"}</td>
                          <td className="px-2 py-1 text-right font-bold">{r.dorsal || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 2 && (
            <>
              <Button variant="outline" onClick={reset} disabled={importing}>Volver a subir</Button>
              <Button onClick={handleImport} disabled={importing || stats.ok === 0} className="bg-green-600 hover:bg-green-700">
                {importing ? "Importando..." : `Importar ${stats.ok} dorsales y enviar emails`}
              </Button>
            </>
          )}
          {step === 1 && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
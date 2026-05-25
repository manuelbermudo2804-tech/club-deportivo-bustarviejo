import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { normalizarNombre, resolverPrioridad } from "./dorsalHelpers";

// Importa un Excel/CSV con: nombre, categoria, dorsal
// Pasos: 1) subir archivo → 2) revisar matches → 3) confirmar e importar
export default function ImportExcelDialog({ open, onOpenChange, temporada, players = [], allAssignments = [], onImported }) {
  const [step, setStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [rows, setRows] = useState([]); // [{ nombre, categoria, dorsal, matchedPlayer, conflictGroup }]
  const [importing, setImporting] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // Subir el archivo
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      // Extraer datos con esquema definido
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            jugadores: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  nombre: { type: "string", description: "Nombre completo del jugador" },
                  categoria: { type: "string", description: "Categoría deportiva (ej: Fútbol Cadete)" },
                  dorsal: { type: "number", description: "Número de dorsal solicitado" },
                },
                required: ["nombre"],
              },
            },
          },
        },
      });
      if (result.status !== "success" || !result.output?.jugadores?.length) {
        toast.error("No se pudieron extraer datos del archivo. Revisa el formato.");
        setUploading(false);
        return;
      }
      // Hacer matching con jugadores existentes
      const extracted = result.output.jugadores;
      const matched = extracted.map((r) => {
        const norm = normalizarNombre(r.nombre);
        const match = players.find((p) => normalizarNombre(p.nombre) === norm) ||
                      players.find((p) => normalizarNombre(p.nombre).includes(norm) || norm.includes(normalizarNombre(p.nombre)));
        return {
          nombre_excel: r.nombre,
          categoria: r.categoria || "",
          dorsal: r.dorsal ? Number(r.dorsal) : null,
          matchedPlayer: match || null,
        };
      });
      setRows(matched);
      setStep(2);
      toast.success(`${matched.length} filas extraídas del archivo`);
    } catch (err) {
      console.error(err);
      toast.error("Error al procesar el archivo: " + (err.message || ""));
    } finally {
      setUploading(false);
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
        // Resolver prioridad para sugerir ganador
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
    const ok = rows.length - sinMatch - sinDorsal - sinCategoria - conflictIndices.size;
    return { ok, sinMatch, sinDorsal, sinCategoria, conflictCount: conflictIndices.size };
  }, [rows, conflicts]);

  const handleImport = async () => {
    if (!confirm(`¿Importar ${stats.ok} dorsales y enviar emails a las familias?`)) return;
    setImporting(true);
    try {
      // Construir conjunto de filas a importar (ok + ganadores de conflictos)
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
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            Importar dorsales desde Excel · {temporada}
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">
              <strong>📋 Formato esperado del Excel/CSV:</strong>
              <div className="mt-2">
                Columnas: <code className="bg-white px-2 py-0.5 rounded">nombre</code>{" "}
                <code className="bg-white px-2 py-0.5 rounded">categoria</code>{" "}
                <code className="bg-white px-2 py-0.5 rounded">dorsal</code>
              </div>
              <div className="mt-2 text-xs text-blue-700">
                El sistema reconoce el jugador por el nombre y avisa de conflictos antes de guardar nada.
              </div>
            </div>

            <label className="block">
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 cursor-pointer transition-colors">
                <Upload className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                <div className="font-semibold">{uploading ? "Procesando..." : "Selecciona el archivo Excel o CSV"}</div>
                <div className="text-xs text-slate-500 mt-1">.xlsx, .xls, .csv</div>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleFile}
                  disabled={uploading}
                />
              </div>
            </label>
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
                  Conflictos detectados — se asignará el dorsal al jugador con más antigüedad
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
                      <th className="px-2 py-1 text-left">Categoría</th>
                      <th className="px-2 py-1 text-right">Dorsal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const conflictRow = conflicts.find((c) => c.arr.some((x) => x.index === i));
                      const isLoser = conflictRow && conflictRow.ganador?.jugadorId !== r.matchedPlayer?.id;
                      const ok = r.matchedPlayer && r.dorsal && r.categoria && !isLoser;
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
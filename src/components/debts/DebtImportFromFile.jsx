import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

/**
 * Modal: sube imagen/PDF/Excel → IA extrae deudas → tabla editable → crea todas en bloque.
 *
 * Props:
 *  - open: bool
 *  - onClose: () => void
 *  - players: array (para selección manual si IA no emparejó)
 *  - onCreated: () => void (refrescar lista al terminar)
 */
export default function DebtImportFromFile({ open, onClose, players = [], onCreated }) {
  const [step, setStep] = useState("upload"); // upload | extracting | review | creating
  const [rows, setRows] = useState([]);

  const handleClose = () => {
    if (step === "extracting" || step === "creating") return;
    setStep("upload");
    setRows([]);
    onClose();
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setStep("extracting");
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const res = await base44.functions.invoke("extractDebtsFromFile", { file_url });
      const deudas = res?.data?.deudas || [];

      if (deudas.length === 0) {
        const msg = res?.data?.message || "La IA no detectó deudas en el archivo.";
        toast.warning(msg, { duration: 8000 });
        console.log("[DebtImport] IA no extrajo deudas. Respuesta completa:", res?.data);
        setStep("upload");
        return;
      }

      const initialRows = deudas.map((d, idx) => ({
        id: `row-${idx}`,
        incluir: true,
        nombre_extraido: d.nombre_extraido || "",
        importe: d.importe || 0,
        concepto: d.concepto || "Deuda detectada por IA",
        temporada_origen: d.temporada || "",
        email_familia: d.jugador_match?.email_padre || d.email_extraido || "",
        dni_jugador: d.jugador_match?.dni_jugador || d.dni_extraido || "",
        dni_tutor: d.jugador_match?.dni_tutor_legal || d.dni_tutor_extraido || "",
        jugador_nombre: d.jugador_match?.nombre || d.nombre_extraido || "",
        tutor_nombre: d.tutor_nombre_extraido || "",
        jugador_id: d.jugador_match?.id || "",
        match_confidence: d.jugador_match?.confidence || null,
        match_reason: d.jugador_match?.reason || null,
      }));

      setRows(initialRows);
      setStep("review");
      toast.success(`✨ IA extrajo ${deudas.length} deuda(s) · ${res.data.total_emparejadas} emparejadas`);
    } catch (err) {
      console.error("Error extrayendo deudas:", err);
      toast.error("Error al procesar el archivo: " + (err.message || "desconocido"));
      setStep("upload");
    }
  };

  const updateRow = (id, field, value) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };
      if (field === "jugador_id" && value) {
        const p = players.find(x => x.id === value);
        if (p) {
          updated.email_familia = p.email_padre || "";
          updated.dni_jugador = p.dni_jugador || "";
          updated.dni_tutor = p.dni_tutor_legal || "";
          updated.jugador_nombre = p.nombre || "";
          updated.match_confidence = "manual";
          updated.match_reason = "Asignación manual";
        }
      }
      return updated;
    }));
  };

  const handleCreate = async () => {
    const seleccionadas = rows.filter(r => r.incluir);
    if (seleccionadas.length === 0) {
      toast.error("Selecciona al menos una deuda");
      return;
    }
    const sinImporte = seleccionadas.find(r => !r.importe || Number(r.importe) <= 0);
    if (sinImporte) {
      toast.error(`Importe inválido para "${sinImporte.nombre_extraido}"`);
      return;
    }

    // Temporada por defecto si no hay
    const now = new Date();
    const y = now.getFullYear();
    const temporadaDefault = now.getMonth() >= 6 ? `${y}-${y + 1}` : `${y - 1}-${y}`;

    setStep("creating");
    try {
      const me = await base44.auth.me();
      const payload = seleccionadas.map(r => {
        const slug = (r.jugador_nombre || r.nombre_extraido || "deudor")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-");
        const emailFinal = (r.email_familia || "").toLowerCase().trim() || `sin-email-${slug}@pendiente.local`;
        return {
          email_familia: emailFinal,
          dni_jugador: (r.dni_jugador || "").toUpperCase().trim(),
          dni_tutor: (r.dni_tutor || "").toUpperCase().trim(),
          jugador_nombre: r.jugador_nombre || "",
          tutor_nombre: r.tutor_nombre || "",
          importe: Number(r.importe),
          temporada_origen: (r.temporada_origen || "").trim() || temporadaDefault,
          concepto: r.concepto || "Deuda importada por IA",
          estado: "pendiente",
          creada_por: me.email,
          notas_admin: `Importada automáticamente con IA${r.match_reason ? ` (match: ${r.match_reason})` : ""}`,
        };
      });

      console.log("[DebtImport] Creando deudas:", payload);
      await base44.entities.Deuda.bulkCreate(payload);
      toast.success(`✅ ${payload.length} deuda(s) creada(s)`);
      onCreated?.();
      handleClose();
    } catch (err) {
      console.error("[DebtImport] Error bulkCreate:", err);
      toast.error("Error al crear las deudas: " + (err?.message || JSON.stringify(err)), { duration: 10000 });
      setStep("review");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Importar deudas con IA
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
              <p className="text-sm text-purple-900 font-semibold mb-2">🤖 ¿Cómo funciona?</p>
              <ol className="text-sm text-purple-800 space-y-1 list-decimal list-inside">
                <li>Sube cualquier archivo: foto, captura, PDF, Excel, listado…</li>
                <li>La IA lee y extrae nombres, DNIs, importes y conceptos</li>
                <li>El sistema cruza con los jugadores dados de alta</li>
                <li>Revisas la tabla y creas las deudas en bloque</li>
              </ol>
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center">
              <Upload className="w-12 h-12 mx-auto text-slate-400 mb-3" />
              <p className="text-sm text-slate-600 mb-4">Imagen, PDF, Excel, CSV, captura de pantalla…</p>
              <Button
                onClick={() => document.getElementById("debt-ai-file").click()}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Upload className="w-4 h-4 mr-2" /> Seleccionar archivo
              </Button>
              <input
                id="debt-ai-file"
                type="file"
                accept="image/*,application/pdf,.xls,.xlsx,.csv,.txt"
                onChange={handleFile}
                className="hidden"
              />
            </div>
          </div>
        )}

        {step === "extracting" && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-12 h-12 animate-spin text-purple-600" />
            <p className="font-semibold text-slate-700">Analizando el archivo con IA…</p>
            <p className="text-sm text-slate-500">Esto puede tardar unos segundos</p>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
              <p className="text-sm font-semibold">
                {rows.filter(r => r.incluir).length} / {rows.length} deuda(s) seleccionada(s)
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setRows(rows.map(r => ({ ...r, incluir: true })))}>
                  Marcar todas
                </Button>
                <Button size="sm" variant="outline" onClick={() => setRows(rows.map(r => ({ ...r, incluir: false })))}>
                  Desmarcar todas
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {rows.map((r) => (
                <div
                  key={r.id}
                  className={`border-2 rounded-lg p-3 ${
                    !r.incluir ? "bg-slate-50 border-slate-200 opacity-60" :
                    r.match_confidence === "alta" ? "border-green-300 bg-green-50" :
                    r.match_confidence === "media" || r.match_confidence === "manual" ? "border-blue-300 bg-blue-50" :
                    "border-amber-300 bg-amber-50"
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <Checkbox
                      checked={r.incluir}
                      onCheckedChange={(v) => updateRow(r.id, "incluir", !!v)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm">📄 IA detectó: <span className="font-normal italic">"{r.nombre_extraido}"</span></p>
                        {r.match_confidence === "alta" && (
                          <Badge className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Match {r.match_reason}</Badge>
                        )}
                        {(r.match_confidence === "media" || r.match_confidence === "manual") && (
                          <Badge className="bg-blue-600">Match: {r.match_reason}</Badge>
                        )}
                        {!r.match_confidence && (
                          <Badge className="bg-amber-600"><AlertCircle className="w-3 h-3 mr-1" /> Sin jugador — asigna manualmente</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-7">
                    <div>
                      <Label className="text-xs">Jugador del club</Label>
                      <Select value={r.jugador_id} onValueChange={(v) => updateRow(r.id, "jugador_id", v)}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Selecciona un jugador..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          {players.map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.nombre} {p.dni_jugador ? `(${p.dni_jugador})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Email familia</Label>
                      <Input
                        value={r.email_familia}
                        onChange={(e) => updateRow(r.id, "email_familia", e.target.value)}
                        className="h-9 text-sm"
                        placeholder="padre@ejemplo.com (opcional)"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Importe (€) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={r.importe}
                        onChange={(e) => updateRow(r.id, "importe", e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Temporada</Label>
                      <Input
                        value={r.temporada_origen}
                        onChange={(e) => updateRow(r.id, "temporada_origen", e.target.value)}
                        className="h-9 text-sm"
                        placeholder="2024-2025"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs">Concepto</Label>
                      <Input
                        value={r.concepto}
                        onChange={(e) => updateRow(r.id, "concepto", e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t sticky bottom-0 bg-white pb-2">
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={handleCreate} className="bg-purple-600 hover:bg-purple-700">
                <CheckCircle2 className="w-4 h-4 mr-2" /> Crear {rows.filter(r => r.incluir).length} deuda(s)
              </Button>
            </div>
          </div>
        )}

        {step === "creating" && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-12 h-12 animate-spin text-purple-600" />
            <p className="font-semibold text-slate-700">Creando deudas…</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
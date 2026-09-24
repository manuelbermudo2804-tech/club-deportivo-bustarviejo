import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { uploadPrivateFile } from "@/components/utils/privateUpload";

const FIELDS = ["proveedor_cliente", "numero_factura", "fecha_factura", "fecha_pago", "importe_imputado", "justificante_pago_url", "justificante_pago_nombre", "documento_url", "documento_nombre"];

export default function GastoSubvencionDialog({ gasto, onClose, onSaved }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null);

  useEffect(() => {
    if (gasto) setForm(Object.fromEntries(FIELDS.map((f) => [f, gasto[f] ?? ""])));
  }, [gasto]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const upload = (urlKey, nameKey) => async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(urlKey);
    // La factura se guarda igual que en el resto del panel financiero; el justificante bancario va a almacenamiento privado.
    const uri = urlKey === "documento_url"
      ? (await base44.integrations.Core.UploadFile({ file })).file_url
      : await uploadPrivateFile(file);
    setForm((p) => ({ ...p, [urlKey]: uri, [nameKey]: file.name }));
    setUploading(null);
  };

  const save = async () => {
    setSaving(true);
    const payload = { ...form, importe_imputado: form.importe_imputado === "" ? null : Number(form.importe_imputado) };
    Object.keys(payload).forEach((k) => { if (payload[k] === "") payload[k] = null; });
    await base44.entities.FinancialTransaction.update(gasto.id, payload);
    setSaving(false);
    toast.success("Gasto actualizado");
    onSaved();
  };

  const fileBtn = (urlKey, nameKey, label) => (
    <label className="flex items-center gap-2 p-2 border border-dashed rounded-lg cursor-pointer hover:bg-slate-50 text-sm">
      <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={upload(urlKey, nameKey)} />
      {uploading === urlKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-slate-400" />}
      <span className="truncate">{form[nameKey] || (form[urlKey] ? "Archivo adjunto" : label)}</span>
    </label>
  );

  return (
    <Dialog open={!!gasto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Datos para la justificación</DialogTitle></DialogHeader>
        {gasto && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">{gasto.concepto} · {gasto.cantidad} €</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Proveedor</Label><Input value={form.proveedor_cliente} onChange={(e) => set("proveedor_cliente", e.target.value)} /></div>
              <div><Label>Nº factura</Label><Input value={form.numero_factura} onChange={(e) => set("numero_factura", e.target.value)} /></div>
              <div><Label>Importe imputado (€)</Label><Input type="number" step="0.01" placeholder={`Total: ${gasto.cantidad}`} value={form.importe_imputado} onChange={(e) => set("importe_imputado", e.target.value)} /></div>
              <div><Label>Fecha factura</Label><Input type="date" value={form.fecha_factura} onChange={(e) => set("fecha_factura", e.target.value)} /></div>
              <div><Label>Fecha de pago</Label><Input type="date" value={form.fecha_pago} onChange={(e) => set("fecha_pago", e.target.value)} /></div>
            </div>
            <div><Label>Factura</Label>{fileBtn("documento_url", "documento_nombre", "Subir factura")}</div>
            <div><Label>Justificante de pago</Label>{fileBtn("justificante_pago_url", "justificante_pago_nombre", "Subir justificante (transferencia, recibo…)")}</div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button onClick={save} disabled={saving || !!uploading} className="bg-orange-600 hover:bg-orange-700">
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Guardar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
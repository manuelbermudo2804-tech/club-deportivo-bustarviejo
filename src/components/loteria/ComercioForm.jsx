import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, X } from "lucide-react";
import { toast } from "sonner";

export default function ComercioForm({ comercio, onSave, onCancel }) {
  const [form, setForm] = useState({
    nombre: comercio?.nombre || "",
    logo_url: comercio?.logo_url || "",
    direccion: comercio?.direccion || "",
    horario: comercio?.horario || "",
    telefono: comercio?.telefono || "",
    orden: comercio?.orden ?? 0,
    activo: comercio?.activo !== false,
  });
  const [uploading, setUploading] = useState(false);
  const inputId = `logo-comercio-${comercio?.id || "nuevo"}`;

  const subirLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm((f) => ({ ...f, logo_url: file_url }));
      toast.success("Logo subido");
    } finally {
      setUploading(false);
    }
  };

  const guardar = () => {
    if (!form.nombre.trim()) {
      toast.error("Pon el nombre del comercio");
      return;
    }
    onSave({ ...form, orden: Number(form.orden) || 0 });
  };

  return (
    <div className="bg-white border-2 border-orange-200 rounded-xl p-4 space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Nombre *</Label>
          <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Dirección</Label>
          <Input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Horario</Label>
          <Input value={form.horario} onChange={(e) => setForm({ ...form, horario: e.target.value })} placeholder="Ej: L-V 9:00-14:00" />
        </div>
        <div className="space-y-1">
          <Label>Teléfono</Label>
          <Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Orden</Label>
          <Input type="number" value={form.orden} onChange={(e) => setForm({ ...form, orden: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Logo</Label>
          <div className="flex items-center gap-2">
            {form.logo_url && (
              <img src={form.logo_url} alt="logo" className="w-10 h-10 object-contain border rounded" />
            )}
            <Button type="button" variant="outline" onClick={() => document.getElementById(inputId).click()} disabled={uploading}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span className="ml-2">{form.logo_url ? "Cambiar" : "Subir"}</span>
            </Button>
            {form.logo_url && (
              <Button type="button" variant="ghost" onClick={() => setForm({ ...form, logo_url: "" })}>
                <X className="w-4 h-4" />
              </Button>
            )}
            <input id={inputId} type="file" accept="image/*" className="hidden" onChange={subirLogo} />
          </div>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={guardar} className="bg-green-600 hover:bg-green-700">Guardar comercio</Button>
      </div>
    </div>
  );
}
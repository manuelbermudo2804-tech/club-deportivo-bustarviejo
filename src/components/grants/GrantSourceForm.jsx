import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const CATEGORIAS = ["Comunidad de Madrid", "Ayuntamiento", "BOE / BOCM", "Deporte base / Federaciones", "Google Alerts", "Otra"];

export default function GrantSourceForm({ open, onOpenChange, source, onSaved }) {
  const [form, setForm] = useState(() => ({
    nombre: source?.nombre || "",
    rss_url: source?.rss_url || "",
    categoria: source?.categoria || "Otra",
    palabras_clave: (source?.palabras_clave || []).join(", "),
    notas: source?.notas || "",
    activa: source?.activa ?? true,
  }));
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.nombre.trim() || !form.rss_url.trim()) {
      toast.error("Nombre y URL del feed son obligatorios");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        rss_url: form.rss_url.trim(),
        categoria: form.categoria,
        palabras_clave: form.palabras_clave.split(",").map((s) => s.trim()).filter(Boolean),
        notas: form.notas,
        activa: form.activa,
      };
      if (source?.id) await base44.entities.GrantSource.update(source.id, payload);
      else await base44.entities.GrantSource.create(payload);
      toast.success("Fuente guardada");
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      toast.error("No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{source?.id ? "Editar fuente" : "Nueva fuente de subvenciones"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nombre</Label>
            <Input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Ej: Alerta Google - subvenciones deporte Madrid" />
          </div>
          <div>
            <Label>URL del feed RSS</Label>
            <Input value={form.rss_url} onChange={(e) => set("rss_url", e.target.value)} placeholder="https://www.google.com/alerts/feeds/..." />
            <p className="text-xs text-slate-400 mt-1">En Google Alerts: crea la alerta, elige "Entrega: Fuente RSS" y copia aquí la URL del feed.</p>
          </div>
          <div>
            <Label>Categoría</Label>
            <Select value={form.categoria} onValueChange={(v) => set("categoria", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Palabras clave (opcional, separadas por comas)</Label>
            <Input value={form.palabras_clave} onChange={(e) => set("palabras_clave", e.target.value)} placeholder="subvención, deporte, club, ayuda" />
            <p className="text-xs text-slate-400 mt-1">Solo se guardarán resultados que contengan alguna de estas palabras. Déjalo vacío para guardar todo.</p>
          </div>
          <div>
            <Label>Notas</Label>
            <Textarea value={form.notas} onChange={(e) => set("notas", e.target.value)} rows={2} />
          </div>
          <Button onClick={submit} disabled={saving} className="w-full bg-orange-600 hover:bg-orange-700">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Guardar fuente
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
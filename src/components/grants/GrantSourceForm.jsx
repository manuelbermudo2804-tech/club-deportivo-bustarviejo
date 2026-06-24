import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";

const CATEGORIAS = ["Comunidad de Madrid", "Ayuntamiento", "BOE / BOCM", "Deporte base / Federaciones", "Fundaciones", "Google Alerts", "Otra"];

export default function GrantSourceForm({ open, onOpenChange, source, onSaved }) {
  const [form, setForm] = useState(() => ({
    nombre: source?.nombre || "",
    tipo: source?.tipo || "rss",
    rss_url: source?.rss_url || "",
    web_oficial: source?.web_oficial || "",
    prioridad: source?.prioridad || 3,
    categoria: source?.categoria || "Otra",
    palabras_clave: (source?.palabras_clave || []).join(", "),
    notas: source?.notas || "",
    activa: source?.activa ?? true,
  }));
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.nombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    if (form.tipo === "rss" && !form.rss_url.trim()) {
      toast.error("Una fuente RSS necesita la URL del feed");
      return;
    }
    if (form.tipo === "manual" && !form.web_oficial.trim()) {
      toast.error("Una fuente de seguimiento necesita la web oficial");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        tipo: form.tipo,
        rss_url: form.tipo === "rss" ? form.rss_url.trim() : "",
        web_oficial: form.web_oficial.trim(),
        prioridad: Number(form.prioridad),
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{source?.id ? "Editar fuente" : "Nueva fuente de subvenciones"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nombre</Label>
            <Input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Ej: Comunidad de Madrid - Deportes" />
          </div>

          <div>
            <Label>Tipo de seguimiento</Label>
            <Select value={form.tipo} onValueChange={(v) => set("tipo", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="rss">Automático (feed RSS)</SelectItem>
                <SelectItem value="manual">Manual (solo enlace para revisar)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-400 mt-1">
              {form.tipo === "rss"
                ? "Se revisa sola cada día y detecta novedades automáticamente."
                : "No tiene feed; se muestra el enlace para que la revises tú a mano."}
            </p>
          </div>

          {form.tipo === "rss" && (
            <div>
              <Label>URL del feed RSS</Label>
              <Input value={form.rss_url} onChange={(e) => set("rss_url", e.target.value)} placeholder="https://www.google.com/alerts/feeds/..." />
              <p className="text-xs text-slate-400 mt-1">En Google Alerts: crea la alerta, elige "Entrega: Fuente RSS" y copia aquí la URL del feed.</p>
            </div>
          )}

          <div>
            <Label>Web oficial</Label>
            <Input value={form.web_oficial} onChange={(e) => set("web_oficial", e.target.value)} placeholder="https://www.comunidad.madrid/..." />
            <p className="text-xs text-slate-400 mt-1">Enlace para abrir y revisar la fuente directamente.</p>
          </div>

          <div>
            <Label>Prioridad</Label>
            <div className="flex items-center gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => set("prioridad", n)} className="p-1">
                  <Star className={`w-6 h-6 ${n <= form.prioridad ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
                </button>
              ))}
            </div>
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

          {form.tipo === "rss" && (
            <div>
              <Label>Palabras clave (opcional, separadas por comas)</Label>
              <Input value={form.palabras_clave} onChange={(e) => set("palabras_clave", e.target.value)} placeholder="subvención, deporte, club, ayuda" />
              <p className="text-xs text-slate-400 mt-1">Solo se guardarán resultados que contengan alguna de estas palabras. Déjalo vacío para guardar todo.</p>
            </div>
          )}

          <div>
            <Label>Notas</Label>
            <Textarea value={form.notas} onChange={(e) => set("notas", e.target.value)} rows={2} />
          </div>
          <Button onClick={submit} disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-700">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Guardar fuente
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
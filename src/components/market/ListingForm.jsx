import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { Camera, X, Loader2 } from "lucide-react";

const CATEGORIES = ['Fútbol','Baloncesto','Equipación','Calzado','Protecciones','Accesorios','Otro Deportivo'];

export default function ListingForm({ listing, open, onClose, onSaved }) {
  const [form, setForm] = useState({
    titulo: "", descripcion: "", categoria: "Equipación",
    tipo: "venta", precio: 0, imagenes: [],
    vendedor_nombre: "", vendedor_email: "", vendedor_telefono: ""
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const me = await base44.auth.me().catch(() => null);
      if (listing) {
        setForm({ ...listing });
      } else {
        setForm({
          titulo: "", descripcion: "", categoria: "Equipación",
          tipo: "venta", precio: 0, imagenes: [],
          vendedor_nombre: me?.full_name || "",
          vendedor_email: me?.email || "",
          vendedor_telefono: me?.telefono || ""
        });
      }
    })();
  }, [listing, open]);

  const handle = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const addImage = async (file) => {
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    handle('imagenes', [...(form.imagenes || []), file_url]);
    setUploading(false);
  };

  const removeImage = (idx) => {
    handle('imagenes', (form.imagenes || []).filter((_, i) => i !== idx));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.vendedor_telefono?.trim()) { alert('El teléfono es obligatorio.'); return; }
    setSaving(true);
    const me = await base44.auth.me().catch(() => null);
    const payload = {
      ...form,
      vendedor_nombre: (form.vendedor_nombre || me?.full_name || '').trim(),
      vendedor_email: me?.email,
      vendedor_telefono: String(form.vendedor_telefono).trim(),
    };
    if (listing?.id) {
      await base44.entities.MarketListing.update(listing.id, payload);
    } else {
      await base44.entities.MarketListing.create(payload);
    }
    try { await base44.auth.updateMe({ telefono: payload.vendedor_telefono }); } catch {}
    setSaving(false);
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose?.(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{listing?.id ? '✏️ Editar anuncio' : '📝 Publicar anuncio'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Input placeholder="Título (ej: Botas fútbol talla 38)" value={form.titulo} onChange={e => handle('titulo', e.target.value)} required />
          <Textarea placeholder="Descripción del artículo, estado, talla..." rows={3} value={form.descripcion} onChange={e => handle('descripcion', e.target.value)} />

          <div className="grid grid-cols-2 gap-3">
            <Select value={form.categoria} onValueChange={(v) => handle('categoria', v)}>
              <SelectTrigger><SelectValue placeholder="Categoría" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={form.tipo} onValueChange={(v) => handle('tipo', v)}>
              <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="venta">💰 Venta</SelectItem>
                <SelectItem value="donacion">🎁 Donación</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.tipo === 'venta' && (
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Precio (€)</label>
              <Input type="number" step="0.01" min="0" placeholder="0.00" value={form.precio} onChange={e => handle('precio', Number(e.target.value))} />
            </div>
          )}

          {/* Fotos */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">📷 Fotos del artículo</label>
            <div className="flex gap-2 flex-wrap">
              {(form.imagenes || []).map((url, idx) => (
                <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border group">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeImage(idx)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <label className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors">
                {uploading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : <Camera className="w-5 h-5 text-slate-400" />}
                <span className="text-[10px] text-slate-400 mt-0.5">{uploading ? 'Subiendo' : 'Añadir'}</span>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => addImage(e.target.files?.[0])} disabled={uploading} />
              </label>
            </div>
          </div>

          {/* Datos contacto */}
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs font-medium text-slate-500">Datos de contacto</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input placeholder="Tu nombre" value={form.vendedor_nombre || ''} onChange={e => handle('vendedor_nombre', e.target.value)} />
              <Input placeholder="Tu teléfono *" value={form.vendedor_telefono || ''} onChange={e => handle('vendedor_telefono', e.target.value)} required />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onClose?.()}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="flex-1 bg-orange-600 hover:bg-orange-700">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {listing?.id ? 'Guardar cambios' : 'Publicar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";

export default function ListingForm({ listing, onSaved }) {
  const [form, setForm] = useState(listing || {
    titulo: "",
    descripcion: "",
    categoria: "Equipación",
    tipo: "venta",
    precio: 0,
    imagenes: [],
  });
  const [uploading, setUploading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me().catch(() => null);
      setCurrentUser(me);
      // Autorellenar datos del vendedor al crear
      if (!listing) {
        setForm(prev => ({
          ...prev,
          vendedor_nombre: me?.full_name || '',
          vendedor_email: me?.email || '',
          vendedor_telefono: prev.vendedor_telefono || me?.telefono || ''
        }));
      }
    })();
  }, [listing]);

  const handle = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const addImage = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      handle('imagenes', [...(form.imagenes || []), file_url]);
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    // Teléfono obligatorio
    if (!form.vendedor_telefono || String(form.vendedor_telefono).trim() === '') {
      alert('El teléfono es obligatorio para publicar.');
      return;
    }
    const payload = {
      ...form,
      vendedor_nombre: (form.vendedor_nombre || currentUser?.full_name || '').trim() || undefined,
      vendedor_email: currentUser?.email, // bloqueado: siempre el email del usuario
      vendedor_telefono: String(form.vendedor_telefono).trim(),
    };
    if (listing?.id) {
      await base44.entities.MarketListing.update(listing.id, payload);
    } else {
      await base44.entities.MarketListing.create(payload);
    }
    onSaved?.();
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <Input placeholder="Título (ej: Botas fútbol talla 38)" value={form.titulo} onChange={e => handle('titulo', e.target.value)} required />
      <Textarea placeholder="Descripción" value={form.descripcion} onChange={e => handle('descripcion', e.target.value)} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <Select value={form.categoria} onValueChange={(v) => handle('categoria', v)}>
          <SelectTrigger><SelectValue placeholder="Categoría" /></SelectTrigger>
          <SelectContent>
            {['Fútbol','Baloncesto','Equipación','Calzado','Protecciones','Accesorios','Otro Deportivo'].map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={form.tipo} onValueChange={(v) => handle('tipo', v)}>
          <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="venta">Venta</SelectItem>
            <SelectItem value="donacion">Donación</SelectItem>
          </SelectContent>
        </Select>
        <Input type="number" step="0.01" placeholder="Precio (€)" value={form.precio} onChange={e => handle('precio', Number(e.target.value))} disabled={form.tipo === 'donacion'} />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Fotos</label>
        <input type="file" accept="image/*" capture="environment" onChange={e => addImage(e.target.files?.[0])} />
        {uploading && <p className="text-xs text-slate-500">Subiendo...</p>}
        <div className="flex gap-2 flex-wrap">
          {(form.imagenes || []).map((url, idx) => (
            <div key={idx} className="relative w-24 h-24">
              <img src={url} alt="foto" className="w-24 h-24 object-cover rounded" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <Input placeholder="Tu nombre" value={form.vendedor_nombre || ''} onChange={e => handle('vendedor_nombre', e.target.value)} />
        <Input placeholder="Tu email" type="email" value={form.vendedor_email || ''} onChange={e => handle('vendedor_email', e.target.value)} required />
        <Input placeholder="Tu teléfono" value={form.vendedor_telefono || ''} onChange={e => handle('vendedor_telefono', e.target.value)} />
      </div>

      <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700">{listing?.id ? 'Guardar cambios' : 'Publicar'}</Button>
    </form>
  );
}
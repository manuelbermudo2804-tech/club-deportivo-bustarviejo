import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import ImageUploader from "@/components/common/ImageUploader";

export default function ListingForm({ user, initial, onSubmit }) {
  const [form, setForm] = useState(initial || { categoria: 'Futbol', condicion: 'Bueno', donacion: false, imagenes: [] });
  return (
    <div className="space-y-3">
      <Input placeholder="Título" value={form.titulo||''} onChange={(e)=>setForm({...form,titulo:e.target.value})} />
      <Textarea placeholder="Descripción (solo material deportivo)" value={form.descripcion||''} onChange={(e)=>setForm({...form,descripcion:e.target.value})} />
      <div className="grid grid-cols-2 gap-2">
        <Select value={form.categoria} onValueChange={(v)=>setForm({...form,categoria:v})}>
          <SelectTrigger><SelectValue placeholder="Categoría" /></SelectTrigger>
          <SelectContent>
            {['Futbol','Baloncesto','Entrenamiento','Calzado','Ropa','Accesorios','Otro'].map((c)=>(<SelectItem key={c} value={c}>{c}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={form.condicion} onValueChange={(v)=>setForm({...form,condicion:v})}>
          <SelectTrigger><SelectValue placeholder="Condición" /></SelectTrigger>
          <SelectContent>
            {['Nuevo','Como nuevo','Bueno','Usado'].map((c)=>(<SelectItem key={c} value={c}>{c}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input type="number" placeholder="Precio (€)" value={form.precio||''} onChange={(e)=>setForm({...form,precio:Number(e.target.value||0)})} />
        <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={form.donacion||false} onChange={(e)=>setForm({...form,donacion:e.target.checked, precio: e.target.checked?0:(form.precio||0)})} /> Donación</label>
      </div>
      <Input placeholder="Teléfono de contacto" value={form.seller_telefono||''} onChange={(e)=>setForm({...form,seller_telefono:e.target.value})} />
      <ImageUploader images={form.imagenes||[]} onChange={(val)=>setForm({...form, imagenes: typeof val==='function'?val(form.imagenes):val})} />
      <Button onClick={()=>onSubmit({ ...form, seller_email: user.email })} className="w-full">Guardar anuncio</Button>
    </div>
  );
}
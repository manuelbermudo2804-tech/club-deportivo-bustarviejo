import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function JuntaConfigForm({ junta, onSaved, onDeleted }) {
  const [f, setF] = useState({});
  useEffect(() => {
    setF({
      titulo: junta?.titulo || "Junta General de Socios", fecha: junta?.fecha || "", lugar: junta?.lugar || "",
      orden: (junta?.orden_dia || []).join("\n"), landing_slug: junta?.landing_slug || "", email_prueba: junta?.email_prueba || "", activa: junta?.activa ?? true,
    });
  }, [junta]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const guardar = async () => {
    if (!f.fecha) return toast.error("Pon la fecha y hora");
    const data = { titulo: f.titulo, fecha: f.fecha, lugar: f.lugar, landing_slug: f.landing_slug.trim().replace(/^.*\/l\//, ""), activa: f.activa, email_prueba: (f.email_prueba || "").trim(), orden_dia: f.orden.split("\n").map((s) => s.trim()).filter(Boolean) };
    const saved = junta ? await base44.entities.JuntaSocios.update(junta.id, data) : await base44.entities.JuntaSocios.create(data);
    toast.success("Junta guardada");
    onSaved(saved);
  };

  return (
    <Card><CardContent className="p-4 grid gap-3 md:grid-cols-2">
      <label className="text-sm">Título<Input value={f.titulo || ""} onChange={set("titulo")} /></label>
      <label className="text-sm">Fecha y hora<Input type="datetime-local" value={f.fecha || ""} onChange={set("fecha")} /></label>
      <label className="text-sm">Lugar<Input value={f.lugar || ""} onChange={set("lugar")} placeholder="Campo municipal" /></label>
      <label className="text-sm">Página pública (slug o enlace /l/...)<Input value={f.landing_slug || ""} onChange={set("landing_slug")} placeholder="junta-socios-2026" /></label>
      <label className="text-sm md:col-span-2 rounded-lg border border-dashed border-amber-400 bg-amber-50 p-3">🧪 Modo prueba: email del único usuario que verá el aviso (déjalo vacío para que lo vean todos los socios)
        <Input value={f.email_prueba || ""} onChange={set("email_prueba")} placeholder="tu@email.com" className="mt-1 bg-white" />
      </label>
      <label className="text-sm md:col-span-2">Orden del día (un punto por línea)<Textarea rows={4} value={f.orden || ""} onChange={set("orden")} /></label>
      <div className="flex items-center gap-2 text-sm"><Switch checked={!!f.activa} onCheckedChange={async (v) => {
        setF({ ...f, activa: v });
        if (!junta) return;
        const saved = await base44.entities.JuntaSocios.update(junta.id, { activa: v });
        toast.success(v ? "Aviso activado en la app" : "Aviso desactivado");
        onSaved(saved);
      }} />Mostrar aviso con cuenta atrás en la app</div>
      <div className="flex gap-2 md:justify-self-end">
        {junta && <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={async () => {
          if (!window.confirm("¿Cancelar y borrar esta junta? Desaparecerá el aviso para todos.")) return;
          await base44.entities.JuntaSocios.delete(junta.id);
          toast.success("Junta cancelada");
          onDeleted();
        }}>Cancelar junta</Button>}
        <Button onClick={guardar} className="bg-orange-600 hover:bg-orange-700">{junta ? "Guardar cambios" : "Crear junta"}</Button>
      </div>
    </CardContent></Card>
  );
}
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
      orden: (junta?.orden_dia || []).join("\n"), landing_slug: junta?.landing_slug || "", email_prueba: junta?.email_prueba || "", activa: junta?.activa ?? true, ludoteca: !!junta?.ludoteca,
    });
  }, [junta]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const guardar = async (silencioso) => {
    if (!f.fecha) return toast.error("Pon la fecha y hora");
    const data = { titulo: f.titulo, fecha: f.fecha, lugar: f.lugar, landing_slug: f.landing_slug.trim().replace(/^.*\/l\//, ""), ...(silencioso === true ? {} : { activa: f.activa, ludoteca: !!f.ludoteca }), email_prueba: (f.email_prueba || "").trim(), orden_dia: f.orden.split("\n").map((s) => s.trim()).filter(Boolean) };
    const saved = junta ? await base44.entities.JuntaSocios.update(junta.id, data) : await base44.entities.JuntaSocios.create(data);
    toast.success(silencioso === true ? "Cambio guardado ✓" : "Junta creada");
    onSaved(saved);
  };

  return (
    <Card><CardContent className="p-4 grid gap-3 md:grid-cols-2" onBlur={() => junta && guardar(true)}>
      <label className="text-sm">Título<Input value={f.titulo || ""} onChange={set("titulo")} /></label>
      <label className="text-sm">Fecha y hora<Input type="datetime-local" value={f.fecha || ""} onChange={set("fecha")} /></label>
      <label className="text-sm">Lugar<Input value={f.lugar || ""} onChange={set("lugar")} placeholder="Campo municipal" /></label>
      <label className="text-sm">Página pública (slug o enlace /l/...)<Input value={f.landing_slug || ""} onChange={set("landing_slug")} placeholder="junta-socios-2026" /></label>
      <label className="text-sm md:col-span-2 rounded-lg border border-dashed border-amber-400 bg-amber-50 p-3">🧪 Modo prueba: email del único usuario que verá el aviso (déjalo vacío para que lo vean todos los socios)
        <Input value={f.email_prueba || ""} onChange={set("email_prueba")} placeholder="tu@email.com" className="mt-1 bg-white" />
      </label>
      <label className="text-sm md:col-span-2">Orden del día (un punto por línea · para destacar algo escríbelo entre **dos asteriscos**)<Textarea rows={4} value={f.orden || ""} onChange={set("orden")} /></label>
      <p className="text-xs text-slate-500 md:col-span-2">Pega aquí el enlace de la página que hayas hecho en el Constructor de páginas (con su formulario de asistencia). Las respuestas de esa página se suman solas a las de la app en la tabla de abajo.</p>
      <div className={`flex items-center gap-3 text-sm font-semibold rounded-lg p-3 md:col-span-2 ${f.ludoteca ? "bg-sky-50 text-sky-800" : "bg-slate-100 text-slate-600"}`}><Switch checked={!!f.ludoteca} onCheckedChange={async (v) => {
        setF({ ...f, ludoteca: v });
        if (!junta) return;
        const saved = await base44.entities.JuntaSocios.update(junta.id, { ludoteca: v });
        toast.success(v ? "Ludoteca anunciada en el aviso" : "Ludoteca quitada del aviso");
        onSaved(saved);
      }} />{f.ludoteca ? "🧸 Servicio de ludoteca ACTIVADO — se anuncia a los socios" : "🧸 Sin servicio de ludoteca"}</div>
      <div className={`flex items-center gap-3 text-sm font-semibold rounded-lg p-3 md:col-span-2 ${f.activa ? "bg-green-50 text-green-800" : "bg-slate-100 text-slate-600"}`}><Switch checked={!!f.activa} onCheckedChange={async (v) => {
        setF({ ...f, activa: v });
        if (!junta) return;
        const saved = await base44.entities.JuntaSocios.update(junta.id, { activa: v });
        toast.success(v ? "Aviso activado en la app" : "Aviso desactivado");
        onSaved(saved);
        if (v && window.confirm("¿Enviar ahora el correo de convocatoria a los socios?\n\n• Socios con app → se les remite al aviso de la app\n• Socios sin app → al enlace de la página pública")) {
          const t = toast.loading("Enviando correos…");
          const { data } = await base44.functions.invoke("juntaEnviarAviso", { junta_id: junta.id });
          toast.dismiss(t);
          toast.success(`Correos enviados: ${data.app} a usuarios de la app, ${data.web} con enlace web${data.sinWeb ? ` · ${data.sinWeb} sin enviar (falta página pública)` : ""}${data.fallos ? ` · ${data.fallos} fallidos` : ""}`);
        }
      }} />{f.activa ? "🟢 Junta ACTIVA — el aviso sale en la app" : "⚪ Junta DESACTIVADA — nadie ve el aviso"}</div>
      <div className="flex gap-2 md:justify-self-end">
        {junta && <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={async () => {
          if (!window.confirm("¿Cancelar y borrar esta junta? Desaparecerá el aviso para todos.")) return;
          await base44.entities.JuntaSocios.delete(junta.id);
          toast.success("Junta cancelada");
          onDeleted();
        }}>Cancelar junta</Button>}
        {!junta && <Button onClick={() => guardar()} className="bg-orange-600 hover:bg-orange-700">Crear junta</Button>}
      </div>
    </CardContent></Card>
  );
}
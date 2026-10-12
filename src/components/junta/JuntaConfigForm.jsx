import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CalendarDays, MapPin, Globe, ListChecks, FlaskConical, Baby, Megaphone, Save, Trash2 } from "lucide-react";

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
    <Card className="overflow-hidden rounded-2xl border-slate-200 shadow-sm"><CardContent className="grid gap-5 p-4 sm:p-5 lg:p-6 md:grid-cols-2">
      <label className="block space-y-1.5 text-sm font-semibold text-slate-700"><span className="flex items-center gap-2"><ListChecks className="h-4 w-4 text-orange-600" />Título de la convocatoria</span><Input value={f.titulo || ""} onChange={set("titulo")} className="h-11 rounded-lg" placeholder="Junta General de Socios" /></label>
      <label className="block space-y-1.5 text-sm font-semibold text-slate-700"><span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-orange-600" />Fecha y hora</span><Input type="datetime-local" value={f.fecha || ""} onChange={set("fecha")} className="h-11 rounded-lg" /></label>
      <label className="block space-y-1.5 text-sm font-semibold text-slate-700"><span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-orange-600" />Lugar de celebración</span><Input value={f.lugar || ""} onChange={set("lugar")} placeholder="Campo municipal" className="h-11 rounded-lg" /></label>
      <label className="block space-y-1.5 text-sm font-semibold text-slate-700"><span className="flex items-center gap-2"><Globe className="h-4 w-4 text-orange-600" />Página pública</span><Input value={f.landing_slug || ""} onChange={set("landing_slug")} placeholder="Pega el slug o enlace /l/..." className="h-11 rounded-lg" /></label>
      <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 md:col-span-2"><p className="flex items-center gap-2 text-sm font-bold text-amber-900"><FlaskConical className="h-4 w-4" />Modo de prueba de avisos</p><p className="text-xs leading-relaxed text-amber-900/80">Si introduces un correo, el aviso se limita a ese usuario. Déjalo vacío para que el aviso llegue a todos los socios.</p><Input value={f.email_prueba || ""} onChange={set("email_prueba")} placeholder="tu@email.com (opcional)" className="h-11 rounded-lg border-amber-200 bg-white" /></div>
      <label className="block space-y-2 text-sm font-semibold text-slate-700 md:col-span-2"><span className="flex items-center gap-2"><ListChecks className="h-4 w-4 text-orange-600" />Orden del día</span><span className="block text-xs font-normal text-slate-500">Escribe un punto por línea. Puedes destacar texto con **dos asteriscos**.</span><Textarea rows={5} value={f.orden || ""} onChange={set("orden")} className="rounded-lg leading-relaxed" placeholder={"1. Apertura de la sesión\n2. Presentación de cuentas\n3. Ruegos y preguntas"} /></label>
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600 md:col-span-2">La página pública se configura desde el Constructor de páginas. Sus respuestas se integran automáticamente en el listado de asistentes de esta pantalla.</div>
      <div className={`flex items-start gap-3 rounded-xl border p-4 text-sm font-semibold md:col-span-2 ${f.ludoteca ? "border-sky-200 bg-sky-50 text-sky-900" : "border-slate-200 bg-slate-50 text-slate-700"}`}><Baby className="mt-0.5 h-5 w-5 shrink-0" /><Switch checked={!!f.ludoteca} onCheckedChange={async (v) => {
        setF({ ...f, ludoteca: v });
        if (!junta) return;
        const saved = await base44.entities.JuntaSocios.update(junta.id, { ludoteca: v });
        toast.success(v ? "Pregunta de ludoteca activada" : "Pregunta de ludoteca quitada");
        onSaved(saved);
      }} />{f.ludoteca ? "🧸 Preguntar a las familias si les facilitaría venir con servicio de ludoteca — ACTIVADO" : "🧸 Preguntar a las familias por el servicio de ludoteca"}</div>
      <div className={`flex items-start gap-3 rounded-xl border p-4 text-sm font-semibold md:col-span-2 ${f.activa ? "border-green-200 bg-green-50 text-green-900" : "border-slate-200 bg-slate-50 text-slate-700"}`}><Megaphone className="mt-0.5 h-5 w-5 shrink-0" /><Switch checked={!!f.activa} onCheckedChange={async (v) => {
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
      <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end md:col-span-2">
        {junta && <Button variant="outline" className="h-11 rounded-lg border-red-200 px-4 text-red-600 hover:bg-red-50" onClick={async () => {
          if (!window.confirm("¿Cancelar y borrar esta junta? Desaparecerá el aviso para todos.")) return;
          await base44.entities.JuntaSocios.delete(junta.id);
          toast.success("Junta cancelada");
          onDeleted();
        }}><Trash2 className="mr-2 h-4 w-4" />Cancelar y borrar junta</Button>}
        {junta ? <Button onClick={() => guardar(false)} className="h-11 rounded-lg bg-orange-600 px-5 font-semibold shadow-sm hover:bg-orange-700"><Save className="mr-2 h-4 w-4" />Guardar cambios</Button> : <Button onClick={() => guardar()} className="h-11 rounded-lg bg-orange-600 px-5 font-semibold shadow-sm hover:bg-orange-700"><Save className="mr-2 h-4 w-4" />Crear junta</Button>}
      </div>
    </CardContent></Card>
  );
}
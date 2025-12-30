import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectValue, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Paperclip, Plus, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function IncidenciaForm({ onCreated }) {
  const [data, setData] = useState({
    titulo: "",
    tipo: "Deportiva",
    prioridad: "Media",
    estado: "Abierta",
    descripcion: "",
    etiquetas: [],
    adjuntos: []
  });
  const [etiquetaInput, setEtiquetaInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const addEtiqueta = () => {
    if (!etiquetaInput.trim()) return;
    setData(d => ({ ...d, etiquetas: Array.from(new Set([...(d.etiquetas||[]), etiquetaInput.trim()])) }));
    setEtiquetaInput("");
  };

  const handleUpload = async (file) => {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setData(d => ({ ...d, adjuntos: [...(d.adjuntos||[]), { url: file_url, nombre: file.name, tipo: file.type, tamano: file.size }] }));
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const me = await base44.auth.me();
      const created = await base44.entities.Incidencia.create({
        ...data,
        creador_email: me.email,
        creador_nombre: me.full_name || me.email.split('@')[0]
      });

      // Notificar a todos los admins
      if (me.role !== 'admin') {
        try {
          const allUsers = await base44.entities.User.list(); // solo admins pueden listar; si falla, omitir silenciosamente
          const recipients = allUsers.filter(u => u.role === 'admin' || u.es_junta === true).map(u => u.email);
          await Promise.all(recipients.map(email => base44.entities.AppNotification.create({
            usuario_email: email,
            tipo: 'incidencia_nueva',
            titulo: 'Nueva incidencia reportada',
            mensaje: `${data.titulo} • Prioridad ${data.prioridad}`,
            prioridad: data.prioridad === 'Alta' ? 'urgente' : 'importante',
            url_accion: '/Incidencias'
          })));
        } catch (e) { /* noop */ }
      }

      onCreated?.(created);
      setData({ titulo: "", tipo: "Deportiva", prioridad: "Media", estado: "Abierta", descripcion: "", etiquetas: [], adjuntos: [] });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border p-4 space-y-3">
      <div className="grid md:grid-cols-3 gap-3">
        <Input placeholder="Título" value={data.titulo} onChange={e => setData({ ...data, titulo: e.target.value })} />
        <Select value={data.tipo} onValueChange={v => setData({ ...data, tipo: v })}>
          <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Deportiva">Deportiva</SelectItem>
            <SelectItem value="Administrativa">Administrativa</SelectItem>
            <SelectItem value="Infraestructura">Infraestructura</SelectItem>
            <SelectItem value="Otra">Otra</SelectItem>
          </SelectContent>
        </Select>
        <Select value={data.prioridad} onValueChange={v => setData({ ...data, prioridad: v })}>
          <SelectTrigger><SelectValue placeholder="Prioridad" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Alta">Alta</SelectItem>
            <SelectItem value="Media">Media</SelectItem>
            <SelectItem value="Baja">Baja</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Textarea rows={4} placeholder="Descripción" value={data.descripcion} onChange={e => setData({ ...data, descripcion: e.target.value })} />

      <div className="flex items-center gap-2">
        <Input type="file" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} className="max-w-xs" />
        <Paperclip className="w-4 h-4 text-slate-500" />
        <div className="flex gap-2 flex-wrap">
          {data.adjuntos?.map((a, i) => (
            <a key={i} href={a.url} target="_blank" className="text-xs underline text-slate-700 flex items-center gap-1">{a.nombre}</a>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Input placeholder="Añadir etiqueta" value={etiquetaInput} onChange={e => setEtiquetaInput(e.target.value)} className="max-w-xs" />
        <Button type="button" variant="outline" size="sm" onClick={addEtiqueta}><Plus className="w-4 h-4 mr-1" />Etiqueta</Button>
        <div className="flex gap-1 flex-wrap">
          {data.etiquetas?.map((t, i) => (
            <Badge key={i} className="bg-slate-100 text-slate-700 group">
              {t}
              <button onClick={() => setData(d => ({ ...d, etiquetas: d.etiquetas.filter((_, idx) => idx !== i) }))} className="ml-1 opacity-60 group-hover:opacity-100"><X className="w-3 h-3" /></button>
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button disabled={submitting || !data.titulo} onClick={submit} className="bg-orange-600 hover:bg-orange-700">
          {submitting ? 'Creando…' : 'Crear incidencia'}
        </Button>
      </div>
    </div>
  );
}
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, CheckCircle2, Clock, User, Send } from "lucide-react";
import { base44 } from "@/api/base44Client";

const prioridadColor = {
  Alta: "bg-red-100 text-red-700",
  Media: "bg-yellow-100 text-yellow-700",
  Baja: "bg-green-100 text-green-700"
};

export default function IncidenciaItem({ item, isAdmin, onUpdated }) {
  const [status, setStatus] = useState(item.estado);
  const [assignee, setAssignee] = useState(item.asignado_email || "");
  const [comment, setComment] = useState("");
  const [updating, setUpdating] = useState(false);

  const changeStatus = async (newStatus) => {
    setUpdating(true);
    try {
      const me = await base44.auth.me();
      const updated = await base44.entities.Incidencia.update(item.id, {
        ...item,
        estado: newStatus,
        comentarios: [...(item.comentarios||[]), {
          usuario_email: me.email,
          usuario_nombre: me.full_name || me.email,
          mensaje: `Estado: ${item.estado} → ${newStatus}`,
          fecha: new Date().toISOString(),
          tipo: 'cambio_estado'
        }],
        fecha_resolucion: newStatus === 'Resuelta' ? new Date().toISOString() : item.fecha_resolucion || null
      });

      // Notificar al creador y al asignado (si existe)
      const targets = [item.creador_email, item.asignado_email].filter(Boolean);
      await Promise.all(targets.map(email => base44.entities.AppNotification.create({
        usuario_email: email,
        tipo: 'incidencia_actualizada',
        titulo: `Incidencia ${newStatus}`,
        mensaje: item.titulo,
        prioridad: newStatus === 'Resuelta' ? 'normal' : 'importante',
        url_accion: '/Incidencias'
      })));

      setStatus(newStatus);
      onUpdated?.(updated);
    } finally { setUpdating(false); }
  };

  const changeAssignee = async (email, name) => {
    setUpdating(true);
    try {
      const me = await base44.auth.me();
      const updated = await base44.entities.Incidencia.update(item.id, {
        ...item,
        asignado_email: email,
        asignado_nombre: name,
        comentarios: [...(item.comentarios||[]), {
          usuario_email: me.email,
          usuario_nombre: me.full_name || me.email,
          mensaje: `Asignado a ${name} (${email})`,
          fecha: new Date().toISOString(),
          tipo: 'asignacion'
        }]
      });
      // Notificar al nuevo asignado
      if (email) {
        await base44.entities.AppNotification.create({
          usuario_email: email,
          tipo: 'incidencia_asignada',
          titulo: 'Tienes una incidencia asignada',
          mensaje: item.titulo,
          prioridad: item.prioridad === 'Alta' ? 'urgente' : 'importante',
          url_accion: '/Incidencias'
        });
      }
      setAssignee(email);
      onUpdated?.(updated);
    } finally { setUpdating(false); }
  };

  const addComment = async () => {
    if (!comment.trim()) return;
    setUpdating(true);
    try {
      const me = await base44.auth.me();
      const updated = await base44.entities.Incidencia.update(item.id, {
        ...item,
        comentarios: [...(item.comentarios||[]), {
          usuario_email: me.email,
          usuario_nombre: me.full_name || me.email,
          mensaje: comment.trim(),
          fecha: new Date().toISOString(),
          tipo: 'comentario'
        }]
      });

      const targets = Array.from(new Set([item.creador_email, item.asignado_email].filter(Boolean)));
      await Promise.all(targets.map(email => base44.entities.AppNotification.create({
        usuario_email: email,
        tipo: 'incidencia_comentario',
        titulo: 'Nuevo comentario en incidencia',
        mensaje: item.titulo,
        prioridad: 'normal',
        url_accion: '/Incidencias'
      })));

      setComment("");
      onUpdated?.(updated);
    } finally { setUpdating(false); }
  };

  return (
    <Card className="border bg-white/90">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 truncate">{item.titulo}</h3>
              <Badge className={prioridadColor[item.prioridad]}>{item.prioridad}</Badge>
              <Badge variant="outline">{item.tipo}</Badge>
              <Badge variant="outline">{item.estado}</Badge>
            </div>
            <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{item.descripcion}</p>
            {item.adjuntos?.length > 0 && (
              <div className="mt-2 flex gap-2 flex-wrap">
                {item.adjuntos.map((a, i) => (
                  <a key={i} href={a.url} target="_blank" className="text-xs underline">📎 {a.nombre}</a>
                ))}
              </div>
            )}
            {(item.relacionados_jugadores?.length || 0) > 0 && (
              <p className="text-xs text-slate-500 mt-1">Jugadores: {item.relacionados_jugadores.map(j => j.jugador_nombre).join(', ')}</p>
            )}
            {(item.relacionados_eventos?.length || 0) > 0 && (
              <p className="text-xs text-slate-500">Eventos: {item.relacionados_eventos.map(e => e.evento_titulo).join(', ')}</p>
            )}
          </div>
          <div className="text-right text-xs text-slate-500">
            <div className="flex items-center gap-1 justify-end"><User className="w-3 h-3" /> {item.creador_nombre || item.creador_email}</div>
            <div>{new Date(item.created_date).toLocaleString('es-ES')}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <>
              <Select value={status} onValueChange={v => changeStatus(v)}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Abierta">Abierta</SelectItem>
                  <SelectItem value="En curso">En curso</SelectItem>
                  <SelectItem value="Resuelta">Resuelta</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-2 items-start">
          {isAdmin ? (
            <AssigneePicker current={assignee} onChange={changeAssignee} />
          ) : (
            <div className="text-xs text-slate-600">Asignado: {item.asignado_nombre || '—'}</div>
          )}
          <div className="md:col-span-2 flex items-start gap-2">
            <Textarea rows={2} placeholder="Añade un comentario" value={comment} onChange={e => setComment(e.target.value)} />
            <Button onClick={addComment} disabled={!comment.trim() || updating} className="h-9 mt-0.5"><Send className="w-4 h-4" /></Button>
          </div>
        </div>

        {item.comentarios?.length > 0 && (
          <div className="bg-slate-50 rounded p-2 space-y-1 max-h-40 overflow-auto">
            {item.comentarios.slice().reverse().map((c, i) => (
              <div key={i} className="text-xs text-slate-700">
                <span className="font-semibold">{c.usuario_nombre || c.usuario_email}</span>: {c.mensaje}
                <span className="text-slate-400 ml-2">{new Date(c.fecha).toLocaleString('es-ES')}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AssigneePicker({ current, onChange }) {
  const [admins, setAdmins] = React.useState([]);
  React.useEffect(() => {
    (async () => {
      try {
        const all = await base44.entities.User.list();
        setAdmins(all.filter(u => u.role === 'admin'));
      } catch (e) {
        setAdmins([]);
      }
    })();
  }, []);

  return (
    <div className="flex items-center gap-2">
      <Select value={current || ''} onValueChange={v => {
        const u = admins.find(a => a.email === v);
        onChange(v, u?.full_name || v);
      }}>
        <SelectTrigger className="w-64"><SelectValue placeholder="Asignar a… (Junta/Admin)" /></SelectTrigger>
        <SelectContent>
          {admins.map(a => (
            <SelectItem key={a.email} value={a.email}>{a.full_name || a.email}</SelectItem>
          ))}
          {admins.length === 0 && <SelectItem value={null} disabled>No disponible</SelectItem>}
        </SelectContent>
      </Select>
    </div>
  );
}
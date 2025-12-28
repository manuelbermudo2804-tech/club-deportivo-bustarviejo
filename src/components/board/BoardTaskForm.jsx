import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ROLES = ["Presidente", "Vicepresidente", "Secretaría", "Tesorero", "Vocal1", "Vocal2", "Vocal3"];
const AREAS = [
  "Presidencia",
  "Vicepresidencia",
  "Secretaría",
  "Tesorería",
  "Material e instalaciones",
  "Cantera y equipos base",
  "Eventos y patrocinio"
];

export default function BoardTaskForm({ task, onSubmit, onCancel, isSubmitting }) {
  const [data, setData] = React.useState(task || {
    titulo: "",
    descripcion: "",
    area: "",
    prioridad: "media",
    estado: "pendiente",
    fecha_limite: "",
    rol_asignado: "",
    asignado_a_email: ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-4 grid gap-3">
      <div className="grid gap-2">
        <label className="text-sm font-medium">Título</label>
        <Input value={data.titulo} onChange={(e)=>setData({...data, titulo: e.target.value})} placeholder="Escribe el título" />
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-medium">Descripción</label>
        <Textarea value={data.descripcion} onChange={(e)=>setData({...data, descripcion: e.target.value})} placeholder="Detalles" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="grid gap-2">
          <label className="text-sm font-medium">Rol asignado</label>
          <Select value={data.rol_asignado} onValueChange={(v)=>setData({...data, rol_asignado: v})}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona rol" />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map(r=> (<SelectItem key={r} value={r}>{r}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">Área</label>
          <Select value={data.area} onValueChange={(v)=>setData({...data, area: v})}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona área" />
            </SelectTrigger>
            <SelectContent>
              {AREAS.map(a=> (<SelectItem key={a} value={a}>{a}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">Prioridad</label>
          <Select value={data.prioridad} onValueChange={(v)=>setData({...data, prioridad: v})}>
            <SelectTrigger>
              <SelectValue placeholder="Prioridad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="baja">Baja</SelectItem>
              <SelectItem value="media">Media</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">Fecha límite</label>
          <Input type="date" value={data.fecha_limite || ""} onChange={(e)=>setData({...data, fecha_limite: e.target.value})} />
        </div>
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-medium">Asignado a (email opcional)</label>
        <Input type="email" value={data.asignado_a_email || ""} onChange={(e)=>setData({...data, asignado_a_email: e.target.value})} placeholder="persona@correo.com" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={isSubmitting} className="bg-orange-600 hover:bg-orange-700">
          {task ? 'Guardar cambios' : 'Crear tarea'}
        </Button>
      </div>
    </form>
  );
}
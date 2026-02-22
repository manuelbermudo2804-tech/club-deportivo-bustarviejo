import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Loader2 } from "lucide-react";

export default function OpportunityForm({ onSubmit, initial, existingOpportunities = [], isSubmitting }) {
  const [form, setForm] = useState(initial || { categoria: 'evento', plazas: 4, estado: 'abierta' });
  const isEditing = !!initial;

  // Detectar duplicados en tiempo real
  const duplicateWarning = useMemo(() => {
    if (isEditing || !form.fecha) return null;
    const match = existingOpportunities.find(opp => 
      opp.fecha === form.fecha && 
      opp.estado !== "cerrada" &&
      (opp.titulo?.toLowerCase().trim() === (form.titulo || '').toLowerCase().trim() ||
       opp.categoria === form.categoria)
    );
    return match || null;
  }, [form.fecha, form.titulo, form.categoria, existingOpportunities, isEditing]);

  return (
    <div className="space-y-3">
      <Input placeholder="Título" value={form.titulo||''} onChange={(e)=>setForm({...form,titulo:e.target.value})} />
      <Textarea placeholder="Descripción" value={form.descripcion||''} onChange={(e)=>setForm({...form,descripcion:e.target.value})} />
      <div className="grid grid-cols-2 gap-2">
        <Input type="date" value={form.fecha||''} onChange={(e)=>setForm({...form,fecha:e.target.value})} />
        <Input placeholder="Hora (ej: 10:00)" value={form.hora||''} onChange={(e)=>setForm({...form,hora:e.target.value})} />
      </div>
      <Input placeholder="Ubicación" value={form.ubicacion||''} onChange={(e)=>setForm({...form,ubicacion:e.target.value})} />
      <div className="grid grid-cols-2 gap-2">
        <Select value={form.categoria} onValueChange={(v)=>setForm({...form,categoria:v})}>
          <SelectTrigger><SelectValue placeholder="Categoría" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="evento">Evento</SelectItem>
            <SelectItem value="dia_a_dia">Día a día</SelectItem>
            <SelectItem value="logistica">Logística</SelectItem>
            <SelectItem value="comunicacion">Comunicación</SelectItem>
            <SelectItem value="otro">Otro</SelectItem>
          </SelectContent>
        </Select>
        <div>
          <Input type="number" min={1} max={50} placeholder="Plazas" value={form.plazas||''} onChange={(e)=>setForm({...form,plazas:Number(e.target.value||0)})} />
          <p className="text-xs text-slate-500 mt-0.5">Plazas necesarias</p>
        </div>
      </div>

      {/* Aviso de duplicado */}
      {duplicateWarning && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border-2 border-amber-300 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800">⚠️ Ya existe una oportunidad similar</p>
            <p className="text-xs text-amber-700 mt-1">
              <strong>"{duplicateWarning.titulo}"</strong> — {duplicateWarning.fecha}
              {duplicateWarning.creado_por_nombre && ` — Creada por ${duplicateWarning.creado_por_nombre}`}
            </p>
            <p className="text-xs text-amber-600 mt-1">
              No es necesario crear otra. Puedes verla en la lista de oportunidades abajo.
            </p>
          </div>
        </div>
      )}

      {isEditing && (
        <Select value={form.estado || 'abierta'} onValueChange={(v)=>setForm({...form,estado:v})}>
          <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="abierta">Abierta</SelectItem>
            <SelectItem value="completa">Completa</SelectItem>
            <SelectItem value="cerrada">Cerrada</SelectItem>
          </SelectContent>
        </Select>
      )}
      <Button 
        onClick={()=>onSubmit(form)} 
        disabled={!!duplicateWarning || isSubmitting}
        className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50"
      >
        {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creando...</> : isEditing ? 'Guardar cambios' : 'Crear oportunidad'}
      </Button>
    </div>
  );
}
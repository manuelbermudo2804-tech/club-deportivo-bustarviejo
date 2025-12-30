import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, Filter, List, Columns } from "lucide-react";
import IncidenciaForm from "../components/incidencias/IncidenciaForm";
import IncidenciaItem from "../components/incidencias/IncidenciaItem";
import JuntaKPIDashboard from "../components/junta/JuntaKPIDashboard";
import IncidenciasKanban from "../components/incidencias/IncidenciasKanban";

export default function IncidenciasPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
        const [view, setView] = useState("list");
  const [tipo, setTipo] = useState("all");
  const [estado, setEstado] = useState("all");
  const [prioridad, setPrioridad] = useState("all");
  const [search, setSearch] = useState("");

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const { data: incidencias = [], isLoading } = useQuery({
    queryKey: ['incidencias'],
    queryFn: () => base44.entities.Incidencia.list('-updated_date', 200),
    initialData: []
  });

  const isAdmin = me?.role === 'admin';
  const canCreate = isAdmin || me?.es_entrenador || me?.es_coordinador;
  const isJunta = me?.es_junta === true;
  const canAssignToJunta = isAdmin || me?.es_entrenador || me?.es_coordinador;
  const canAssign = isAdmin || me?.es_entrenador || me?.es_coordinador;

  const filtered = useMemo(() => {
    return incidencias.filter(i =>
      (tipo === 'all' || i.tipo === tipo) &&
      (estado === 'all' || i.estado === estado) &&
      (prioridad === 'all' || i.prioridad === prioridad) &&
      (!search || (i.titulo?.toLowerCase().includes(search.toLowerCase()) || i.descripcion?.toLowerCase().includes(search.toLowerCase())))
    );
  }, [incidencias, tipo, estado, prioridad, search]);

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Incidencias</h1>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex bg-slate-100 rounded-lg p-1">
            <Button size="sm" variant={view === 'list' ? 'default' : 'ghost'} onClick={() => setView('list')} className={view==='list' ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}>
              <List className="w-4 h-4 mr-1" /> Lista
            </Button>
            <Button size="sm" variant={view === 'kanban' ? 'default' : 'ghost'} onClick={() => setView('kanban')} className={view==='kanban' ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}>
              <Columns className="w-4 h-4 mr-1" /> Kanban
            </Button>
          </div>
          {canCreate && (
            <Button onClick={() => setShowForm(v => !v)} className="bg-orange-600 hover:bg-orange-700"><Plus className="w-4 h-4 mr-2" />Nueva</Button>
          )}
        </div>
      </div>

      {showForm && (
        <IncidenciaForm onCreated={() => { setShowForm(false); qc.invalidateQueries({ queryKey: ['incidencias'] }); }} />
      )}

      {isJunta && (
        <JuntaKPIDashboard incidencias={incidencias} />
      )}

      <Card className="p-3 border bg-white">
        <div className="grid md:grid-cols-5 gap-2">
          <div className="flex items-center gap-2"><Filter className="w-4 h-4 text-slate-500" /> Filtros</div>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Deportiva">Deportiva</SelectItem>
              <SelectItem value="Administrativa">Administrativa</SelectItem>
              <SelectItem value="Infraestructura">Infraestructura</SelectItem>
              <SelectItem value="Otra">Otra</SelectItem>
            </SelectContent>
          </Select>
          <Select value={estado} onValueChange={setEstado}>
            <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Abierta">Abierta</SelectItem>
              <SelectItem value="En curso">En curso</SelectItem>
              <SelectItem value="Resuelta">Resuelta</SelectItem>
            </SelectContent>
          </Select>
          <Select value={prioridad} onValueChange={setPrioridad}>
            <SelectTrigger><SelectValue placeholder="Prioridad" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="Alta">Alta</SelectItem>
              <SelectItem value="Media">Media</SelectItem>
              <SelectItem value="Baja">Baja</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Buscar…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </Card>

      {view === 'kanban' ? (
        <IncidenciasKanban incidencias={filtered} onUpdated={() => qc.invalidateQueries({ queryKey: ['incidencias'] })} />
      ) : (
        <div className="grid gap-3">
          {filtered.map(i => (
            <IncidenciaItem key={i.id} item={i} isAdmin={isAdmin} canAssign={canAssign} onUpdated={() => qc.invalidateQueries({ queryKey: ['incidencias'] })} />
          ))}
          {!isLoading && filtered.length === 0 && (
            <div className="text-sm text-slate-500 text-center py-8">No hay incidencias con los filtros actuales</div>
          )}
        </div>
      )}
    </div>
  );
}
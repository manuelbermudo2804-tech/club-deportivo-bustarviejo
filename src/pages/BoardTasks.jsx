import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Filter } from "lucide-react";
import BoardTaskForm from "../components/board/BoardTaskForm";
import BoardKanbanColumn from "../components/board/BoardKanbanColumn";

const ROLE_OPTIONS = ["Todos", "Presidente", "Vicepresidente", "Secretaría", "Tesorero", "Vocal1", "Vocal2", "Vocal3"];
const AREAS = [
  "Todas",
  "Presidencia",
  "Vicepresidencia",
  "Secretaría",
  "Tesorería",
  "Material e instalaciones",
  "Cantera y equipos base",
  "Eventos y patrocinio"
];

export default function BoardTasks() {
  const [showForm, setShowForm] = React.useState(false);
  const [editing, setEditing] = React.useState(null);
  const [roleFilter, setRoleFilter] = React.useState("Todos");
  const [areaFilter, setAreaFilter] = React.useState("Todas");
  const [search, setSearch] = React.useState("");
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["boardTasks"],
    queryFn: () => base44.entities.BoardTask.list("-updated_date", 500),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (payload) => base44.entities.BoardTask.create(payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["boardTasks"] }); setShowForm(false); setEditing(null); }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BoardTask.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["boardTasks"] }); setEditing(null); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BoardTask.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["boardTasks"] }); }
  });

  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;
    const task = tasks.find(t => t.id === draggableId);
    if (!task) return;
    updateMutation.mutate({ id: task.id, data: { estado: destination.droppableId } });
  };

  const filtered = tasks.filter(t => {
    const matchesRole = roleFilter === "Todos" || t.rol_asignado === roleFilter;
    const matchesArea = areaFilter === "Todas" || t.area === areaFilter;
    const matchesSearch = !search || (t.titulo?.toLowerCase().includes(search.toLowerCase()) || t.descripcion?.toLowerCase().includes(search.toLowerCase()));
    return matchesRole && matchesArea && matchesSearch;
  });

  const columns = {
    pendiente: filtered.filter(t => t.estado === "pendiente"),
    en_progreso: filtered.filter(t => t.estado === "en_progreso"),
    bloqueado: filtered.filter(t => t.estado === "bloqueado"),
    hecho: filtered.filter(t => t.estado === "hecho"),
  };

  const handleSubmit = (payload) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate({ ...payload });
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Tareas Junta</h1>
          <p className="text-slate-600 text-sm">Asigna y gestiona tareas por rol (Presidente, Vice, Secretaría, Tesorería, Vocales)</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { setEditing(null); setShowForm(!showForm); }} className="bg-orange-600 hover:bg-orange-700">
            <Plus className="w-4 h-4 mr-2" /> Nueva tarea
          </Button>
        </div>
      </div>

      {showForm && (
        <BoardTaskForm
          task={editing}
          onSubmit={handleSubmit}
          onCancel={()=>{ setShowForm(false); setEditing(null); }}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
        />
      )}

      <div className="bg-white rounded-xl shadow p-3">
        <div className="flex flex-col lg:flex-row gap-2 lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 flex-1">
            <Filter className="w-4 h-4 text-slate-500" />
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Rol" /></SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map(r => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={areaFilter} onValueChange={setAreaFilter}>
              <SelectTrigger className="w-56"><SelectValue placeholder="Área" /></SelectTrigger>
              <SelectContent>
                {AREAS.map(a => (<SelectItem key={a} value={a}>{a}</SelectItem>))}
              </SelectContent>
            </Select>
            <Input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Buscar…" className="max-w-xs" />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12"><div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div></div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            <BoardKanbanColumn columnId="pendiente" title="Pendiente" tasks={columns.pendiente} onEdit={(t)=>{setEditing(t); setShowForm(true);}} onDelete={(t)=> deleteMutation.mutate(t.id)} />
            <BoardKanbanColumn columnId="en_progreso" title="En progreso" tasks={columns.en_progreso} onEdit={(t)=>{setEditing(t); setShowForm(true);}} onDelete={(t)=> deleteMutation.mutate(t.id)} />
            <BoardKanbanColumn columnId="bloqueado" title="Bloqueado" tasks={columns.bloqueado} onEdit={(t)=>{setEditing(t); setShowForm(true);}} onDelete={(t)=> deleteMutation.mutate(t.id)} />
            <BoardKanbanColumn columnId="hecho" title="Hecho" tasks={columns.hecho} onEdit={(t)=>{setEditing(t); setShowForm(true);}} onDelete={(t)=> deleteMutation.mutate(t.id)} />
          </div>
        </DragDropContext>
      )}
    </div>
  );
}
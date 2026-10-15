import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Filter, Clock3, AlertTriangle, CheckCircle2, ListTodo, ClipboardList } from "lucide-react";
import BoardTaskForm from "../components/board/BoardTaskForm";
import BoardKanbanColumn from "../components/board/BoardKanbanColumn";
import CompleteTaskDialog from "../components/board/CompleteTaskDialog";

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
  const [completeTask, setCompleteTask] = React.useState(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const canAccess = user?.role === "admin" || user?.es_junta === true;
  const canManageTasks = user?.role === "admin";

  const { data: boardMembers = [] } = useQuery({
    queryKey: ["boardTaskMembers"],
    queryFn: async () => {
      const members = await base44.entities.User.filter({ es_junta: true }, "full_name", 300);
      return (members || []).filter((member) => member.email && member.acceso_activo !== false);
    },
    enabled: canAccess,
    staleTime: 60_000,
  });

  const { data: tasks = [], isLoading, isError } = useQuery({
    queryKey: ["boardTasks"],
    queryFn: () => base44.entities.BoardTask.list("-updated_date", 500),
    initialData: [],
    enabled: canAccess,
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: (payload) => base44.entities.BoardTask.create(payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["boardTasks"] }); setShowForm(false); setEditing(null); }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BoardTask.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["boardTasks"] }); setEditing(null); setCompleteTask(null); }
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
  const today = new Date().toISOString().slice(0, 10);
  const activeTasks = tasks.filter((task) => task.estado !== "hecho");
  const overdueTasks = activeTasks.filter((task) => task.fecha_limite && task.fecha_limite < today);
  const dueSoonTasks = activeTasks.filter((task) => {
    if (!task.fecha_limite || task.fecha_limite < today) return false;
    const days = (new Date(`${task.fecha_limite}T00:00:00`) - new Date(`${today}T00:00:00`)) / 86400000;
    return days <= 7;
  });

  const handleSubmit = (payload) => {
    if (!canManageTasks) return;
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate({ ...payload });
    }
  };

  if (user && !canAccess) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
          <div className="text-4xl mb-3">🔒</div>
          <h1 className="text-xl font-bold text-slate-900">Área privada de la Junta</h1>
          <p className="mt-2 text-sm text-slate-600">Tu usuario no tiene permiso para consultar las tareas. Si necesitas acceso, pídeselo a un administrador del club.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <div className="p-8 text-center text-slate-600">Comprobando permisos de acceso…</div>;
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 px-3 pb-8 pt-4 sm:px-5 lg:space-y-6 lg:px-8 lg:pt-7">
      <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-lg sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-400/15 ring-1 ring-orange-200/20 sm:h-14 sm:w-14"><ClipboardList className="h-6 w-6 text-orange-300 sm:h-7 sm:w-7" /></div>
            <div className="min-w-0">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">Administración · Organización interna</p>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Tareas de la Junta</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">Organiza acuerdos, asigna responsables y controla los plazos en un espacio privado para la Junta.</p>
            </div>
          </div>
          {canManageTasks ? (
            <Button onClick={() => { setEditing(null); setShowForm(!showForm); }} className="min-h-11 w-full bg-orange-500 text-white hover:bg-orange-600 sm:w-auto">
              <Plus className="mr-2 h-4 w-4" /> Nueva tarea
            </Button>
          ) : (
            <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-slate-200">Consulta y seguimiento de tareas</div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-2 text-slate-600"><span className="text-xs sm:text-sm">Tareas activas</span><ListTodo className="h-5 w-5 shrink-0 text-slate-500" /></div>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{activeTasks.length}</p>
          <p className="mt-1 text-xs text-slate-500">Pendientes, en curso o bloqueadas</p>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-2 text-red-700"><span className="text-xs sm:text-sm">Fuera de plazo</span><AlertTriangle className="h-5 w-5 shrink-0" /></div>
          <p className="mt-2 text-3xl font-bold tracking-tight text-red-800">{overdueTasks.length}</p>
          <p className="mt-1 text-xs text-red-700">Requieren revisión prioritaria</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-2 text-amber-700"><span className="text-xs sm:text-sm">Vencen en 7 días</span><Clock3 className="h-5 w-5 shrink-0" /></div>
          <p className="mt-2 text-3xl font-bold tracking-tight text-amber-800">{dueSoonTasks.length}</p>
          <p className="mt-1 text-xs text-amber-700">Plazos próximos</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-2 text-emerald-700"><span className="text-xs sm:text-sm">Completadas</span><CheckCircle2 className="h-5 w-5 shrink-0" /></div>
          <p className="mt-2 text-3xl font-bold tracking-tight text-emerald-800">{tasks.filter((task) => task.estado === "hecho").length}</p>
          <p className="mt-1 text-xs text-emerald-700">Acuerdos ya cerrados</p>
        </div>
      </div>

      {showForm && canManageTasks && (
        <BoardTaskForm
          task={editing}
          users={boardMembers}
          onSubmit={handleSubmit}
          onCancel={()=>{ setShowForm(false); setEditing(null); }}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
        />
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800"><Filter className="h-4 w-4 text-orange-600" /> Filtrar tareas</div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(150px,0.7fr)_minmax(190px,1fr)_minmax(220px,1.4fr)]">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="min-h-10 w-full"><SelectValue placeholder="Filtrar por rol" /></SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map(r => (<SelectItem key={r} value={r}>{r === "Todos" ? "Todos los roles" : r}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={areaFilter} onValueChange={setAreaFilter}>
            <SelectTrigger className="min-h-10 w-full"><SelectValue placeholder="Filtrar por área" /></SelectTrigger>
            <SelectContent>
              {AREAS.map(a => (<SelectItem key={a} value={a}>{a === "Todas" ? "Todas las áreas" : a}</SelectItem>))}
            </SelectContent>
          </Select>
          <Input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Buscar por título o descripción…" className="min-h-10 w-full" />
        </div>
      </section>

      {isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">No se han podido cargar las tareas. Comprueba que el usuario tiene permiso de Junta o administrador y vuelve a intentarlo.</div>
      ) : isLoading ? (
        <div className="text-center py-12"><div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div></div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            <BoardKanbanColumn columnId="pendiente" title="Pendiente" tasks={columns.pendiente} canManage={canManageTasks} onEdit={(t)=>{if (canManageTasks) {setEditing(t); setShowForm(true);}}} onDelete={(t)=>{if (canManageTasks) deleteMutation.mutate(t.id);}} onComplete={(t)=> setCompleteTask(t)} />
            <BoardKanbanColumn columnId="en_progreso" title="En progreso" tasks={columns.en_progreso} canManage={canManageTasks} onEdit={(t)=>{if (canManageTasks) {setEditing(t); setShowForm(true);}}} onDelete={(t)=>{if (canManageTasks) deleteMutation.mutate(t.id);}} onComplete={(t)=> setCompleteTask(t)} />
            <BoardKanbanColumn columnId="bloqueado" title="Bloqueado" tasks={columns.bloqueado} canManage={canManageTasks} onEdit={(t)=>{if (canManageTasks) {setEditing(t); setShowForm(true);}}} onDelete={(t)=>{if (canManageTasks) deleteMutation.mutate(t.id);}} onComplete={(t)=> setCompleteTask(t)} />
            <BoardKanbanColumn columnId="hecho" title="Hecho" tasks={columns.hecho} canManage={canManageTasks} onEdit={(t)=>{if (canManageTasks) {setEditing(t); setShowForm(true);}}} onDelete={(t)=>{if (canManageTasks) deleteMutation.mutate(t.id);}} onComplete={(t)=> setCompleteTask(t)} />
          </div>
        </DragDropContext>
      )}

      {/* Completar tarea - explicación */}
      <CompleteTaskDialog
        open={!!completeTask}
        task={completeTask}
        onCancel={()=>setCompleteTask(null)}
        onConfirm={(mensaje)=>{
          if (!completeTask || !user) return;
          const nuevosComentarios = [ ...(completeTask.comentarios || []), {
            autor_email: user.email,
            autor_nombre: user.full_name || "",
            mensaje: mensaje && mensaje.trim() ? mensaje.trim() : "Tarea marcada como hecha",
            fecha: new Date().toISOString()
          } ];
          updateMutation.mutate({ id: completeTask.id, data: {
            estado: 'hecho',
            fecha_cierre: new Date().toISOString(),
            cerrado_por_email: user.email,
            cerrado_por_nombre: user.full_name || "",
            comentarios: nuevosComentarios
          }});
        }}
      />
    </div>
  );
}
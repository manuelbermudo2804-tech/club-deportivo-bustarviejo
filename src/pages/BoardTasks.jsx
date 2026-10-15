import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Filter, Clock3, AlertTriangle, CheckCircle2, ListTodo, ClipboardList, CalendarDays, Download, LayoutGrid, UserRound } from "lucide-react";
import BoardTaskForm from "../components/board/BoardTaskForm";
import BoardMeetingForm from "../components/board/BoardMeetingForm";
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
  const [taskView, setTaskView] = React.useState("tablero");
  const [myTasksOnly, setMyTasksOnly] = React.useState(false);
  const [showMeetingForm, setShowMeetingForm] = React.useState(false);
  const [editingMeeting, setEditingMeeting] = React.useState(null);
  const [selectedMeetingId, setSelectedMeetingId] = React.useState("");
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

  const { data: meetings = [], isLoading: meetingsLoading } = useQuery({
    queryKey: ["boardMeetings"],
    queryFn: () => base44.entities.BoardMeeting.list("-fecha_reunion", 300),
    enabled: canAccess,
    retry: false,
  });

  const createMeetingMutation = useMutation({
    mutationFn: (payload) => base44.entities.BoardMeeting.create(payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["boardMeetings"] }); setShowMeetingForm(false); setEditingMeeting(null); }
  });
  const updateMeetingMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BoardMeeting.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["boardMeetings"] }); setShowMeetingForm(false); setEditingMeeting(null); }
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
    const timestamp = new Date().toISOString();
    const activity = { tipo: "estado", autor_email: user?.email || "", autor_nombre: user?.full_name || "", detalle: `Estado cambiado de ${task.estado} a ${destination.droppableId}`, fecha: timestamp };
    updateMutation.mutate({ id: task.id, data: { estado: destination.droppableId, historial: [...(task.historial || []), activity] } });
  };

  const filtered = tasks.filter(t => {
    const matchesRole = roleFilter === "Todos" || t.rol_asignado === roleFilter;
    const matchesArea = areaFilter === "Todas" || t.area === areaFilter;
    const matchesSearch = !search || (t.titulo?.toLowerCase().includes(search.toLowerCase()) || t.descripcion?.toLowerCase().includes(search.toLowerCase()));
    const matchesMine = !myTasksOnly || t.asignado_a_email === user?.email || (t.rol_asignado && t.rol_asignado === user?.cargo_junta);
    return matchesRole && matchesArea && matchesSearch && matchesMine;
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
    const timestamp = new Date().toISOString();
    const activity = { tipo: editing ? "edicion" : "creacion", autor_email: user?.email || "", autor_nombre: user?.full_name || "", detalle: editing ? "Registro actualizado por administración" : "Registro creado", fecha: timestamp };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: { ...payload, historial: [...(editing.historial || []), activity] } });
    } else {
      createMutation.mutate({ ...payload, creado_por_email: user?.email || "", creado_por_nombre: user?.full_name || "", historial: [activity] });
    }
  };

  const exportReport = () => {
    const headers = ["Tipo", "Título", "Descripción", "Estado", "Prioridad", "Área", "Rol responsable", "Email responsable", "Fecha límite", "Último avance"];
    const rows = filtered.map((task) => [task.tipo_registro || "tarea", task.titulo, task.descripcion, task.estado, task.prioridad, task.area, task.rol_asignado, task.asignado_a_email, task.fecha_limite, task.comentarios?.[task.comentarios.length - 1]?.mensaje || ""]);
    const clean = (value) => String(value ?? "").replace(/;/g, ",").replace(/\\r?\\n/g, " ");
    const csv = "\\uFEFF" + [headers, ...rows].map((row) => row.map(clean).join(";")).join("\\r\\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `seguimiento-junta-${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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

      {showForm && canManageTasks && taskView !== "actas" && (
        <BoardTaskForm
          task={editing}
          users={boardMembers}
          meetings={meetings}
          defaultMeetingId={selectedMeetingId}
          onSubmit={handleSubmit}
          onCancel={()=>{ setShowForm(false); setEditing(null); setSelectedMeetingId(""); }}
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

      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant={taskView === "tablero" ? "default" : "outline"} onClick={() => setTaskView("tablero")} className={taskView === "tablero" ? "bg-slate-900" : ""}><LayoutGrid className="mr-2 h-4 w-4" /> Tablero</Button>
          <Button type="button" variant={taskView === "calendario" ? "default" : "outline"} onClick={() => setTaskView("calendario")} className={taskView === "calendario" ? "bg-slate-900" : ""}><CalendarDays className="mr-2 h-4 w-4" /> Por fecha</Button>
          <Button type="button" variant={taskView === "actas" ? "default" : "outline"} onClick={() => setTaskView("actas")} className={taskView === "actas" ? "bg-slate-900" : ""}><ClipboardList className="mr-2 h-4 w-4" /> Actas y acuerdos</Button>
          <Button type="button" variant={myTasksOnly ? "default" : "outline"} onClick={() => setMyTasksOnly((value) => !value)} className={myTasksOnly ? "bg-orange-600 hover:bg-orange-700" : ""}><UserRound className="mr-2 h-4 w-4" /> {myTasksOnly ? "Mis tareas" : "Ver mis tareas"}</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {taskView === "actas" && canManageTasks && <Button type="button" onClick={() => { setEditingMeeting(null); setShowMeetingForm((value) => !value); }} className="min-h-10 bg-orange-600 text-white hover:bg-orange-700"><Plus className="mr-2 h-4 w-4" /> Nueva acta</Button>}
          <Button type="button" variant="outline" onClick={exportReport} className="min-h-10"><Download className="mr-2 h-4 w-4" /> Exportar informe CSV</Button>
        </div>
      </section>

      {isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">No se han podido cargar las tareas. Comprueba que el usuario tiene permiso de Junta o administrador y vuelve a intentarlo.</div>
      ) : isLoading ? (
        <div className="text-center py-12"><div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div></div>
      ) : taskView === "actas" ? (
        <section className="space-y-4">
          {showMeetingForm && canManageTasks && <BoardMeetingForm meeting={editingMeeting} onCancel={() => { setShowMeetingForm(false); setEditingMeeting(null); }} isSubmitting={createMeetingMutation.isPending || updateMeetingMutation.isPending} onSubmit={(payload) => {
            if (!canManageTasks) return;
            const data = { ...payload, creado_por_email: user.email || "", creado_por_nombre: user.full_name || "" };
            if (editingMeeting) updateMeetingMutation.mutate({ id: editingMeeting.id, data });
            else createMeetingMutation.mutate(data);
          }} />}
          {meetingsLoading ? <div className="rounded-xl border p-8 text-center text-sm text-slate-500">Cargando actas…</div> : meetings.slice().sort((a, b) => (b.fecha_reunion || "").localeCompare(a.fecha_reunion || "")).map((meeting) => (
            <article key={meeting.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1"><p className="text-xs font-semibold uppercase tracking-wide text-orange-700">{meeting.fecha_reunion}</p><h3 className="mt-1 text-lg font-bold text-slate-900">{meeting.titulo}</h3>{meeting.asistentes && <p className="mt-1 text-xs text-slate-500">Asistentes: {meeting.asistentes}</p>}</div>
                {canManageTasks && <Button type="button" variant="outline" onClick={() => { setEditingMeeting(meeting); setShowMeetingForm(true); }}><ClipboardList className="mr-2 h-4 w-4" /> Editar acta</Button>}
              </div>
              {meeting.orden_del_dia && <div className="mt-4"><h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Puntos tratados</h4><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{meeting.orden_del_dia}</p></div>}
              {meeting.resumen && <div className="mt-4"><h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Resumen</h4><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{meeting.resumen}</p></div>}
              {meeting.acuerdos && <div className="mt-4 rounded-xl border border-orange-100 bg-orange-50/60 p-3"><h4 className="text-xs font-bold uppercase tracking-wide text-orange-800">Acuerdos y decisiones</h4><p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{meeting.acuerdos}</p>{canManageTasks && <Button type="button" size="sm" variant="outline" className="mt-3 bg-white" onClick={() => { setEditing(null); setSelectedMeetingId(meeting.id); setShowForm(true); setTaskView("tablero"); }}>Crear tarea vinculada a esta acta</Button>}</div>}
              <div className="mt-3 text-xs text-slate-400">Registrada por {meeting.creado_por_nombre || meeting.creado_por_email || "Administración"}</div>
            </article>
          ))}
          {!meetingsLoading && meetings.length === 0 && !showMeetingForm && <div className="rounded-xl border border-dashed p-8 text-center"><FileText className="mx-auto mb-2 h-8 w-8 text-slate-400" /><p className="font-semibold text-slate-800">Todavía no hay actas registradas</p><p className="mt-1 text-sm text-slate-500">Registra las reuniones y guarda sus acuerdos para que toda la Junta pueda consultarlos.</p></div>}
        </section>
      ) : taskView === "calendario" ? (
        <section className="space-y-3">
          {filtered.slice().sort((a, b) => (a.fecha_limite || "9999-12-31").localeCompare(b.fecha_limite || "9999-12-31")).map((task) => (
            <article key={task.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{task.fecha_limite || "Sin fecha límite"}</span><span className="text-xs text-slate-500">{task.estado === "en_progreso" ? "En progreso" : task.estado === "hecho" ? "Hecho" : task.estado === "bloqueado" ? "Bloqueado" : "Pendiente"}</span>{task.tipo_registro && task.tipo_registro !== "tarea" && <span className="text-xs text-orange-700">{task.tipo_registro}</span>}</div>
                <h3 className="mt-2 font-semibold text-slate-900">{task.titulo}</h3>
                {task.descripcion && <p className="mt-1 text-sm text-slate-600">{task.descripcion}</p>}
                <p className="mt-2 text-xs text-slate-500">Responsable: {task.asignado_a_email || task.rol_asignado || "Sin asignar"}</p>
              </div>
              {canManageTasks && <Button type="button" variant="outline" onClick={() => { setEditing(task); setShowForm(true); }}><ClipboardList className="mr-2 h-4 w-4" /> Editar</Button>}
            </article>
          ))}
          {filtered.length === 0 && <div className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">No hay tareas que coincidan con los filtros.</div>}
        </section>
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
          const timestamp = new Date().toISOString();
          const mensajeCierre = mensaje && mensaje.trim() ? mensaje.trim() : "Tarea marcada como hecha";
          const nuevosComentarios = [ ...(completeTask.comentarios || []), {
            autor_email: user.email,
            autor_nombre: user.full_name || "",
            mensaje: mensajeCierre,
            fecha: timestamp
          } ];
          const nuevoHistorial = [ ...(completeTask.historial || []), {
            tipo: "cierre", autor_email: user.email, autor_nombre: user.full_name || "", detalle: mensajeCierre, fecha: timestamp
          } ];
          updateMutation.mutate({ id: completeTask.id, data: {
            estado: 'hecho',
            fecha_cierre: timestamp,
            cerrado_por_email: user.email,
            cerrado_por_nombre: user.full_name || "",
            comentarios: nuevosComentarios,
            historial: nuevoHistorial
          }});
        }}
      />
    </div>
  );
}
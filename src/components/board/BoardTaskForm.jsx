import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, WandSparkles, CheckCircle2, Mic, MicOff } from "lucide-react";

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
const TYPES = [
  { value: "tarea", label: "Tarea", help: "Una acción concreta que alguien debe realizar." },
  { value: "acuerdo", label: "Acuerdo", help: "Una decisión adoptada por la Junta y cómo llevarla a cabo." },
  { value: "incidencia", label: "Incidencia", help: "Un problema que necesita solución o seguimiento." },
  { value: "seguimiento", label: "Seguimiento", help: "Una cuestión pendiente de revisar o comprobar." }
];

const initialData = (task) => ({
  tipo_registro: task?.tipo_registro || "tarea",
  titulo: task?.titulo || "",
  descripcion: task?.descripcion || "",
  area: task?.area || "",
  prioridad: task?.prioridad || "media",
  estado: task?.estado || "pendiente",
  fecha_limite: task?.fecha_limite || "",
  rol_asignado: task?.rol_asignado || "",
  asignado_a_email: task?.asignado_a_email || "",
  ...task
});

function buildDraft(data) {
  const title = data.titulo.trim();
  const details = data.descripcion.trim();
  const kind = TYPES.find((item) => item.value === data.tipo_registro)?.label || "Tarea";
  const sentences = [];
  if (title) sentences.push(title.endsWith(".") ? title : title + ".");
  if (details) sentences.push(details.endsWith(".") ? details : details + ".");
  const responsibility = data.rol_asignado || "";
  if (responsibility) sentences.push("Área responsable: " + (data.area || "por determinar") + ". Responsable: " + responsibility + ".");
  else if (data.area) sentences.push("Área responsable: " + data.area + ".");
  if (data.fecha_limite) {
    const date = new Date(data.fecha_limite + "T12:00:00");
    const formatted = Number.isNaN(date.getTime()) ? data.fecha_limite : new Intl.DateTimeFormat("es-ES", { dateStyle: "long" }).format(date);
    sentences.push("Fecha prevista: " + formatted + ".");
  }
  const intro = {
    tarea: "Se registra la siguiente tarea.",
    acuerdo: "Se registra el siguiente acuerdo de la Junta.",
    incidencia: "Se registra la siguiente incidencia para su resolución.",
    seguimiento: "Se registra el siguiente punto de seguimiento."
  }[data.tipo_registro] || "Se registra la siguiente tarea.";
  return { kind, text: [intro, ...sentences].join("\n\n") };
}

export default function BoardTaskForm({ task, users = [], onSubmit, onCancel, isSubmitting }) {
  const [data, setData] = React.useState(() => initialData(task));
  const [attemptedSubmit, setAttemptedSubmit] = React.useState(false);
  const [dictation, setDictation] = React.useState("");
  const [isListening, setIsListening] = React.useState(false);
  const [voiceMessage, setVoiceMessage] = React.useState("");
  const recognitionRef = React.useRef(null);
  const draft = React.useMemo(() => buildDraft(data), [data]);
  const titleMissing = attemptedSubmit && !data.titulo.trim();

  const update = (field, value) => setData((current) => ({ ...current, [field]: value }));

  const startDictation = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceMessage("Este navegador no admite dictado por voz. Puedes usar el dictado del teclado o escribir el texto.");
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "es-ES";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onstart = () => { setIsListening(true); setVoiceMessage("Te escucho… habla con naturalidad."); };
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results || []).map((result) => result[0]?.transcript || "").join(" ").trim();
        if (transcript) setDictation((current) => current ? current + " " + transcript : transcript);
        setVoiceMessage(transcript ? "Dictado recibido. Revísalo antes de incorporarlo." : "No se ha reconocido texto. Prueba otra vez.");
      };
      recognition.onerror = (event) => setVoiceMessage(event.error === "not-allowed" ? "No hay permiso para usar el micrófono. Revisa los permisos del navegador." : "No se ha podido completar el dictado. Puedes intentarlo de nuevo.");
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      setVoiceMessage("No se ha podido iniciar el micrófono. Comprueba los permisos del navegador.");
    }
  };

  const applyDictation = () => {
    const text = dictation.trim();
    if (!text) return;
    setData((current) => ({
      ...current,
      titulo: current.titulo.trim() ? current.titulo : text.split(/[.!?\\n]/)[0].trim().slice(0, 120),
      descripcion: current.descripcion.trim() ? current.descripcion.trim() + "\\n\\n" + text : text
    }));
    setVoiceMessage("Texto incorporado. Comprueba el título, el responsable y la fecha antes de guardar.");
  };

  React.useEffect(() => () => { recognitionRef.current?.abort?.(); }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    setAttemptedSubmit(true);
    if (!data.titulo.trim()) return;
    onSubmit({ ...data, titulo: data.titulo.trim(), descripcion: data.descripcion.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-700"><FileText className="h-5 w-5" /></div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">{task ? "Editar registro" : "Nuevo registro de Junta"}</h2>
          <p className="mt-1 text-sm text-slate-600">Completa los datos y el sistema preparará un texto claro con reglas y plantillas locales, sin utilizar inteligencia artificial.</p>
        </div>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-semibold text-slate-800" htmlFor="board-record-type">¿Qué quieres registrar?</label>
        <Select value={data.tipo_registro || "tarea"} onValueChange={(value) => update("tipo_registro", value)}>
          <SelectTrigger id="board-record-type" className="min-h-11"><SelectValue placeholder="Selecciona el tipo" /></SelectTrigger>
          <SelectContent>{TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent>
        </Select>
        <p className="text-xs text-slate-500">{TYPES.find((type) => type.value === data.tipo_registro)?.help}</p>
      </div>

      <section className="grid gap-3 rounded-xl border border-sky-200 bg-sky-50/70 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-sky-700"><Mic className="h-5 w-5" /></div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-900">Dictar tarea por voz</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">Cuenta qué hay que hacer. El dictado solo convierte voz en texto; no usa IA ni asigna automáticamente fechas o responsables. Revisa los datos antes de guardar.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant={isListening ? "destructive" : "outline"} onClick={startDictation} disabled={isListening} className="min-h-10 bg-white">
            {isListening ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}{isListening ? "Escuchando…" : "Empezar dictado"}
          </Button>
          <Button type="button" onClick={applyDictation} disabled={!dictation.trim()} className="min-h-10 bg-sky-700 text-white hover:bg-sky-800">Incorporar al formulario</Button>
          {dictation && <Button type="button" variant="ghost" onClick={() => { setDictation(""); setVoiceMessage(""); }}>Borrar dictado</Button>}
        </div>
        {dictation && <Textarea aria-label="Texto reconocido por voz" value={dictation} onChange={(event) => setDictation(event.target.value)} rows={3} placeholder="El texto reconocido aparecerá aquí; puedes corregirlo antes de incorporarlo." />}
        {voiceMessage && <p role="status" className="text-xs text-slate-600">{voiceMessage}</p>}
      </section>

      <div className="grid gap-2">
        <label className="text-sm font-semibold text-slate-800" htmlFor="board-task-title">Título <span className="text-red-600">*</span></label>
        <Input id="board-task-title" value={data.titulo || ""} onChange={(event) => update("titulo", event.target.value)} placeholder={
          data.tipo_registro === "acuerdo" ? "Ej. Aprobar la compra de balones" :
          data.tipo_registro === "incidencia" ? "Ej. Reparación de la canasta del pabellón" :
          data.tipo_registro === "seguimiento" ? "Ej. Confirmar disponibilidad de la pista" :
          "Ej. Solicitar presupuesto para equipaciones"
        } aria-invalid={!!titleMissing} required />
        {titleMissing && <p className="text-xs text-red-600">Escribe un título para poder guardar.</p>}
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-semibold text-slate-800" htmlFor="board-task-description">
          {data.tipo_registro === "acuerdo" ? "Decisión y acciones acordadas" :
           data.tipo_registro === "incidencia" ? "Qué ocurre y qué solución hace falta" :
           data.tipo_registro === "seguimiento" ? "Qué hay que comprobar o actualizar" : "Descripción y pasos necesarios"}
        </label>
        <Textarea id="board-task-description" value={data.descripcion || ""} onChange={(event) => update("descripcion", event.target.value)} placeholder={
          data.tipo_registro === "acuerdo" ? "Indica qué se ha decidido, los motivos y los siguientes pasos…" :
          data.tipo_registro === "incidencia" ? "Describe el problema, desde cuándo ocurre y qué queda por resolver…" :
          data.tipo_registro === "seguimiento" ? "Indica qué dato o respuesta está pendiente y cuándo revisarlo…" :
          "Describe qué hay que hacer y cualquier detalle útil…"
        } rows={4} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="grid content-start gap-2">
          <label className="text-sm font-medium text-slate-800">Área</label>
          <Select value={data.area || "sin_area"} onValueChange={(value) => update("area", value === "sin_area" ? "" : value)}>
            <SelectTrigger><SelectValue placeholder="Selecciona área" /></SelectTrigger>
            <SelectContent><SelectItem value="sin_area">Sin especificar</SelectItem>{AREAS.map((area) => <SelectItem key={area} value={area}>{area}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid content-start gap-2">
          <label className="text-sm font-medium text-slate-800">Prioridad</label>
          <Select value={data.prioridad || "media"} onValueChange={(value) => update("prioridad", value)}>
            <SelectTrigger><SelectValue placeholder="Prioridad" /></SelectTrigger>
            <SelectContent><SelectItem value="baja">Baja</SelectItem><SelectItem value="media">Media</SelectItem><SelectItem value="alta">Alta</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="grid content-start gap-2">
          <label className="text-sm font-medium text-slate-800">Estado</label>
          <Select value={data.estado || "pendiente"} onValueChange={(value) => update("estado", value)}>
            <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent><SelectItem value="pendiente">Pendiente</SelectItem><SelectItem value="en_progreso">En progreso</SelectItem><SelectItem value="bloqueado">Bloqueado</SelectItem><SelectItem value="hecho">Hecho</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="grid content-start gap-2">
          <label className="text-sm font-medium text-slate-800">Fecha límite</label>
          <Input type="date" value={data.fecha_limite || ""} onChange={(event) => update("fecha_limite", event.target.value)} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid content-start gap-2">
          <label className="text-sm font-medium text-slate-800">Rol responsable</label>
          <Select value={data.rol_asignado || "sin_rol"} onValueChange={(value) => update("rol_asignado", value === "sin_rol" ? "" : value)}>
            <SelectTrigger><SelectValue placeholder="Selecciona rol" /></SelectTrigger>
            <SelectContent><SelectItem value="sin_rol">Sin rol asignado</SelectItem>{ROLES.map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid content-start gap-2">
          <label className="text-sm font-medium text-slate-800">Persona responsable</label>
          <Select value={data.asignado_a_email || "sin_asignar"} onValueChange={(value) => update("asignado_a_email", value === "sin_asignar" ? "" : value)}>
            <SelectTrigger><SelectValue placeholder="Sin responsable asignado" /></SelectTrigger>
            <SelectContent><SelectItem value="sin_asignar">Sin responsable asignado</SelectItem>{users.map((person) => (
              <SelectItem key={person.id} value={person.email}>{person.full_name || person.nombre || person.email} · {person.cargo_junta || "Junta"}</SelectItem>
            ))}</SelectContent>
          </Select>
          <p className="text-xs text-slate-500">Solo aparecen miembros activos autorizados para el espacio de Junta.</p>
        </div>
      </div>

      <section className="rounded-2xl border border-orange-200 bg-orange-50/70 p-4 sm:p-5" aria-live="polite">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900"><WandSparkles className="h-4 w-4 text-orange-700" /> Vista previa de la redacción</div>
        <p className="mt-1 text-xs text-slate-600">Generada mediante una plantilla fija y reglas locales. No se envían los datos a ningún servicio de IA.</p>
        <div className="mt-3 whitespace-pre-wrap rounded-xl border border-orange-100 bg-white p-3 text-sm leading-relaxed text-slate-700">{draft.text || "El texto aparecerá aquí cuando añadas un título."}</div>
        <div className="mt-3 flex items-start gap-2 text-xs text-slate-600"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span>Revisa el texto antes de guardar. La vista previa ayuda a redactar, pero no sustituye la revisión del contenido del acuerdo o incidencia.</span></div>
      </section>

      <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={isSubmitting} className="bg-orange-600 text-white hover:bg-orange-700">{isSubmitting ? "Guardando…" : task ? "Guardar cambios" : "Crear registro"}</Button>
      </div>
    </form>
  );
}

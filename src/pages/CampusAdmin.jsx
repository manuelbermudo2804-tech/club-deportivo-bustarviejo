import React, { useCallback, useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { CalendarDays, Users, Euro, RefreshCw, Save, CheckCircle2, Trash2, Mail, MessageCircle, FileDown, Filter, UsersRound, UserCheck } from "lucide-react";
import { jsPDF } from "jspdf";

const GROUPS = [
  { key: "6-8", label: "Iniciación", range: "6–8 años" },
  { key: "9-11", label: "Intermedio", range: "9–11 años" },
  { key: "12-16", label: "Avanzado", range: "12–16 años" },
];
const WEEKS = [
  { key: "S1", label: "Semana 1", dates: "28 junio–2 julio" },
  { key: "S2", label: "Semana 2", dates: "5–9 julio" },
  { key: "S3", label: "Semana 3", dates: "12–16 julio" },
  { key: "S4", label: "Semana 4", dates: "19–23 julio" },
  { key: "S5", label: "Semana 5", dates: "26–30 julio" },
];
const money = (v) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(v || 0));
const naturalAge = (birth) => {
  if (!birth || !/^\\d{4}-\\d{2}-\\d{2}$/.test(birth)) return null;
  const year = Number(birth.slice(0, 4));
  return Number.isFinite(year) ? 2027 - year : null;
};
const groupForParticipant = (p) => {
  const age = naturalAge(p.fecha_nacimiento) ?? p.edad_inicio;
  return age == null ? p.grupo_edad : age <= 8 ? "6-8" : age <= 11 ? "9-11" : age <= 16 ? "12-16" : "fuera";
};

export default function CampusAdmin() {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState("resumen");
  const [communicationRecipient, setCommunicationRecipient] = useState("");
  const [testEmailRecipient, setTestEmailRecipient] = useState("manuelbermudo@hotmail.com");
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [communicationTemplate, setCommunicationTemplate] = useState("recepcion");
  const [communicationSubject, setCommunicationSubject] = useState("Hemos recibido tu solicitud · Campus 2027");
  const [communicationBody, setCommunicationBody] = useState("Hola,\\n\\nHemos recibido la solicitud de inscripción al Campus Deportivo 2027 del C.D. Bustarviejo. La inscripción queda pendiente de revisión por parte del club. Este mensaje no confirma plaza ni implica ningún cobro.\\n\\nMuchas gracias.\\nC.D. Bustarviejo");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [communicationLogs, setCommunicationLogs] = useState([]);
  const [filterText, setFilterText] = useState("");
  const [filterWeek, setFilterWeek] = useState("todas");
  const [filterAge, setFilterAge] = useState("todas");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [filterSocio, setFilterSocio] = useState("todos");
  const [filterManualGroup, setFilterManualGroup] = useState("todos");
  const [selectedParticipantIds, setSelectedParticipantIds] = useState([]);
  const [manualGroupName, setManualGroupName] = useState("");
  const [savingGroups, setSavingGroups] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(""); setNotice("");
    try {
      const me = await base44.auth.me();
      setUser(me);
      if (me?.role !== "admin") {
        setError("Esta sección está reservada a la administración del club.");
        setLoading(false); return;
      }
      const [cfg, regs, kids, logs] = await Promise.all([
        base44.entities.CampusSettings.list("-created_date", 5),
        base44.entities.CampusRegistration.list("-created_date", 500),
        base44.entities.CampusParticipant.list("-created_date", 1000),
        base44.entities.CampusCommunicationLog.list("-sent_at", 100),
      ]);
      setSettings(cfg?.[0] || null);
      setRegistrations(regs || []);
      setParticipants(kids || []);
      setCommunicationLogs(logs || []);
    } catch (e) {
      setError(e?.message || "No se han podido cargar los datos del campus.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const confirmedParticipants = participants.filter(p => !["cancelado", "lista_espera"].includes(p.estado));
  const confirmedRegistrations = registrations.filter(r => r.estado === "confirmada");
  const paid = registrations.filter(r => r.estado_pago === "pagado").reduce((s, r) => s + Number(r.importe_total || 0), 0);
  const groupStats = useMemo(() => GROUPS.map(g => {
    const list = confirmedParticipants.filter(p => groupForParticipant(p) === g.key);
    return { ...g, count: list.length };
  }), [confirmedParticipants, settings]);

  const weekStats = useMemo(() => WEEKS.map(w => ({
    ...w,
    count: confirmedParticipants.filter(p => (p.semanas_ocupadas || []).includes(w.key)).length,
  })), [confirmedParticipants]);

  const manualGroups = useMemo(() => [...new Set(participants.map(p => (p.grupo_manual || "").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es")), [participants]);
  const filteredParticipants = useMemo(() => participants.filter(p => {
    const reg = registrations.find(r => r.id === p.registration_id);
    const age = naturalAge(p.fecha_nacimiento) ?? p.edad_inicio;
    const haystack = `${p.nombre || ""} ${reg?.adulto_nombre || ""} ${reg?.adulto_email || ""} ${reg?.adulto_telefono || ""}`.toLocaleLowerCase("es");
    if (filterText.trim() && !haystack.includes(filterText.trim().toLocaleLowerCase("es"))) return false;
    if (filterWeek !== "todas" && !(p.semanas_ocupadas || []).includes(filterWeek)) return false;
    if (filterAge !== "todas" && groupForParticipant(p) !== filterAge) return false;
    if (filterStatus !== "todos" && (p.estado || "pendiente") !== filterStatus) return false;
    if (filterSocio !== "todos" && String(!!p.es_socio) !== filterSocio) return false;
    if (filterManualGroup === "sin_grupo" && p.grupo_manual) return false;
    if (filterManualGroup !== "todos" && filterManualGroup !== "sin_grupo" && (p.grupo_manual || "") !== filterManualGroup) return false;
    return true;
  }).sort((a,b)=>(a.nombre||"").localeCompare(b.nombre||"","es")), [participants, registrations, filterText, filterWeek, filterAge, filterStatus, filterSocio, filterManualGroup]);

  const toggleParticipant = (id) => setSelectedParticipantIds(ids => ids.includes(id) ? ids.filter(x=>x!==id) : [...ids,id]);
  const toggleVisibleParticipants = () => {
    const visibleIds = filteredParticipants.map(p=>p.id);
    const allSelected = visibleIds.length && visibleIds.every(id=>selectedParticipantIds.includes(id));
    setSelectedParticipantIds(ids => allSelected ? ids.filter(id=>!visibleIds.includes(id)) : [...new Set([...ids,...visibleIds])]);
  };
  const assignManualGroup = async () => {
    const name = manualGroupName.trim();
    if (!name || !selectedParticipantIds.length) { setError("Escribe el nombre del grupo y selecciona al menos un menor."); return; }
    if (!window.confirm(`¿Asignar ${selectedParticipantIds.length} menor(es) al grupo «${name}»?`)) return;
    setSavingGroups(true); setError(""); setNotice("");
    try {
      const chosen = participants.filter(p=>selectedParticipantIds.includes(p.id));
      await Promise.all(chosen.map(p=>base44.entities.CampusParticipant.update(p.id,{grupo_manual:name})));
      setNotice(`${chosen.length} participante(s) asignados al grupo «${name}».`);
      setSelectedParticipantIds([]); setManualGroupName(""); await load();
    } catch(e) { setError(e?.message || "No se pudo guardar la asignación de grupos."); }
    finally { setSavingGroups(false); }
  };
  const clearManualGroup = async (name) => {
    const chosen = participants.filter(p=>p.grupo_manual===name);
    if (!chosen.length || !window.confirm(`¿Quitar el grupo «${name}» de ${chosen.length} menor(es)? No se borrarán las inscripciones.`)) return;
    setSavingGroups(true); setError(""); setNotice("");
    try {
      await Promise.all(chosen.map(p=>base44.entities.CampusParticipant.update(p.id,{grupo_manual:""})));
      setNotice(`Grupo «${name}» eliminado de los participantes.`); await load();
    } catch(e) { setError(e?.message || "No se pudo eliminar el grupo."); }
    finally { setSavingGroups(false); }
  };
  const exportParticipantsPdf = () => {
    const doc = new jsPDF({orientation:"landscape",unit:"mm",format:"a4"});
    const title = filterManualGroup !== "todos" ? `Campus 2027 · ${filterManualGroup==="sin_grupo"?"Sin grupo":filterManualGroup}` : "Campus Deportivo 2027 · Listado de participantes";
    doc.setFontSize(16); doc.text(title,14,15);
    doc.setFontSize(9); doc.text(`Listado: ${filteredParticipants.length} menores · Generado: ${new Date().toLocaleDateString("es-ES")}`,14,22);
    const headers = ["Menor","Edad","Familia","Teléfono","Semanas","Grupo manual","Estado"];
    const rows = filteredParticipants.map(p=>{
      const reg=registrations.find(r=>r.id===p.registration_id);
      return [p.nombre||"",String(naturalAge(p.fecha_nacimiento)??p.edad_inicio??""),reg?.adulto_nombre||"",reg?.adulto_telefono||"", (p.semanas_ocupadas||[]).join(", "),p.grupo_manual||"Sin asignar",p.estado||"pendiente"];
    });
    const widths=[45,15,48,28,35,48,25];
    let y=31; const pageH=190;
    const drawHeader=()=>{let x=14;doc.setFont("helvetica","bold");doc.setFontSize(8);headers.forEach((h,i)=>{doc.text(h,x,y);x+=widths[i];});y+=5;doc.setFont("helvetica","normal");};
    drawHeader();
    rows.forEach(row=>{
      const cells=row.map((v,i)=>doc.splitTextToSize(String(v),widths[i]-2));
      const rowH=Math.max(...cells.map(c=>c.length))*4+3;
      if(y+rowH>pageH){doc.addPage();y=15;drawHeader();}
      let x=14;cells.forEach((lines,i)=>{doc.text(lines,x,y);x+=widths[i];});
      y+=rowH;doc.setDrawColor(225);doc.line(14,y-1,277,y-1);
    });
    doc.save("campus-2027-listado-participantes.pdf");
  };

  const deleteRegistration = async (registration) => {
    const kids = participants.filter(p => p.registration_id === registration.id);
    const confirmed = window.confirm(`¿Borrar la inscripción de ${registration.adulto_nombre || "esta familia"} y sus ${kids.length} participante(s)? Esta acción no se puede deshacer.`);
    if (!confirmed) return;
    setDeletingId(registration.id); setError(""); setNotice("");
    try {
      // Eliminar primero los participantes asociados para no dejar fichas huérfanas.
      for (const kid of kids) await base44.entities.CampusParticipant.delete(kid.id);
      await base44.entities.CampusRegistration.delete(registration.id);
      // Si la inscripción creó/vinculó una ficha provisional, retirar solo los enlaces de estos participantes.
      if (registration.club_member_id) {
        const member = await base44.entities.ClubMember.get(registration.club_member_id);
        if (member) {
          const removedIds = new Set(kids.map(k => k.id));
          await base44.entities.ClubMember.update(member.id, {
            campus_participantes: (member.campus_participantes || []).filter(x => !removedIds.has(x.participante_id))
          });
        }
      }
      setNotice(`Inscripción de ${registration.adulto_nombre || "la familia"} eliminada junto con sus participantes.`);
      await load();
    } catch (e) {
      setError(e?.message || "No se pudo eliminar la inscripción completa. Revisa los registros asociados.");
      await load();
    } finally { setDeletingId(null); }
  };

  const applyCommunicationTemplate = (key) => {
    const templates = {
      recepcion: ["Hemos recibido tu solicitud · Campus 2027", "Hola,\\n\\nHemos recibido la solicitud de inscripción al Campus Deportivo 2027 del C.D. Bustarviejo. La inscripción queda pendiente de revisión por parte del club. Este mensaje no confirma plaza ni implica ningún cobro.\\n\\nMuchas gracias.\\nC.D. Bustarviejo"],
      documentacion: ["Información del Campus Deportivo 2027", "Hola,\\n\\nTe enviamos la información general del Campus Deportivo 2027. La documentación definitiva y cualquier indicación específica se comunicarán cuando estén cerradas la organización y las condiciones del servicio.\\n\\nC.D. Bustarviejo"],
      horarios: ["Horarios y organización · Campus 2027", "Hola,\\n\\nEl horario previsto del Campus es de 09:00 a 14:00. La distribución definitiva de grupos, turnos y actividades se comunicará cuando esté confirmada.\\n\\nC.D. Bustarviejo"],
      material: ["Material necesario · Campus 2027", "Hola,\\n\\nComo orientación, los menores deberán traer ropa y calzado deportivo, muda, almuerzo, botella de agua, gorra y protección solar. En las jornadas de piscina se indicará el material específico.\\n\\nC.D. Bustarviejo"],
      aviso: ["Aviso importante · Campus 2027", "Hola,\\n\\nTe escribimos para comunicarte una actualización relativa al Campus Deportivo 2027:\\n\\n[Escribe aquí el aviso]\\n\\nC.D. Bustarviejo"],
      personalizado: ["Información Campus Deportivo 2027", "Hola,\\n\\n\\n\\nC.D. Bustarviejo"]
    };
    const draft = templates[key] || templates.personalizado;
    setCommunicationTemplate(key);
    setCommunicationSubject(draft[0]);
    setCommunicationBody(draft[1]);
  };

  const sendCampusEmail = async () => {
    const registration = registrations.find(r => r.id === communicationRecipient);
    if (!registration?.adulto_email) { setError("Selecciona una familia con correo electrónico."); return; }
    if (!communicationSubject.trim() || !communicationBody.trim()) { setError("Completa el asunto y el mensaje."); return; }
    if (!window.confirm(`¿Enviar este correo a ${registration.adulto_nombre} ( ${registration.adulto_email} )? El envío será real.`)) return;
    setSendingEmail(true); setError(""); setNotice("");
    try {
      const response = await base44.functions.invoke("campusCommunicationSend", {
        registration_id: registration.id, recipient_email: registration.adulto_email,
        recipient_name: registration.adulto_nombre, subject: communicationSubject,
        body: communicationBody, template_key: communicationTemplate
      });
      const result = response?.data || response;
      if (!result?.success) throw new Error(result?.error || "No se pudo confirmar el envío.");
      setNotice(`Correo enviado a ${registration.adulto_email}.`);
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "No se pudo enviar el correo.");
    } finally { setSendingEmail(false); }
  };

  const openCampusWhatsApp = () => {
    const registration = registrations.find(r => r.id === communicationRecipient);
    if (!registration?.adulto_telefono) { setError("La familia seleccionada no tiene un teléfono registrado."); return; }
    if (!communicationSubject.trim() || !communicationBody.trim()) { setError("Completa el asunto y el mensaje antes de abrir WhatsApp."); return; }
    let phone = String(registration.adulto_telefono).replace(/\D/g, "");
    if (phone.startsWith("00")) phone = phone.slice(2);
    if (phone.length === 9) phone = "34" + phone;
    if (phone.length < 10 || phone.length > 15) { setError("El teléfono registrado no parece válido. Revísalo en la inscripción."); return; }
    const body = communicationBody.replace(/\\n/g, "\n").replace(/\\r/g, "");
    const message = `*${communicationSubject.trim()}*\n\n${body}`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    setError("");
    setNotice("WhatsApp se ha abierto con el mensaje preparado. Revisa el contenido y pulsa Enviar en WhatsApp.");
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const sendTestEmail = async () => {
    const email = testEmailRecipient.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError("Introduce una dirección de correo válida."); return; }
    if (!window.confirm("¿Enviar un correo de PRUEBA a " + email + "? El envío será real.")) return;
    setSendingTestEmail(true); setError(""); setNotice("");
    try {
      const response = await base44.functions.invoke("campusCommunicationSend", {
        test_mode: true,
        recipient_email: email,
        subject: "Prueba de envío · Campus Deportivo 2027",
        body: "Hola,\n\nEste es un correo de prueba del sistema de comunicaciones del Campus Deportivo 2027 del C.D. Bustarviejo.\n\nSi has recibido este mensaje, la función de envío está operativa.\n\nC.D. Bustarviejo"
      });
      const result = response?.data || response;
      if (!result?.success) throw new Error(result?.error || "No se pudo confirmar el envío.");
      setNotice(result.message || ("Correo de prueba enviado a " + email + "."));
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "No se pudo enviar el correo de prueba.");
    } finally { setSendingTestEmail(false); }
  };
  const updateSetting = (field, value) => setSettings(s => ({ ...s, [field]: value }));
  const saveSettings = async () => {
    if (!settings?.id) return;
    setSaving(true); setNotice(""); setError("");
    try {
      await base44.entities.CampusSettings.update(settings.id, {
        precio_semana_general: Number(settings.precio_semana_general), precio_semana_socio: Number(settings.precio_semana_socio),
        precio_quincena_general: Number(settings.precio_quincena_general), precio_quincena_socio: Number(settings.precio_quincena_socio),
        precio_mes_general: Number(settings.precio_mes_general), precio_mes_socio: Number(settings.precio_mes_socio),
        fecha_inicio: "2027-06-28", fecha_fin: "2027-07-30",
        cuota_socio: Number(settings.cuota_socio), notas_capacidad: settings.notas_capacidad || "",
      });
      setNotice("Configuración guardada correctamente.");
      await load();
    } catch (e) { setError(e?.message || "No se pudo guardar la configuración."); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="min-h-screen bg-slate-50 p-8 text-slate-600">Cargando panel del Campus 2027…</div>;
  if (error && !user) return <div className="max-w-3xl mx-auto p-8"><div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">{error}</div></div>;
  if (user?.role !== "admin") return <div className="max-w-3xl mx-auto p-8"><div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">{error || "Acceso restringido."}</div></div>;

  return <div className="min-h-screen bg-slate-50 p-4 md:p-8 space-y-6">
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div><p className="text-sm font-bold uppercase tracking-widest text-orange-600">C.D. Bustarviejo · Gestión</p><h1 className="text-3xl font-black text-slate-900">Campus Deportivo 2027</h1><p className="text-slate-500 mt-1">Inscripciones, plazas por edad, tarifas y seguimiento económico.</p></div>
      <button onClick={load} className="inline-flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-3 font-semibold text-slate-700 hover:bg-slate-100"><RefreshCw className="h-4 w-4"/>Actualizar datos</button>
    </div>

    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>}
    {notice && <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-800 flex gap-2"><CheckCircle2 className="h-5 w-5"/>{notice}</div>}
    {!settings && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">No existe una configuración del campus. Contacta con soporte para inicializarla.</div>}

    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {[
        ["Participantes", confirmedParticipants.length, Users],
        ["Inscripciones confirmadas", confirmedRegistrations.length, CheckCircle2],
        ["Ingresos cobrados", money(paid), Euro],
        ["Grupos de edad", "3", CalendarDays],
      ].map(([label, value, Icon]) => <div key={label} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center justify-between text-slate-500 text-sm"><span>{label}</span><Icon className="h-5 w-5 text-orange-500"/></div><div className="text-2xl md:text-3xl font-black text-slate-900 mt-2">{value}</div></div>)}
    </div>

    <div className="flex flex-wrap gap-2 border-b pb-3">
      {[["resumen","Resumen"],["inscripciones","Inscripciones"],["plazas","Participantes por edad"],["organizacion","Filtros y grupos"],["comunicaciones","Comunicaciones"],["configuracion","Tarifas y configuración"]].map(([key,label]) => <button key={key} onClick={()=>setTab(key)} className={`rounded-xl px-4 py-2 text-sm font-bold ${tab===key?"bg-slate-900 text-white":"bg-white border text-slate-600 hover:bg-slate-100"}`}>{label}</button>)}
    </div>

    {tab === "organizacion" && <section className="space-y-5">
      <div className="rounded-2xl border bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black flex items-center gap-2"><Filter className="h-5 w-5 text-orange-600"/>Filtros de participantes</h2><p className="text-sm text-slate-500">Combina filtros para localizar menores y preparar listados específicos.</p></div><button onClick={exportParticipantsPdf} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 font-bold text-white"><FileDown className="h-4 w-4"/>Exportar resultado a PDF</button></div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          <input value={filterText} onChange={e=>setFilterText(e.target.value)} placeholder="Buscar menor o familia…" className="rounded-xl border p-3"/>
          <select value={filterWeek} onChange={e=>setFilterWeek(e.target.value)} className="rounded-xl border p-3"><option value="todas">Todas las semanas</option>{WEEKS.map(w=><option key={w.key} value={w.key}>{w.label}</option>)}</select>
          <select value={filterAge} onChange={e=>setFilterAge(e.target.value)} className="rounded-xl border p-3"><option value="todas">Todas las edades</option>{GROUPS.map(g=><option key={g.key} value={g.key}>{g.label} · {g.range}</option>)}</select>
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="rounded-xl border p-3"><option value="todos">Todos los estados</option><option value="pendiente">Pendiente</option><option value="confirmado">Confirmado</option><option value="cancelado">Cancelado</option><option value="lista_espera">Lista de espera</option></select>
          <select value={filterSocio} onChange={e=>setFilterSocio(e.target.value)} className="rounded-xl border p-3"><option value="todos">Socios y no socios</option><option value="true">Socios</option><option value="false">No socios</option></select>
          <select value={filterManualGroup} onChange={e=>setFilterManualGroup(e.target.value)} className="rounded-xl border p-3"><option value="todos">Todos los grupos manuales</option><option value="sin_grupo">Sin grupo asignado</option>{manualGroups.map(g=><option key={g} value={g}>{g}</option>)}</select>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="font-bold">{filteredParticipants.length} menores encontrados</span><button onClick={()=>{setFilterText("");setFilterWeek("todas");setFilterAge("todas");setFilterStatus("todos");setFilterSocio("todos");setFilterManualGroup("todos");}} className="text-orange-700 font-bold">Limpiar filtros</button></div>
      </div>
      <div className="rounded-2xl border bg-white p-5 space-y-4">
        <div><h2 className="text-xl font-black flex items-center gap-2"><UsersRound className="h-5 w-5 text-orange-600"/>Crear y organizar grupos manualmente</h2><p className="text-sm text-slate-500">Selecciona menores del listado y asígnalos a un grupo con el nombre que quieras. La asignación queda guardada.</p></div>
        <div className="flex flex-col sm:flex-row gap-2"><input value={manualGroupName} onChange={e=>setManualGroupName(e.target.value)} placeholder="Nombre del grupo (ej. Grupo A, Mañana…)" className="flex-1 rounded-xl border p-3"/><button onClick={assignManualGroup} disabled={savingGroups||!selectedParticipantIds.length||!manualGroupName.trim()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3 font-bold text-white disabled:opacity-50"><UserCheck className="h-4 w-4"/>{savingGroups?"Guardando…":`Asignar ${selectedParticipantIds.length} seleccionados`}</button></div>
        {manualGroups.length>0&&<div className="flex flex-wrap gap-2">{manualGroups.map(g=><div key={g} className="flex items-center gap-2 rounded-full border bg-orange-50 px-3 py-1 text-sm"><span className="font-bold">{g}</span><span className="text-slate-500">{participants.filter(p=>p.grupo_manual===g).length}</span><button onClick={()=>clearManualGroup(g)} disabled={savingGroups} className="font-bold text-red-600">Quitar</button></div>)}</div>}
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-slate-500"><th className="p-2"><input type="checkbox" checked={filteredParticipants.length>0&&filteredParticipants.every(p=>selectedParticipantIds.includes(p.id))} onChange={toggleVisibleParticipants}/></th><th className="p-2">Menor</th><th className="p-2">Edad</th><th className="p-2">Familia</th><th className="p-2">Semanas</th><th className="p-2">Grupo manual</th><th className="p-2">Estado</th></tr></thead><tbody>{filteredParticipants.map(p=>{const reg=registrations.find(r=>r.id===p.registration_id);return <tr key={p.id} className="border-b last:border-0"><td className="p-2"><input type="checkbox" checked={selectedParticipantIds.includes(p.id)} onChange={()=>toggleParticipant(p.id)}/></td><td className="p-2 font-semibold">{p.nombre}</td><td className="p-2">{naturalAge(p.fecha_nacimiento)??p.edad_inicio??"—"}</td><td className="p-2">{reg?.adulto_nombre||"—"}<div className="text-xs text-slate-500">{reg?.adulto_telefono||""}</div></td><td className="p-2">{(p.semanas_ocupadas||[]).join(", ")}</td><td className="p-2">{p.grupo_manual||"Sin asignar"}</td><td className="p-2">{p.estado||"pendiente"}</td></tr>})}</tbody></table>{filteredParticipants.length===0&&<p className="py-8 text-center text-slate-500">No hay participantes con esos filtros.</p>}</div>
      </div>
    </section>}

    {tab === "comunicaciones" && <section className="grid xl:grid-cols-2 gap-5">
      <div className="rounded-2xl border bg-white p-5 space-y-4">
        <div><h2 className="text-xl font-black">Enviar comunicación a una familia</h2><p className="text-sm text-slate-500">El envío es siempre manual. No se envía nada al registrar una inscripción.</p></div>
        <label className="block text-sm font-bold">Familia destinataria
          <select value={communicationRecipient} onChange={e=>setCommunicationRecipient(e.target.value)} className="mt-2 w-full rounded-xl border p-3 font-normal">
            <option value="">Selecciona una inscripción</option>
            {registrations.filter(r=>r.adulto_email).map(r=><option key={r.id} value={r.id}>{r.adulto_nombre} · {r.adulto_email}</option>)}
          </select>
        </label>
        <label className="block text-sm font-bold">Plantilla
          <select value={communicationTemplate} onChange={e=>applyCommunicationTemplate(e.target.value)} className="mt-2 w-full rounded-xl border p-3 font-normal">
            <option value="recepcion">Recepción de solicitud</option><option value="documentacion">Dossier / documentación</option><option value="horarios">Horarios y grupos</option><option value="material">Material necesario</option><option value="aviso">Aviso o modificación</option><option value="personalizado">Mensaje personalizado</option>
          </select>
        </label>
        <label className="block text-sm font-bold">Asunto<input value={communicationSubject} onChange={e=>setCommunicationSubject(e.target.value)} className="mt-2 w-full rounded-xl border p-3 font-normal"/></label>
        <label className="block text-sm font-bold">Mensaje<textarea value={communicationBody} onChange={e=>setCommunicationBody(e.target.value)} rows="10" className="mt-2 w-full rounded-xl border p-3 font-normal"/></label>
        <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Revisa destinatario, asunto y contenido antes de enviar. El correo saldrá realmente y quedará registrado.</div>
        <div className="flex flex-wrap gap-3">
          <button onClick={sendCampusEmail} disabled={sendingEmail || !communicationRecipient} className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-3 font-bold text-white hover:bg-orange-700 disabled:opacity-50"><Mail className="h-4 w-4"/>{sendingEmail?"Enviando…":"Enviar correo manualmente"}</button>
          <button onClick={openCampusWhatsApp} disabled={!communicationRecipient || !registrations.find(r => r.id === communicationRecipient)?.adulto_telefono} className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 font-bold text-white hover:bg-green-700 disabled:opacity-50"><MessageCircle className="h-4 w-4"/>Preparar WhatsApp</button>
        </div>
        <p className="text-xs text-slate-500">WhatsApp se abrirá con el teléfono y el texto preparados. El mensaje no se envía automáticamente: tendrás que revisarlo y pulsar Enviar en WhatsApp.</p>
        <div className="rounded-xl border border-dashed border-orange-300 bg-orange-50/60 p-4 space-y-3">
          <div><h3 className="font-black text-slate-900">Prueba de envío</h3><p className="text-sm text-slate-600">Envía un mensaje de comprobación sin necesitar una inscripción previa.</p></div>
          <label className="block text-sm font-bold">Correo destinatario
            <input type="email" value={testEmailRecipient} onChange={e=>setTestEmailRecipient(e.target.value)} className="mt-2 w-full rounded-xl border bg-white p-3 font-normal"/>
          </label>
          <button onClick={sendTestEmail} disabled={sendingTestEmail || !testEmailRecipient.trim()} className="inline-flex items-center gap-2 rounded-xl border border-orange-600 bg-white px-5 py-3 font-bold text-orange-700 hover:bg-orange-100 disabled:opacity-50"><Mail className="h-4 w-4"/>{sendingTestEmail?"Enviando prueba…":"Enviar correo de prueba"}</button>
        </div>
      </div>
      <div className="rounded-2xl border bg-white p-5">
        <h2 className="text-xl font-black mb-4">Historial de comunicaciones</h2>
        {communicationLogs.length===0?<p className="text-sm text-slate-500">Todavía no se ha enviado ningún correo desde este módulo.</p>:<div className="space-y-3">{communicationLogs.map(log=><div key={log.id} className="rounded-xl border p-3"><div className="flex flex-wrap justify-between gap-2"><strong>{log.subject}</strong><span className="text-xs text-slate-500">{log.sent_at?new Date(log.sent_at).toLocaleString("es-ES"):""}</span></div><p className="text-sm text-slate-600">{log.recipient_name} · {log.recipient_email}</p><p className="text-xs text-slate-500">Enviado por {log.sent_by}</p></div>)}</div>}
      </div>
    </section>}

    {tab === "resumen" && <div className="grid xl:grid-cols-2 gap-5">
      <section className="rounded-2xl border bg-white p-5"><h2 className="font-black text-xl mb-4">Ocupación por grupo</h2><div className="space-y-5">{groupStats.map(g=><div key={g.key}><div className="flex justify-between gap-3 text-sm mb-2"><div><strong>{g.label}</strong><span className="text-slate-500 ml-2">{g.range}</span></div><strong>{g.count} participantes</strong></div><div className="h-3 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-orange-500" style={{width:`${Math.min(100,g.count*5)}%`}}/></div></div>)}</div><p className="text-xs text-slate-500 mt-4">Distribución informativa por edades. Las plazas están pendientes de definir según monitores, turnos, grupos y ratios de seguridad.</p></section>
      <section className="rounded-2xl border bg-white p-5"><h2 className="font-black text-xl mb-4">Ocupación por semana</h2><div className="space-y-3">{weekStats.map(w=><div key={w.key} className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><div><strong>{w.label}</strong><p className="text-xs text-slate-500">{w.dates}</p></div><strong className="text-xl">{w.count} participantes</strong></div>)}</div><p className="text-xs text-slate-500 mt-4">Las quincenas y el mes completo ocupan plaza en todas las semanas incluidas.</p></section>
    </div>}

    {tab === "inscripciones" && <section className="rounded-2xl border bg-white p-5 overflow-x-auto"><h2 className="font-black text-xl mb-4">Inscripciones familiares</h2>{registrations.length===0?<p className="text-slate-500 py-8 text-center">Todavía no hay inscripciones. Cuando se envíe el formulario público aparecerán aquí automáticamente.</p>:<table className="w-full text-sm"><thead><tr className="text-left border-b text-slate-500"><th className="p-3">Responsable</th><th className="p-3">Participantes</th><th className="p-3">Email</th><th className="p-3">Estado</th><th className="p-3">Alta socio</th><th className="p-3">Pago campus</th><th className="p-3 text-right">Total</th><th className="p-3 text-right">Acciones</th></tr></thead><tbody>{registrations.map(r=>{const kids=participants.filter(p=>p.registration_id===r.id);return <tr key={r.id} className="border-b last:border-0 align-top"><td className="p-3 font-semibold">{r.adulto_nombre}<div className="text-xs font-normal text-slate-500">{r.adulto_telefono}</div></td><td className="p-3">{kids.map(k=><div key={k.id} className="mb-3"><strong>{k.nombre}</strong><div className="text-xs text-slate-500">{k.fecha_nacimiento} · {(k.semanas_ocupadas||[]).join(", ")} · {k.grupo_edad}</div><details className="mt-2 rounded-lg bg-slate-50 p-2"><summary className="cursor-pointer text-xs font-bold text-orange-700">Ficha de salud y emergencia</summary><div className="mt-2 space-y-1 text-xs text-slate-700"><p><b>Alergias:</b> {k.alergias||"No indicado"}</p><p><b>Intolerancias:</b> {k.intolerancias||"No indicado"}</p><p><b>Medicación:</b> {k.medicacion||"No indicada"}</p><p><b>Observaciones:</b> {k.observaciones_medicas||"Ninguna"}</p><p><b>Emergencia:</b> {k.contacto_emergencia_nombre||"—"} · {k.contacto_emergencia_telefono||"—"}</p><p><b>Consentimiento salud:</b> {k.consentimiento_salud?"Sí":"No consta"}</p></div></details></div>)}</td><td className="p-3">{r.adulto_email}</td><td className="p-3">{r.estado}</td><td className="p-3">{r.estado_alta_socio||"no_requerida"}</td><td className="p-3">{r.estado_pago}</td><td className="p-3 text-right font-bold">{money(r.importe_total)}</td><td className="p-3 text-right"><button onClick={()=>deleteRegistration(r)} disabled={deletingId===r.id} className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50" title="Borrar inscripción y participantes"><Trash2 className="h-4 w-4"/>{deletingId===r.id?"Borrando…":"Borrar"}</button></td></tr>})}</tbody></table>}</section>}

    {tab === "plazas" && <section className="space-y-5">
      <div className="rounded-2xl border bg-white p-5">
        <h2 className="font-black text-xl mb-2">Participantes por edad</h2>
        <p className="text-sm text-slate-500 mb-5">Edad calculada a fecha de inicio del Campus: 28 de junio de 2027. Las plazas se definirán al organizar monitores, turnos, grupos por edades y ratios de seguridad.</p>
        <div className="grid md:grid-cols-3 gap-4">{groupStats.map(g=><div key={g.key} className="rounded-xl border p-4"><p className="font-bold">{g.label}</p><p className="text-sm text-slate-500">{g.range}</p><p className="text-3xl font-black mt-3">{g.count}</p><p className="text-xs text-slate-500">participantes inscritos</p></div>)}</div>
      </div>
      {GROUPS.map(group => {
        const groupKids = confirmedParticipants.filter(p => groupForParticipant(p) === group.key);
        return <div key={group.key} className="rounded-2xl border bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div><h3 className="text-lg font-black">{group.label}</h3><p className="text-sm text-slate-500">{group.range}</p></div>
            <span className="rounded-full bg-orange-50 px-3 py-1 text-sm font-bold text-orange-700">{groupKids.length} menores</span>
          </div>
          {groupKids.length === 0 ? <p className="py-5 text-center text-sm text-slate-400">Todavía no hay menores en este grupo.</p> :
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="border-b text-left text-slate-500"><th className="p-3">Menor</th><th className="p-3">Edad por año natural 2027</th><th className="p-3">Familia / correo</th><th className="p-3">Semanas</th><th className="p-3">Estado</th></tr></thead>
              <tbody>{groupKids.map(kid => {
                const registration = registrations.find(r => r.id === kid.registration_id);
                const calculatedAge = naturalAge(kid.fecha_nacimiento) ?? kid.edad_inicio;
                return <tr key={kid.id} className="border-b last:border-0 align-top">
                  <td className="p-3 font-semibold">{kid.nombre}<div className="text-xs font-normal text-slate-500">{kid.fecha_nacimiento || "Sin fecha"}</div></td>
                  <td className="p-3">{calculatedAge == null ? "—" : `${calculatedAge} años en 2027`}</td>
                  <td className="p-3">{registration?.adulto_nombre || "Familia sin localizar"}<div className="text-xs text-slate-500 break-all">{registration?.adulto_email || "Sin correo asociado"}</div></td>
                  <td className="p-3">{(kid.semanas_ocupadas || []).join(", ") || "—"}</td>
                  <td className="p-3">{kid.estado || "pendiente"}</td>
                </tr>;
              })}</tbody>
            </table></div>}
        </div>;
      })}
    </section>}

    {tab === "configuracion" && settings && <section className="rounded-2xl border bg-white p-5 space-y-6">
      <div><h2 className="font-black text-xl">Tarifas aprobadas para el modelo de trabajo</h2><p className="text-sm text-slate-500">Se mantienen los importes acordados: semana 60/55 €, quincena 110/95 €, julio 200/170 € y cuota de socio 25 €.</p></div>
      <div className="grid md:grid-cols-3 gap-4">{[
        ["Semana","precio_semana_general","precio_semana_socio"],["Quincena","precio_quincena_general","precio_quincena_socio"],["Julio completo","precio_mes_general","precio_mes_socio"]
      ].map(([label,general,socio])=><div key={label} className="rounded-xl border p-4 space-y-3"><h3 className="font-bold">{label}</h3><label className="block text-xs font-bold text-slate-500">No socio (€)<input type="number" min="0" value={settings[general]??0} onChange={e=>updateSetting(general,e.target.value)} className="mt-1 w-full rounded-lg border p-2 text-base text-slate-900"/></label><label className="block text-xs font-bold text-slate-500">Socio (€)<input type="number" min="0" value={settings[socio]??0} onChange={e=>updateSetting(socio,e.target.value)} className="mt-1 w-full rounded-lg border p-2 text-base text-slate-900"/></label></div>)}</div>
      <label className="block text-sm font-bold">Cuota anual de socio (€)<input type="number" min="0" value={settings.cuota_socio??25} onChange={e=>updateSetting("cuota_socio",e.target.value)} className="mt-2 w-full md:w-48 rounded-xl border p-3 font-normal"/></label>
      <label className="block text-sm font-bold">Notas de capacidad y seguridad<textarea value={settings.notas_capacidad||""} onChange={e=>updateSetting("notas_capacidad",e.target.value)} rows="3" className="mt-2 w-full rounded-xl border p-3 font-normal"/></label>
      <div className="flex flex-wrap items-center justify-between gap-3"><button onClick={saveSettings} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-3 font-bold text-white hover:bg-orange-700 disabled:opacity-60">{saving?<RefreshCw className="h-4 w-4 animate-spin"/>:<Save className="h-4 w-4"/>}{saving?"Guardando…":"Guardar configuración"}</button></div>
    </section>}
  </div>;
}

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { CalendarDays, Users, Euro, RefreshCw, Save, CheckCircle2, Trash2, Mail, MessageCircle, FileDown, Filter, UsersRound, UserCheck, Pencil, X } from "lucide-react";
import { jsPDF } from "jspdf";
import CampusAttendance from "@/components/campus/CampusAttendance";
import CampusMonitorManager from "@/components/campus/CampusMonitorManager";
import CampusWaitlistManager from "@/components/campus/CampusWaitlistManager";
import CampusOccupancyCalendar from "@/components/campus/CampusOccupancyCalendar";
import CampusPlazasResumen from "@/components/campus/CampusPlazasResumen";
import CampusMonitorPlanner from "@/components/campus/CampusMonitorPlanner";
import CampusListadosRapidos from "@/components/campus/CampusListadosRapidos";
import CampusNav from "@/components/campus/CampusNav";
import CampusFamiliaCard from "@/components/campus/CampusFamiliaCard";
import CampusWaitlistSwitch from "@/components/campus/CampusWaitlistSwitch";

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
const naturalAge = (birth, startDate) => {
  if (!birth || !/^\d{4}-\d{2}-\d{2}$/.test(birth) || !startDate) return null;
  const [by, bm, bd] = birth.split("-").map(Number);
  const [ry, rm, rd] = String(startDate).slice(0, 10).split("-").map(Number);
  if (![by, bm, bd, ry, rm, rd].every(Number.isFinite)) return null;
  let age = ry - by;
  if (rm < bm || (rm === bm && rd < bd)) age -= 1;
  return age;
};
const weekDateRange = (startDate, index) => {
  if (!startDate) return "Fechas por configurar";
  const start = new Date(`${startDate}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() + index * 7);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 4);
  const fmt = d => new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", timeZone: "UTC" }).format(d);
  return `${fmt(start)}–${fmt(end)}`;
};
const groupForParticipant = (p, startDate) => {
  const age = naturalAge(p.fecha_nacimiento, startDate) ?? p.edad_inicio;
  return age == null ? p.grupo_edad : age <= 8 ? "6-8" : age <= 11 ? "9-11" : age <= 16 ? "12-16" : "fuera";
};

export default function CampusAdmin() {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [settingsList, setSettingsList] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState("2027");
  const [registrations, setRegistrations] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState("resumen");
  const [communicationRecipient, setCommunicationRecipient] = useState("");
  const [communicationGroup, setCommunicationGroup] = useState("todos");
  const [communicationStatusFilter, setCommunicationStatusFilter] = useState("todos");
  const [communicationPaymentFilter, setCommunicationPaymentFilter] = useState("todos");
  const [sendingBulkEmail, setSendingBulkEmail] = useState(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState("manuelbermudo@hotmail.com");
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [communicationTemplate, setCommunicationTemplate] = useState("recepcion");
  const [communicationSubject, setCommunicationSubject] = useState("Hemos recibido tu solicitud · Campus 2027");
  const [communicationBody, setCommunicationBody] = useState("Hola,\n\nHemos recibido la solicitud de inscripción al Campus Deportivo 2027 del C.D. Bustarviejo. La inscripción queda pendiente de revisión por parte del club. Este mensaje no confirma plaza ni implica ningún cobro.\n\nMuchas gracias.\nC.D. Bustarviejo");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [communicationLogs, setCommunicationLogs] = useState([]);
  const [filterText, setFilterText] = useState("");
  const [registrationSearch, setRegistrationSearch] = useState("");
  const [registrationStatusFilter, setRegistrationStatusFilter] = useState("todos");
  const [registrationPaymentFilter, setRegistrationPaymentFilter] = useState("todos");
  const [filterWeek, setFilterWeek] = useState("todas");
  const [filterAge, setFilterAge] = useState("todas");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [filterSocio, setFilterSocio] = useState("todos");
  const [filterManualGroup, setFilterManualGroup] = useState("todos");
  const [selectedParticipantIds, setSelectedParticipantIds] = useState([]);
  const [manualGroupName, setManualGroupName] = useState("");
  const [savingGroups, setSavingGroups] = useState(false);
  const [editingRegistration, setEditingRegistration] = useState(null);
  const [registrationDraft, setRegistrationDraft] = useState({ adulto_nombre: "", adulto_email: "", adulto_telefono: "", adulto_direccion: "", adulto_municipio: "" });
  const [savingRegistration, setSavingRegistration] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(""); setNotice("");
    try {
      const me = await base44.auth.me();
      setUser(me);
      if (me?.role !== "admin") {
        const cfg = await base44.entities.CampusSettings.list("-created_date", 100);
        const seasons = [...new Set((cfg || []).map(c => String(c.temporada || c.fecha_inicio?.slice(0,4) || "")).filter(Boolean))].sort((a,b)=>b.localeCompare(a));
        const chosenSeason = seasons.includes(selectedSeason) ? selectedSeason : (seasons[0] || "2027");
        setSettingsList(cfg || []);
        setSelectedSeason(chosenSeason);
        setSettings((cfg || []).find(c => String(c.temporada || c.fecha_inicio?.slice(0,4) || "") === chosenSeason && c.activo === true) || (cfg || []).find(c => String(c.temporada || c.fecha_inicio?.slice(0,4) || "") === chosenSeason) || cfg?.[0] || null);
        setLoading(false); return;
      }
      const [cfg, regs, kids, logs] = await Promise.all([
        base44.entities.CampusSettings.list("-created_date", 100),
        base44.entities.CampusRegistration.list("-created_date", 500),
        base44.entities.CampusParticipant.list("-created_date", 1000),
        base44.entities.CampusCommunicationLog.list("-sent_at", 100),
      ]);
      setSettingsList(cfg || []);
      const seasons = [...new Set((cfg || []).map(c => String(c.temporada || c.fecha_inicio?.slice(0,4) || "")).filter(Boolean))].sort((a,b)=>b.localeCompare(a));
      const chosenSeason = seasons.includes(selectedSeason) ? selectedSeason : (seasons[0] || "2027");
      setSelectedSeason(chosenSeason);
      setSettings((cfg || []).find(c => String(c.temporada || c.fecha_inicio?.slice(0,4) || "") === chosenSeason && c.activo === true) || (cfg || []).find(c => String(c.temporada || c.fecha_inicio?.slice(0,4) || "") === chosenSeason) || cfg?.[0] || null);
      setRegistrations(regs || []);
      setParticipants(kids || []);
      setCommunicationLogs(logs || []);
    } catch (e) {
      setError(e?.message || "No se han podido cargar los datos del campus.");
    } finally { setLoading(false); }
  }, [selectedSeason]);

  useEffect(() => { load(); }, [load]);

  const seasonRegistrations = registrations.filter(r => String(r.temporada || "2027") === selectedSeason);
  const seasonRegistrationIds = new Set(seasonRegistrations.map(r => r.id));
  const seasonParticipants = participants.filter(p => String(p.temporada || "2027") === selectedSeason || seasonRegistrationIds.has(p.registration_id));
  const paidConfirmedRegistrationIds = new Set(seasonRegistrations.filter(r => r.estado === "confirmada" && r.estado_pago === "pagado").map(r => r.id));
  const confirmedParticipants = seasonParticipants.filter(p => paidConfirmedRegistrationIds.has(p.registration_id) && p.estado === "confirmado");
  const confirmedRegistrations = seasonRegistrations.filter(r => r.estado === "confirmada");
  const paid = seasonRegistrations.filter(r => r.estado_pago === "pagado").reduce((s, r) => s + Number(r.importe_total || 0), 0);
  const expectedIncome = seasonRegistrations.filter(r => r.estado !== "cancelada").reduce((s, r) => s + Number(r.importe_total || 0), 0);
  const pendingIncome = seasonRegistrations.filter(r => r.estado !== "cancelada" && r.estado_pago === "pendiente").reduce((s, r) => s + Number(r.importe_total || 0), 0);
  const failedIncome = seasonRegistrations.filter(r => r.estado_pago === "fallido").reduce((s, r) => s + Number(r.importe_total || 0), 0);
  const confirmedRegistrationIds = new Set(seasonRegistrations.filter(r => r.estado === "confirmada").map(r => r.id));
  const confirmedPlaces = confirmedParticipants.filter(p => p.estado === "confirmado" || confirmedRegistrationIds.has(p.registration_id)).length;
  const registrationsToReview = seasonRegistrations.filter(r => ["pendiente", "revision"].includes(r.estado || "pendiente"));
  const failedPaymentRegistrations = seasonRegistrations.filter(r => r.estado !== "cancelada" && r.estado_pago === "fallido");
  const registrationsWithoutContact = seasonRegistrations.filter(r => !String(r.adulto_email || "").trim() || !String(r.adulto_telefono || "").trim());
  const participantsWithoutGroup = confirmedParticipants.filter(p => !String(p.grupo_manual || "").trim());
  const communicationTargets = useMemo(() => {
    const eligible = seasonRegistrations.filter(reg => {
      if (!reg.adulto_email) return false;
      if (communicationStatusFilter !== "todos" && (reg.estado || "pendiente") !== communicationStatusFilter) return false;
      if (communicationPaymentFilter !== "todos" && (reg.estado_pago || "pendiente") !== communicationPaymentFilter) return false;
      if (communicationGroup !== "todos") {
        const kids = seasonParticipants.filter(p => p.registration_id === reg.id);
        if (!kids.some(p => groupForParticipant(p, settings?.fecha_inicio) === communicationGroup)) return false;
      }
      return true;
    });
    const unique = new Map();
    eligible.forEach(reg => {
      const email = String(reg.adulto_email || "").trim().toLowerCase();
      if (email && !unique.has(email)) unique.set(email, reg);
    });
    return [...unique.values()];
  }, [seasonRegistrations, seasonParticipants, settings, communicationGroup, communicationStatusFilter, communicationPaymentFilter]);

  const filteredRegistrations = useMemo(() => seasonRegistrations.filter(r => {
    const q = registrationSearch.trim().toLocaleLowerCase("es");
    const text = `${r.adulto_nombre || ""} ${r.adulto_email || ""} ${r.adulto_telefono || ""}`.toLocaleLowerCase("es");
    if (q && !text.includes(q)) return false;
    if (registrationStatusFilter !== "todos" && (r.estado || "pendiente") !== registrationStatusFilter) return false;
    if (registrationPaymentFilter !== "todos" && (r.estado_pago || "pendiente") !== registrationPaymentFilter) return false;
    return true;
  }).sort((a,b)=>(a.adulto_nombre||"").localeCompare(b.adulto_nombre||"","es")), [seasonRegistrations, registrationSearch, registrationStatusFilter, registrationPaymentFilter]);
  const familyGroups = useMemo(() => {
    const groups = new Map();
    filteredRegistrations.forEach(reg => {
      const dni = String(reg.adulto_dni || "").replace(/[.\\s-]/g, "").toUpperCase();
      const email = String(reg.adulto_email || "").trim().toLowerCase();
      const key = dni ? `${selectedSeason}:dni:${dni}` : email ? `${selectedSeason}:email:${email}` : `${selectedSeason}:registration:${reg.id}`;
      if (!groups.has(key)) groups.set(key, { key, name: reg.adulto_nombre || "Familia", registrations: [] });
      groups.get(key).registrations.push(reg);
    });
    return [...groups.values()].map(group => ({
      ...group,
      registrations: group.registrations.sort((a,b) => String(a.created_date || "").localeCompare(String(b.created_date || ""))),
      kids: group.registrations.flatMap(reg => seasonParticipants.filter(p => p.registration_id === reg.id)),
      total: group.registrations.reduce((sum, reg) => sum + Number(reg.importe_total || 0), 0),
    }));
  }, [filteredRegistrations, seasonParticipants, selectedSeason]);
  const totalRegisteredParticipants = confirmedParticipants.length;
  const groupStats = useMemo(() => GROUPS.map(g => {
    const list = confirmedParticipants.filter(p => groupForParticipant(p, settings?.fecha_inicio) === g.key);
    const capacityField = g.key === "6-8" ? "plazas_6_8" : g.key === "9-11" ? "plazas_9_11" : "plazas_12_16";
    const ratioField = g.key === "6-8" ? "ratio_6_8" : g.key === "9-11" ? "ratio_9_11" : "ratio_12_16";
    const weekly = WEEKS.map(w => list.filter(p => (p.semanas_ocupadas || []).includes(w.key)).length);
    const peak = Math.max(0, ...weekly);
    return { ...g, count: list.length, weekly, peak, amount: list.reduce((sum, p) => sum + Number(p.precio_aplicado || 0), 0), capacity: Number(settings?.[capacityField] || 0), ratio: Number(settings?.[ratioField] || 0), recommendedMonitors: Number(settings?.[ratioField] || 0) > 0 ? Math.ceil(peak / Number(settings[ratioField])) : null };
  }), [confirmedParticipants, settings]);
  const configuredCapacity = Number(settings?.maximo_total || 0);
  const recommendedMonitors = groupStats.reduce((sum, group) => sum + (group.recommendedMonitors || 0), 0);
  const capacityByGroups = groupStats.reduce((sum, group) => sum + group.capacity, 0);
  const monitorMode = settings?.monitor_mode || "calcular";

  const weekStats = useMemo(() => WEEKS.map((w, i) => ({
    ...w,
    dates: weekDateRange(settings?.fecha_inicio, i),
    count: confirmedParticipants.filter(p => (p.semanas_ocupadas || []).includes(w.key)).length,
  })), [confirmedParticipants, settings?.fecha_inicio]);

  const manualGroups = useMemo(() => [...new Set(seasonParticipants.map(p => (p.grupo_manual || "").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es")), [seasonParticipants]);
  const filteredParticipants = useMemo(() => seasonParticipants.filter(p => {
    const reg = seasonRegistrations.find(r => r.id === p.registration_id);
    const age = naturalAge(p.fecha_nacimiento, settings?.fecha_inicio) ?? p.edad_inicio;
    const haystack = `${p.nombre || ""} ${reg?.adulto_nombre || ""} ${reg?.adulto_email || ""} ${reg?.adulto_telefono || ""}`.toLocaleLowerCase("es");
    if (filterText.trim() && !haystack.includes(filterText.trim().toLocaleLowerCase("es"))) return false;
    if (filterWeek !== "todas" && !(p.semanas_ocupadas || []).includes(filterWeek)) return false;
    if (filterAge !== "todas" && groupForParticipant(p, settings?.fecha_inicio) !== filterAge) return false;
    if (filterStatus !== "todos" && (p.estado || "pendiente") !== filterStatus) return false;
    if (filterSocio !== "todos" && String(!!p.es_socio) !== filterSocio) return false;
    if (filterManualGroup === "sin_grupo" && p.grupo_manual) return false;
    if (filterManualGroup !== "todos" && filterManualGroup !== "sin_grupo" && (p.grupo_manual || "") !== filterManualGroup) return false;
    return true;
  }).sort((a,b)=>(a.nombre||"").localeCompare(b.nombre||"","es")), [seasonParticipants, seasonRegistrations, filterText, filterWeek, filterAge, filterStatus, filterSocio, filterManualGroup]);

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
      const chosen = seasonParticipants.filter(p=>selectedParticipantIds.includes(p.id));
      await Promise.all(chosen.map(p=>base44.entities.CampusParticipant.update(p.id,{grupo_manual:name})));
      setNotice(`${chosen.length} participante(s) asignados al grupo «${name}».`);
      setSelectedParticipantIds([]); setManualGroupName(""); await load();
    } catch(e) { setError(e?.message || "No se pudo guardar la asignación de grupos."); }
    finally { setSavingGroups(false); }
  };
  const clearManualGroup = async (name) => {
    const chosen = seasonParticipants.filter(p=>p.grupo_manual===name);
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
    const title = filterManualGroup !== "todos" ? `Campus ${selectedSeason} · ${filterManualGroup==="sin_grupo"?"Sin grupo":filterManualGroup}` : `Campus Deportivo ${selectedSeason} · Listado de participantes`;
    doc.setFontSize(16); doc.text(title,14,15);
    doc.setFontSize(9); doc.text(`Listado: ${filteredParticipants.length} menores · Generado: ${new Date().toLocaleDateString("es-ES")}`,14,22);
    const headers = ["Menor","Edad","Familia","Teléfono","Semanas","Grupo manual","Imagen","Estado"];
    const rows = filteredParticipants.map(p=>{
      const reg=seasonRegistrations.find(r=>r.id===p.registration_id);
      return [p.nombre||"",String(naturalAge(p.fecha_nacimiento, settings?.fecha_inicio)??p.edad_inicio??""),reg?.adulto_nombre||"",reg?.adulto_telefono||"", (p.semanas_ocupadas||[]).join(", "),p.grupo_manual||"Sin asignar",p.autorizacion_imagen==="si"?"Sí":p.autorizacion_imagen==="no"?"No":"Pendiente",p.estado||"pendiente"];
    });
    const widths=[40,12,42,25,30,38,18,23];
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

  const beginEditRegistration = (registration) => {
    setEditingRegistration(registration.id);
    setRegistrationDraft({
      adulto_nombre: registration.adulto_nombre || "",
      adulto_email: registration.adulto_email || "",
      adulto_telefono: registration.adulto_telefono || "",
      adulto_direccion: registration.adulto_direccion || "",
      adulto_municipio: registration.adulto_municipio || "",
    });
    setError(""); setNotice("");
  };

  const saveRegistrationContact = async () => {
    const email = registrationDraft.adulto_email.trim().toLowerCase();
    if (!registrationDraft.adulto_nombre.trim() || !/^\S+@\S+\.\S+$/.test(email) || !registrationDraft.adulto_telefono.trim()) {
      setError("Comprueba el nombre, el correo y el teléfono del responsable."); return;
    }
    setSavingRegistration(true); setError(""); setNotice("");
    try {
      await base44.entities.CampusRegistration.update(editingRegistration, {
        adulto_nombre: registrationDraft.adulto_nombre.trim(),
        adulto_email: email,
        adulto_telefono: registrationDraft.adulto_telefono.trim(),
        adulto_direccion: registrationDraft.adulto_direccion.trim(),
        adulto_municipio: registrationDraft.adulto_municipio.trim(),
      });
      setEditingRegistration(null);
      setNotice("Datos de contacto actualizados. No se han modificado pagos ni participantes.");
      await load();
    } catch (e) { setError(e?.message || "No se pudieron guardar los datos de contacto."); }
    finally { setSavingRegistration(false); }
  };

  const updateRegistrationStatus = async (registration, nextStatus) => {
    if (nextStatus === registration.estado) return;
    const labels = { pendiente: "pendiente", confirmada: "completada", cancelada: "cancelada", revision: "en revisión" };
    if (!window.confirm(`¿Cambiar la inscripción de ${registration.adulto_nombre} a «${labels[nextStatus] || nextStatus}»? El estado del pago no cambiará.`)) return;
    setError(""); setNotice("");
    try {
      await base44.entities.CampusRegistration.update(registration.id, { estado: nextStatus });
      setNotice(`Estado de inscripción actualizado a «${labels[nextStatus] || nextStatus}». El pago permanece sin cambios.`);
      await load();
    } catch (e) { setError(e?.message || "No se pudo actualizar el estado."); }
  };

  const deleteRegistration = async (registration) => {
    const kids = seasonParticipants.filter(p => p.registration_id === registration.id);
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
      recepcion: ["Hemos recibido tu solicitud · Campus 2027", "Hola,\n\nHemos recibido la solicitud de inscripción al Campus Deportivo 2027 del C.D. Bustarviejo. La inscripción queda pendiente de revisión por parte del club. Este mensaje no confirma plaza ni implica ningún cobro.\n\nMuchas gracias.\nC.D. Bustarviejo"],
      documentacion: ["Información del Campus Deportivo 2027", "Hola,\n\nTe enviamos la información general del Campus Deportivo 2027. La documentación definitiva y cualquier indicación específica se comunicarán cuando estén cerradas la organización y las condiciones del servicio.\n\nC.D. Bustarviejo"],
      horarios: ["Horarios y organización · Campus 2027", "Hola,\n\nEl horario previsto del Campus es de 09:00 a 14:00. La distribución definitiva de grupos, turnos y actividades se comunicará cuando esté confirmada.\n\nC.D. Bustarviejo"],
      material: ["Material necesario · Campus 2027", "Hola,\n\nComo orientación, los menores deberán traer ropa y calzado deportivo, muda, almuerzo, botella de agua, gorra y protección solar. En las jornadas de piscina se indicará el material específico.\n\nC.D. Bustarviejo"],
      aviso: ["Aviso importante · Campus 2027", "Hola,\n\nTe escribimos para comunicarte una actualización relativa al Campus Deportivo 2027:\n\n[Escribe aquí el aviso]\n\nC.D. Bustarviejo"],
      personalizado: ["Información Campus Deportivo 2027", "Hola,\n\n\n\nC.D. Bustarviejo"]
    };
    const draft = templates[key] || templates.personalizado;
    setCommunicationTemplate(key);
    setCommunicationSubject(draft[0]);
    setCommunicationBody(draft[1]);
  };

  const sendCampusEmail = async () => {
    const registration = seasonRegistrations.find(r => r.id === communicationRecipient);
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

  const sendCampusBulkEmail = async () => {
    const targets = communicationTargets;
    if (!targets.length) { setError("No hay familias con correo que coincidan con esos filtros."); return; }
    if (!communicationSubject.trim() || !communicationBody.trim()) { setError("Completa el asunto y el mensaje antes de enviar."); return; }
    if (!window.confirm(`Vas a enviar este correo a ${targets.length} familias únicas. Se enviará un mensaje por dirección de correo. El envío será real. ¿Continuar?`)) return;
    setSendingBulkEmail(true); setError(""); setNotice("");
    let sent = 0;
    const failures = [];
    try {
      for (const registration of targets) {
        try {
          const response = await base44.functions.invoke("campusCommunicationSend", {
            registration_id: registration.id,
            recipient_email: registration.adulto_email,
            recipient_name: registration.adulto_nombre,
            subject: communicationSubject,
            body: communicationBody,
            template_key: communicationTemplate
          });
          const result = response?.data || response;
          if (!result?.success) throw new Error(result?.error || "No se pudo confirmar el envío.");
          sent += 1;
        } catch (e) {
          failures.push(`${registration.adulto_nombre || registration.adulto_email}: ${e?.message || "Error de envío"}`);
        }
      }
      await load();
      setNotice(`Envío finalizado: ${sent} correos aceptados por el servicio y ${failures.length} errores.`);
      if (failures.length) setError(failures.slice(0, 5).join(" · "));
    } finally {
      setSendingBulkEmail(false);
    }
  };

  const openCampusWhatsApp = () => {
    const registration = seasonRegistrations.find(r => r.id === communicationRecipient);
    if (!registration?.adulto_telefono) { setError("La familia seleccionada no tiene un teléfono registrado."); return; }
    if (!communicationSubject.trim() || !communicationBody.trim()) { setError("Completa el asunto y el mensaje antes de abrir WhatsApp."); return; }
    let phone = String(registration.adulto_telefono).replace(/\D/g, "");
    if (phone.startsWith("00")) phone = phone.slice(2);
    if (phone.length === 9) phone = "34" + phone;
    if (phone.length < 10 || phone.length > 15) { setError("El teléfono registrado no parece válido. Revísalo en la inscripción."); return; }
    const body = communicationBody.replace(/\n/g, "\n").replace(/\\r/g, "");
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
  const togglePreferenteBanner = async (enabled) => {
    if (!settings?.id) return;
    setSaving(true); setNotice(""); setError("");
    try {
      await base44.entities.CampusSettings.update(settings.id, { campana_preferente_activa: !!enabled });
      setSettings(current => ({ ...current, campana_preferente_activa: !!enabled }));
      setNotice(enabled ? "Banner de inscripción preferente ACTIVADO en la app." : "Banner de inscripción preferente DESACTIVADO en la app.");
    } catch (e) { setError(e?.message || "No se pudo cambiar la activación del banner."); }
    finally { setSaving(false); }
  };

  const toggleWaitlist = async (enabled) => {
    if (!settings?.id) return;
    setSaving(true); setNotice(""); setError("");
    try {
      await base44.entities.CampusSettings.update(settings.id, { lista_espera_activa: !!enabled });
      setSettings(current => ({ ...current, lista_espera_activa: !!enabled }));
      setNotice(enabled ? "Lista de espera ACTIVADA en la web. Ya se pueden recibir solicitudes." : "Lista de espera DESACTIVADA en la web. No se admitirán nuevas solicitudes; las existentes se conservan.");
    } catch (e) { setError(e?.message || "No se pudo cambiar la lista de espera."); }
    finally { setSaving(false); }
  };

  const saveCampaignPlan = async () => {
    if (!settings?.id) return;
    setSaving(true); setNotice(""); setError("");
    try {
      await base44.entities.CampusSettings.update(settings.id, {
        campana_preferente_inicio: settings.campana_preferente_inicio || "2027-02-01",
        campana_preferente_fin: settings.campana_preferente_fin || "2027-02-21",
        campana_publica_inicio: settings.campana_publica_inicio || "2027-03-01",
        campana_banner_titulo: settings.campana_banner_titulo || "Campus Deportivo 2027",
        campana_banner_texto: settings.campana_banner_texto || "Inscripción preferente para las familias del CD Bustarviejo. Apertura al público general el 1 de marzo.",
        campana_preferente_activa: !!settings.campana_preferente_activa,
        campana_app_banner_preparado: !!settings.campana_app_banner_preparado,
        campana_web_preparada: !!settings.campana_web_preparada,
        campana_notas: settings.campana_notas || "",
      });
      setNotice(settings.campana_preferente_activa ? "Acceso preferente activado. El banner aparecerá en la app para las familias del club." : "Acceso preferente desactivado. El banner dejará de mostrarse en la app.");
      await load();
    } catch (e) { setError(e?.message || "No se pudo guardar el plan de campaña."); }
    finally { setSaving(false); }
  };

  const saveSettings = async () => {
    if (!settings?.id) return;
    setSaving(true); setNotice(""); setError("");
    try {
      await base44.entities.CampusSettings.update(settings.id, {
        activo: true,
        precio_semana_general: Number(settings.precio_semana_general), precio_semana_socio: Number(settings.precio_semana_socio),
        precio_quincena_general: Number(settings.precio_quincena_general), precio_quincena_socio: Number(settings.precio_quincena_socio),
        precio_mes_general: Number(settings.precio_mes_general), precio_mes_socio: Number(settings.precio_mes_socio),
        fecha_inicio: settings.fecha_inicio, fecha_fin: settings.fecha_fin, temporada: String(settings.temporada || settings.fecha_inicio?.slice(0,4) || ""),
        cuota_socio: Number(settings.cuota_socio), notas_capacidad: settings.notas_capacidad || "",
        plazas_6_8: Number(settings.plazas_6_8 || 0), plazas_9_11: Number(settings.plazas_9_11 || 0), plazas_12_16: Number(settings.plazas_12_16 || 0), maximo_total: Number(settings.maximo_total || 0),
        ratio_6_8: Number(settings.ratio_6_8 || 0), ratio_9_11: Number(settings.ratio_9_11 || 0), ratio_12_16: Number(settings.ratio_12_16 || 0),
        monitor_mode: settings.monitor_mode || "calcular", monitores_disponibles: Number(settings.monitores_disponibles || 0),
      });
      await Promise.all(settingsList.filter(c => c.id !== settings.id && String(c.temporada || c.fecha_inicio?.slice(0,4) || "") === String(settings.temporada || "2027") && c.activo === true).map(c => base44.entities.CampusSettings.update(c.id, { activo: false })));
      setNotice("Configuración guardada y activada. Se ha desactivado cualquier configuración duplicada de la misma temporada.");
      await load();
    } catch (e) { setError(e?.message || "No se pudo guardar la configuración."); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="min-h-screen bg-slate-50 p-8 text-slate-600">Cargando panel del Campus 2027…</div>;
  if (error && !user) return <div className="max-w-3xl mx-auto p-8"><div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">{error}</div></div>;
  if (user?.role !== "admin") {
    return <div className="min-h-screen bg-[#f4f5f7] p-3 md:p-7 space-y-5 text-slate-800"><div className="rounded-3xl bg-gradient-to-br from-slate-950 to-orange-950 p-6 text-white"><p className="text-xs font-bold uppercase tracking-widest text-orange-200">C.D. Bustarviejo</p><h1 className="mt-2 text-3xl font-black">Campus Deportivo {selectedSeason}</h1><p className="mt-2 text-sm text-slate-300">Panel operativo de monitor · Solo semanas autorizadas</p></div><CampusAttendance season={selectedSeason} settings={settings}/></div>;
  }

  return <div className="min-h-screen bg-[#f4f5f7] p-3 md:p-7 space-y-6 text-slate-800">
    <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-6 md:p-8 text-white shadow-xl"><div className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl"/><div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-5"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[.18em] text-orange-200">C.D. Bustarviejo · Área de gestión</div><h1 className="text-3xl md:text-4xl font-black tracking-tight">Campus Deportivo {selectedSeason}</h1><p className="mt-2 max-w-2xl text-sm md:text-base text-slate-300">Toda la organización del Campus, las familias y el seguimiento económico en un solo lugar.</p><div className="mt-5 flex flex-wrap items-center gap-3"><label className="text-sm font-semibold text-slate-300">Edición</label><select value={selectedSeason} onChange={e=>{const year=e.target.value;setSelectedSeason(year);setSettings(settingsList.find(c=>String(c.temporada||c.fecha_inicio?.slice(0,4)||"")===year&&c.activo===true)||settingsList.find(c=>String(c.temporada||c.fecha_inicio?.slice(0,4)||"")===year)||null);setSelectedParticipantIds([]);}} className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white">{[...new Set(settingsList.map(c=>String(c.temporada||c.fecha_inicio?.slice(0,4)||"")).filter(Boolean))].sort((a,b)=>b.localeCompare(a)).map(year=><option className="text-slate-900" key={year} value={year}>Campus {year}</option>)}</select><span className="rounded-xl bg-orange-500 px-3 py-2 text-xs font-black uppercase tracking-wide">{settings?.activo ? "Edición activa" : "Consulta"}</span></div></div><button onClick={load} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 font-bold text-white transition hover:bg-white/20"><RefreshCw className="h-4 w-4"/>Actualizar datos</button></div></div>

    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>}
    {notice && <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-800 flex gap-2"><CheckCircle2 className="h-5 w-5"/>{notice}</div>}
    {!settings && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">No existe una configuración del campus. Contacta con soporte para inicializarla.</div>}

    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {[
        ["Menores inscritos", confirmedParticipants.length, Users],
        ["Familias confirmadas", confirmedRegistrations.length, CheckCircle2],
        ["Cobrado", money(paid), Euro],
        ["Pendiente de cobro", money(pendingIncome), CalendarDays],
      ].map(([label, value, Icon]) => <div key={label} className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg"><div className="flex items-center justify-between gap-2 text-sm font-semibold text-slate-500"><span>{label}</span><span className="rounded-xl bg-orange-50 p-2.5"><Icon className="h-5 w-5 text-orange-600"/></span></div><div className="mt-3 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">{value}</div></div>)}
    </div>

    <CampusNav tab={tab} setTab={setTab} />

    {tab === "campana" && <section className="space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
        <div className="mb-5">
          <p className="text-xs font-black uppercase tracking-[.18em] text-orange-600">Lanzamiento · Campus {selectedSeason}</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Planificación de campaña</h2>
          <p className="mt-1 text-sm text-slate-500">Organiza la prioridad para las familias del club y la posterior apertura pública, usando siempre el mismo enlace y formulario.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm font-bold text-slate-700">Inicio de prioridad para familias
            <input type="date" value={settings?.campana_preferente_inicio || "2027-02-01"} onChange={e=>updateSetting("campana_preferente_inicio",e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal"/>
          </label>
          <label className="text-sm font-bold text-slate-700">Fin de prioridad para familias
            <input type="date" value={settings?.campana_preferente_fin || "2027-02-21"} onChange={e=>updateSetting("campana_preferente_fin",e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal"/>
          </label>
          <label className="text-sm font-bold text-slate-700">Apertura al público general
            <input type="date" value={settings?.campana_publica_inicio || "2027-03-01"} onChange={e=>updateSetting("campana_publica_inicio",e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal"/>
          </label>
        </div>
        <div className="mt-6 rounded-2xl border border-orange-200 bg-orange-50/60 p-5">
          <h3 className="font-black text-slate-900">Banner para la app del club</h3>
          <p className="mt-1 text-sm text-slate-600">Dejamos preparado el texto para publicarlo cuando comience la prioridad. Guardarlo aquí no lo muestra todavía en la app.</p>
          <label className="mt-4 block text-sm font-bold text-slate-700">Título
            <input value={settings?.campana_banner_titulo || "Campus Deportivo 2027"} onChange={e=>updateSetting("campana_banner_titulo",e.target.value)} className="mt-1 w-full rounded-xl border bg-white p-3 font-normal"/>
          </label>
          <label className="mt-3 block text-sm font-bold text-slate-700">Mensaje
            <textarea rows="3" value={settings?.campana_banner_texto || "Inscripción preferente para las familias del CD Bustarviejo. Apertura al público general el 1 de marzo."} onChange={e=>updateSetting("campana_banner_texto",e.target.value)} className="mt-1 w-full rounded-xl border bg-white p-3 font-normal"/>
          </label>
          <label className="mt-4 flex items-center justify-between gap-4 rounded-xl border-2 border-orange-200 bg-white p-4 text-sm"><span><strong className="block text-base text-slate-900">Activar banner de inscripción preferente</strong><span className="mt-1 block text-xs font-normal text-slate-600">Al activarlo, aparecerá en la pantalla principal de la app para las familias del club.</span></span><input type="checkbox" role="switch" aria-label="Activar banner de inscripción preferente" checked={!!settings?.campana_preferente_activa} onChange={e=>togglePreferenteBanner(e.target.checked)} disabled={saving} className="h-6 w-11 shrink-0 cursor-pointer accent-orange-600 disabled:opacity-50"/></label>
        </div>
        <label className="mt-5 block text-sm font-bold text-slate-700">Notas internas de campaña
          <textarea rows="3" value={settings?.campana_notas || ""} onChange={e=>updateSetting("campana_notas",e.target.value)} placeholder="Por ejemplo: revisar plazas por edades al terminar el periodo preferente." className="mt-1 w-full rounded-xl border p-3 font-normal"/>
        </label>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-2xl text-xs text-slate-500">El switch activa o desactiva el banner inmediatamente. El botón del banner abrirá la página informativa y desde allí el formulario público existente. El botón inferior guarda las fechas y los textos.</p>
          <button onClick={saveCampaignPlan} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-3 font-bold text-white hover:bg-orange-700 disabled:opacity-60">{saving?<RefreshCw className="h-4 w-4 animate-spin"/>:<Save className="h-4 w-4"/>}{saving?"Guardando…":"Guardar plan de campaña"}</button>
        </div>
      </div>
    </section>}

    {tab === "organizacion" && <section className="space-y-5">
      <CampusListadosRapidos groupStats={groupStats} onPick={(week, age) => { setFilterText(""); setFilterStatus("todos"); setFilterSocio("todos"); setFilterManualGroup("todos"); setFilterWeek(week); setFilterAge(age); setTimeout(() => document.getElementById("campus-filtros")?.scrollIntoView({ behavior: "smooth" }), 50); }} />
      <div id="campus-filtros" className="rounded-2xl border bg-white p-5 space-y-4">
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
        {manualGroups.length>0&&<div className="flex flex-wrap gap-2">{manualGroups.map(g=><div key={g} className="flex items-center gap-2 rounded-full border bg-orange-50 px-3 py-1 text-sm"><span className="font-bold">{g}</span><span className="text-slate-500">{seasonParticipants.filter(p=>p.grupo_manual===g).length}</span><button onClick={()=>clearManualGroup(g)} disabled={savingGroups} className="font-bold text-red-600">Quitar</button></div>)}</div>}
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-slate-500"><th className="p-2"><input type="checkbox" checked={filteredParticipants.length>0&&filteredParticipants.every(p=>selectedParticipantIds.includes(p.id))} onChange={toggleVisibleParticipants}/></th><th className="p-2">Menor</th><th className="p-2">Edad</th><th className="p-2">Familia</th><th className="p-2">Semanas</th><th className="p-2">Grupo manual</th><th className="p-2">Estado</th></tr></thead><tbody>{filteredParticipants.map(p=>{const reg=seasonRegistrations.find(r=>r.id===p.registration_id);return <tr key={p.id} className="border-b last:border-0"><td className="p-2"><input type="checkbox" checked={selectedParticipantIds.includes(p.id)} onChange={()=>toggleParticipant(p.id)}/></td><td className="p-2 font-semibold">{p.nombre}</td><td className="p-2">{naturalAge(p.fecha_nacimiento, settings?.fecha_inicio)??p.edad_inicio??"—"}</td><td className="p-2">{reg?.adulto_nombre||"—"}<div className="text-xs text-slate-500">{reg?.adulto_telefono||""}</div></td><td className="p-2">{(p.semanas_ocupadas||[]).join(", ")}</td><td className="p-2">{p.grupo_manual||"Sin asignar"}</td><td className="p-2">{p.estado||"pendiente"}</td></tr>})}</tbody></table>{filteredParticipants.length===0&&<p className="py-8 text-center text-slate-500">No hay participantes con esos filtros.</p>}</div>
      </div>
    </section>}

    {tab === "comunicaciones" && <section className="grid xl:grid-cols-2 gap-5">
      <div className="rounded-2xl border bg-white p-5 space-y-4">
        <div><h2 className="text-xl font-black">Enviar comunicación a una familia</h2><p className="text-sm text-slate-500">El envío es siempre manual. No se envía nada al registrar una inscripción.</p></div>
        <div className="rounded-2xl border border-orange-100 bg-orange-50/50 p-4 space-y-3">
          <div><h3 className="font-black text-slate-900">Destinatarios por grupo</h3><p className="text-xs text-slate-600">Filtra por edad, estado de inscripción y pago. Se envía un solo correo por dirección, aunque haya varios menores o solicitudes duplicadas.</p></div>
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="text-xs font-bold text-slate-600">Grupo de edad<select value={communicationGroup} onChange={e=>setCommunicationGroup(e.target.value)} className="mt-1 w-full rounded-xl border bg-white p-2.5 text-sm font-normal"><option value="todos">Todos los grupos</option>{GROUPS.map(g=><option key={g.key} value={g.key}>{g.range}</option>)}</select></label>
            <label className="text-xs font-bold text-slate-600">Estado de inscripción<select value={communicationStatusFilter} onChange={e=>setCommunicationStatusFilter(e.target.value)} className="mt-1 w-full rounded-xl border bg-white p-2.5 text-sm font-normal"><option value="todos">Todos los estados</option><option value="pendiente">Pendiente</option><option value="revision">En revisión</option><option value="confirmada">Confirmada</option><option value="cancelada">Cancelada</option></select></label>
            <label className="text-xs font-bold text-slate-600">Estado del pago<select value={communicationPaymentFilter} onChange={e=>setCommunicationPaymentFilter(e.target.value)} className="mt-1 w-full rounded-xl border bg-white p-2.5 text-sm font-normal"><option value="todos">Todos los pagos</option><option value="pendiente">Pendiente</option><option value="pagado">Pagado</option><option value="fallido">Fallido</option></select></label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-bold text-slate-800">{communicationTargets.length} familias únicas seleccionadas</p><button onClick={sendCampusBulkEmail} disabled={sendingBulkEmail || !communicationTargets.length} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"><Mail className="h-4 w-4"/>{sendingBulkEmail ? "Enviando…" : `Enviar correo a ${communicationTargets.length} familias`}</button></div>
        </div>
        <label className="block text-sm font-bold">O seleccionar una sola familia
          <select value={communicationRecipient} onChange={e=>setCommunicationRecipient(e.target.value)} className="mt-2 w-full rounded-xl border p-3 font-normal">
            <option value="">Selecciona una inscripción</option>
            {seasonRegistrations.filter(r=>r.adulto_email).map(r=><option key={r.id} value={r.id}>{r.adulto_nombre} · {r.adulto_email}</option>)}
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
          <button onClick={openCampusWhatsApp} disabled={!communicationRecipient || !seasonRegistrations.find(r => r.id === communicationRecipient)?.adulto_telefono} className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 font-bold text-white hover:bg-green-700 disabled:opacity-50"><MessageCircle className="h-4 w-4"/>Preparar WhatsApp</button>
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

    {tab === "resumen" && <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div><h2 className="text-xl font-black text-slate-950">Pendientes de atención</h2><p className="mt-1 text-sm text-slate-500">Avisos calculados a partir de los estados y datos que ya constan en las inscripciones.</p></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <button onClick={()=>{setTab("inscripciones");setRegistrationStatusFilter("pendiente");}} className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-left transition hover:border-amber-400"><p className="text-xs font-bold uppercase tracking-wide text-amber-800">Inscripciones pendientes</p><p className="mt-1 text-3xl font-black text-slate-950">{registrationsToReview.length}</p><p className="mt-1 text-xs text-slate-600">Pendientes o en revisión · Ver inscripciones</p></button>
          <button onClick={()=>{setTab("inscripciones");setRegistrationPaymentFilter("fallido");}} className="rounded-xl border border-red-200 bg-red-50 p-4 text-left transition hover:border-red-400"><p className="text-xs font-bold uppercase tracking-wide text-red-800">Pagos fallidos</p><p className="mt-1 text-3xl font-black text-slate-950">{failedPaymentRegistrations.length}</p><p className="mt-1 text-xs text-slate-600">Inscripciones no canceladas · Revisar pagos</p></button>
          <button onClick={()=>setTab("inscripciones")} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-slate-400"><p className="text-xs font-bold uppercase tracking-wide text-slate-700">Contactos incompletos</p><p className="mt-1 text-3xl font-black text-slate-950">{registrationsWithoutContact.length}</p><p className="mt-1 text-xs text-slate-600">Falta correo o teléfono · Ver familias</p></button>
          <button onClick={()=>{setTab("organizacion");setFilterManualGroup("sin_grupo");}} className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-left transition hover:border-orange-400"><p className="text-xs font-bold uppercase tracking-wide text-orange-800">Menores sin grupo</p><p className="mt-1 text-3xl font-black text-slate-950">{participantsWithoutGroup.length}</p><p className="mt-1 text-xs text-slate-600">Sin asignación manual · Organizar grupos</p></button>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <button onClick={()=>setTab("inscripciones")} className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800">Gestionar familias</button>
          <button onClick={()=>setTab("organizacion")} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Organizar grupos</button>
          <button onClick={()=>setTab("comunicaciones")} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Enviar comunicación</button>
          <button onClick={()=>setTab("plazas")} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Revisar capacidad</button>
        </div>
      </section>
      <CampusOccupancyCalendar groups={GROUPS} weeks={weekStats} participants={confirmedParticipants} settings={settings} groupFor={p => groupForParticipant(p, settings?.fecha_inicio)} />
    </div>}

    {tab === "inscripciones" && <section className="rounded-3xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm"><div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-black uppercase tracking-[.18em] text-orange-600">Gestión de familias</p><h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Inscripciones familiares</h2><p className="mt-1 text-sm text-slate-500">{familyGroups.length} familias · {filteredRegistrations.length} inscripciones/pagos de {seasonRegistrations.length}</p></div><div className="grid gap-2 sm:grid-cols-3"><input value={registrationSearch} onChange={e=>setRegistrationSearch(e.target.value)} placeholder="Buscar familia, email o teléfono…" className="min-w-0 rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/><select value={registrationStatusFilter} onChange={e=>setRegistrationStatusFilter(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="todos">Todos los estados</option><option value="pendiente">Pendiente</option><option value="revision">En revisión</option><option value="confirmada">Confirmada</option><option value="cancelada">Cancelada</option></select><select value={registrationPaymentFilter} onChange={e=>setRegistrationPaymentFilter(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="todos">Todos los pagos</option><option value="pendiente">Pago pendiente</option><option value="pagado">Pagado</option><option value="fallido">Fallido</option></select></div></div>{seasonRegistrations.length===0?<p className="text-slate-500 py-8 text-center">Todavía no hay inscripciones. Cuando se envíe el formulario público aparecerán aquí automáticamente.</p>:filteredRegistrations.length===0?<p className="rounded-2xl bg-slate-50 py-8 text-center text-slate-500">No hay inscripciones que coincidan con esos filtros.</p>:<div className="space-y-4">{familyGroups.map(group=><div key={group.key} className="rounded-3xl border-2 border-orange-100 bg-orange-50/40 p-3 md:p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-black text-slate-900">{group.name}</h3><p className="text-xs text-slate-600">{group.kids.length} menor(es) · {group.registrations.length} inscripción(es) y pago(s) independientes</p></div><div className="text-right"><p className="text-xs text-slate-500">Total familiar acumulado</p><p className="font-black text-slate-900">{money(group.total)}</p></div></div><div className="grid gap-3 xl:grid-cols-2">{group.registrations.map((r,index)=><div key={r.id}><p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Inscripción {index+1} · {r.created_date ? new Date(r.created_date).toLocaleDateString("es-ES") : "fecha no disponible"}</p><CampusFamiliaCard r={r} kids={seasonParticipants.filter(p=>p.registration_id===r.id)} onStatus={updateRegistrationStatus} onEdit={beginEditRegistration} onDelete={deleteRegistration} deleting={deletingId===r.id}/></div>)}</div></div>)}</div>}</section>}

    {tab === "plazas" && <section className="space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
        <CampusPlazasResumen groupStats={groupStats} participants={confirmedParticipants} maxTotal={configuredCapacity} />
        <div className="mt-6 rounded-2xl border border-orange-200 bg-orange-50/60 p-5"><h3 className="font-black text-slate-900">Configurar capacidad</h3><p className="mt-1 text-sm text-slate-600">Plazas de cada grupo <b>en cada semana</b> y tope total de menores <b>por semana</b>. El formulario público aplica estos límites al momento.</p><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="text-sm font-bold">Iniciación · 6–8 (por semana)<input type="number" min="0" value={settings?.plazas_6_8 ?? ""} onChange={e=>updateSetting("plazas_6_8",e.target.value)} className="mt-1 w-full rounded-xl border bg-white p-3" placeholder="Sin límite"/></label><label className="text-sm font-bold">Intermedio · 9–11 (por semana)<input type="number" min="0" value={settings?.plazas_9_11 ?? ""} onChange={e=>updateSetting("plazas_9_11",e.target.value)} className="mt-1 w-full rounded-xl border bg-white p-3" placeholder="Sin límite"/></label><label className="text-sm font-bold">Avanzado · 12–16 (por semana)<input type="number" min="0" value={settings?.plazas_12_16 ?? ""} onChange={e=>updateSetting("plazas_12_16",e.target.value)} className="mt-1 w-full rounded-xl border bg-white p-3" placeholder="Sin límite"/></label><label className="text-sm font-bold">Máximo total por semana<input type="number" min="0" value={settings?.maximo_total ?? ""} onChange={e=>updateSetting("maximo_total",e.target.value)} className="mt-1 w-full rounded-xl border bg-white p-3" placeholder="Sin límite"/></label></div><p className="mt-3 text-xs text-slate-500">Un valor 0 o vacío se considera sin límite. Si la suma de los tres grupos supera el máximo total, el máximo total es el que manda.</p></div>
        <CampusMonitorPlanner groupStats={groupStats} settings={settings} updateSetting={updateSetting} />
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">La edad se calcula a fecha de inicio del Campus: 28/06/2027. Al guardar, los nuevos límites se aplican de inmediato en el formulario público.</p><button onClick={saveSettings} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-3 font-bold text-white hover:bg-orange-700 disabled:opacity-60">{saving?<RefreshCw className="h-4 w-4 animate-spin"/>:<Save className="h-4 w-4"/>}{saving?"Guardando…":"Guardar capacidades y monitores"}</button></div>
      </div>
    </section>}

    {tab === "asistencia" && <CampusAttendance season={selectedSeason} settings={settings} adminView={true} />}
    {tab === "monitores" && <CampusMonitorManager season={selectedSeason} />}
    {tab === "lista_espera" && <section className="space-y-5">
      {settings && <CampusWaitlistSwitch active={settings.lista_espera_activa === true} saving={saving} onToggle={toggleWaitlist} />}
      <CampusWaitlistManager season={selectedSeason} />
    </section>}

    {tab === "configuracion" && settings && <section className="rounded-2xl border bg-white p-5 space-y-6">
      <div><h2 className="font-black text-xl">Precios del Campus</h2><p className="text-sm text-slate-500">Se mantienen los importes acordados: semana 60/55 €, quincena 110/95 €, 4 semanas consecutivas 200/170 € y cuota de socio 25 €.</p></div>
      <div className="grid md:grid-cols-3 gap-4">{[
        ["Semana","precio_semana_general","precio_semana_socio"],["Quincena","precio_quincena_general","precio_quincena_socio"],["4 semanas consecutivas","precio_mes_general","precio_mes_socio"]
      ].map(([label,general,socio])=><div key={label} className="rounded-xl border p-4 space-y-3"><h3 className="font-bold">{label}</h3><label className="block text-xs font-bold text-slate-500">No socio (€)<input type="number" min="0" value={settings[general]??0} onChange={e=>updateSetting(general,e.target.value)} className="mt-1 w-full rounded-lg border p-2 text-base text-slate-900"/></label><label className="block text-xs font-bold text-slate-500">Socio (€)<input type="number" min="0" value={settings[socio]??0} onChange={e=>updateSetting(socio,e.target.value)} className="mt-1 w-full rounded-lg border p-2 text-base text-slate-900"/></label></div>)}</div>
      <label className="block text-sm font-bold">Cuota anual de socio (€)<input type="number" min="0" value={settings.cuota_socio??25} onChange={e=>updateSetting("cuota_socio",e.target.value)} className="mt-2 w-full md:w-48 rounded-xl border p-3 font-normal"/></label>
      <label className="block text-sm font-bold">Notas de capacidad y seguridad<textarea value={settings.notas_capacidad||""} onChange={e=>updateSetting("notas_capacidad",e.target.value)} rows="3" className="mt-2 w-full rounded-xl border p-3 font-normal"/></label>
      <div className="flex flex-wrap items-center justify-between gap-3"><button onClick={saveSettings} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-3 font-bold text-white hover:bg-orange-700 disabled:opacity-60">{saving?<RefreshCw className="h-4 w-4 animate-spin"/>:<Save className="h-4 w-4"/>}{saving?"Guardando…":"Guardar configuración"}</button></div>
    </section>}

    {editingRegistration && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3" role="dialog" aria-modal="true" aria-labelledby="campus-edit-title"><div className="w-full max-w-xl rounded-3xl bg-white p-5 shadow-2xl md:p-7"><div className="mb-5 flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.16em] text-orange-600">Gestión de inscripción</p><h2 id="campus-edit-title" className="mt-1 text-2xl font-black text-slate-950">Editar contacto familiar</h2><p className="mt-1 text-sm text-slate-500">Solo se actualizan los datos del responsable. No se alteran participantes, tarifas ni pagos.</p></div><button onClick={()=>setEditingRegistration(null)} className="rounded-xl border p-2 text-slate-500 hover:bg-slate-50" aria-label="Cerrar"><X className="h-5 w-5"/></button></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-bold text-slate-700 sm:col-span-2">Nombre del responsable<input value={registrationDraft.adulto_nombre} onChange={e=>setRegistrationDraft(d=>({...d,adulto_nombre:e.target.value}))} className="mt-1 w-full rounded-xl border p-3 font-normal"/></label><label className="text-sm font-bold text-slate-700">Correo electrónico<input type="email" value={registrationDraft.adulto_email} onChange={e=>setRegistrationDraft(d=>({...d,adulto_email:e.target.value}))} className="mt-1 w-full rounded-xl border p-3 font-normal"/></label><label className="text-sm font-bold text-slate-700">Teléfono<input value={registrationDraft.adulto_telefono} onChange={e=>setRegistrationDraft(d=>({...d,adulto_telefono:e.target.value}))} className="mt-1 w-full rounded-xl border p-3 font-normal"/></label><label className="text-sm font-bold text-slate-700">Dirección<input value={registrationDraft.adulto_direccion} onChange={e=>setRegistrationDraft(d=>({...d,adulto_direccion:e.target.value}))} className="mt-1 w-full rounded-xl border p-3 font-normal"/></label><label className="text-sm font-bold text-slate-700">Municipio<input value={registrationDraft.adulto_municipio} onChange={e=>setRegistrationDraft(d=>({...d,adulto_municipio:e.target.value}))} className="mt-1 w-full rounded-xl border p-3 font-normal"/></label></div><div className="mt-6 flex flex-wrap justify-end gap-2"><button onClick={()=>setEditingRegistration(null)} disabled={savingRegistration} className="rounded-xl border px-4 py-3 font-bold text-slate-700 hover:bg-slate-50">Cancelar</button><button onClick={saveRegistrationContact} disabled={savingRegistration} className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-3 font-bold text-white hover:bg-orange-700 disabled:opacity-50"><Save className="h-4 w-4"/>{savingRegistration?"Guardando…":"Guardar contacto"}</button></div></div></div>}
  </div>;
}
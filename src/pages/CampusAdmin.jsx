import React, { useCallback, useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { CalendarDays, Users, Euro, RefreshCw, Save, CheckCircle2, Trash2 } from "lucide-react";

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

  const load = useCallback(async () => {
    setLoading(true); setError(""); setNotice("");
    try {
      const me = await base44.auth.me();
      setUser(me);
      if (me?.role !== "admin") {
        setError("Esta sección está reservada a la administración del club.");
        setLoading(false); return;
      }
      const [cfg, regs, kids] = await Promise.all([
        base44.entities.CampusSettings.list("-created_date", 5),
        base44.entities.CampusRegistration.list("-created_date", 500),
        base44.entities.CampusParticipant.list("-created_date", 1000),
      ]);
      setSettings(cfg?.[0] || null);
      setRegistrations(regs || []);
      setParticipants(kids || []);
    } catch (e) {
      setError(e?.message || "No se han podido cargar los datos del campus.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const confirmedParticipants = participants.filter(p => !["cancelado", "lista_espera"].includes(p.estado));
  const confirmedRegistrations = registrations.filter(r => r.estado === "confirmada");
  const paid = registrations.filter(r => r.estado_pago === "pagado").reduce((s, r) => s + Number(r.importe_total || 0), 0);
  const groupStats = useMemo(() => GROUPS.map(g => {
    const list = confirmedParticipants.filter(p => p.grupo_edad === g.key);
    return { ...g, count: list.length };
  }), [confirmedParticipants, settings]);

  const weekStats = useMemo(() => WEEKS.map(w => ({
    ...w,
    count: confirmedParticipants.filter(p => (p.semanas_ocupadas || []).includes(w.key)).length,
  })), [confirmedParticipants]);

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
      {[["resumen","Resumen"],["inscripciones","Inscripciones"],["plazas","Participantes por edad"],["configuracion","Tarifas y configuración"]].map(([key,label]) => <button key={key} onClick={()=>setTab(key)} className={`rounded-xl px-4 py-2 text-sm font-bold ${tab===key?"bg-slate-900 text-white":"bg-white border text-slate-600 hover:bg-slate-100"}`}>{label}</button>)}
    </div>

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
        const groupKids = confirmedParticipants.filter(p => p.grupo_edad === group.key);
        return <div key={group.key} className="rounded-2xl border bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div><h3 className="text-lg font-black">{group.label}</h3><p className="text-sm text-slate-500">{group.range}</p></div>
            <span className="rounded-full bg-orange-50 px-3 py-1 text-sm font-bold text-orange-700">{groupKids.length} menores</span>
          </div>
          {groupKids.length === 0 ? <p className="py-5 text-center text-sm text-slate-400">Todavía no hay menores en este grupo.</p> :
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="border-b text-left text-slate-500"><th className="p-3">Menor</th><th className="p-3">Edad (28/06/2027)</th><th className="p-3">Familia / correo</th><th className="p-3">Semanas</th><th className="p-3">Estado</th></tr></thead>
              <tbody>{groupKids.map(kid => {
                const registration = registrations.find(r => r.id === kid.registration_id);
                const birth = kid.fecha_nacimiento ? new Date(`${kid.fecha_nacimiento}T00:00:00`) : null;
                let calculatedAge = kid.edad_inicio;
                if (calculatedAge == null && birth && !Number.isNaN(birth.getTime())) {
                  calculatedAge = 2027 - birth.getFullYear();
                  if (birth.getMonth() > 5 || (birth.getMonth() === 5 && birth.getDate() > 28)) calculatedAge -= 1;
                }
                return <tr key={kid.id} className="border-b last:border-0 align-top">
                  <td className="p-3 font-semibold">{kid.nombre}<div className="text-xs font-normal text-slate-500">{kid.fecha_nacimiento || "Sin fecha"}</div></td>
                  <td className="p-3">{calculatedAge == null ? "—" : `${calculatedAge} años`}</td>
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

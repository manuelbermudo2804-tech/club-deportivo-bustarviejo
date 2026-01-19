import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MessageCircle, ShieldAlert, Users, Bell, Rocket, Mail } from "lucide-react";
import { useUnifiedNotifications } from "../components/notifications/useUnifiedNotifications";

function BubbleRow({ role, notifications }) {
  const items = (() => {
    if (role === 'admin') {
      return [
        { key: 'crit', label: 'Críticos', value: notifications.unresolvedAdminChats, Icon: ShieldAlert },
        { key: 'staff', label: 'Staff', value: notifications.unreadStaffMessages, Icon: Users },
        { key: 'pago', label: 'Pagos', value: notifications.paymentsInReview, Icon: Bell },
        { key: 'ann', label: 'Anuncios', value: notifications.unreadAnnouncements, Icon: Bell },
      ];
    }
    if (role === 'coordinator') {
      return [
        { key: 'fam', label: 'Familias', value: notifications.unreadFamilyMessages, Icon: MessageCircle },
        { key: 'resp', label: 'Respuestas', value: notifications.pendingCallupResponses, Icon: Bell },
        { key: 'ann', label: 'Anuncios', value: notifications.unreadAnnouncements, Icon: Bell },
      ];
    }
    if (role === 'coach') {
      return [
        { key: 'fam', label: 'Familias', value: notifications.unreadFamilyMessages, Icon: MessageCircle },
        { key: 'resp', label: 'Respuestas', value: notifications.pendingCallupResponses, Icon: Bell },
        { key: 'obs', label: 'Obs.', value: notifications.pendingMatchObservations, Icon: ShieldAlert },
        { key: 'ann', label: 'Anuncios', value: notifications.unreadAnnouncements, Icon: Bell },
      ];
    }
    // familia
    return [
      { key: 'coach', label: 'Entrenador', value: notifications.unreadCoachMessages, Icon: MessageCircle },
      { key: 'conv', label: 'Convocatorias', value: notifications.pendingCallups, Icon: Bell },
      { key: 'priv', label: 'Privados', value: notifications.unreadPrivateMessages, Icon: Mail },
      { key: 'ann', label: 'Anuncios', value: notifications.unreadAnnouncements, Icon: Bell },
      { key: 'coord', label: 'Coord.', value: notifications.unreadCoordinatorMessages, Icon: MessageCircle },
    ];
  })();
  return (
    <div className="flex flex-wrap gap-5 items-center">
      {items.map(({ key, label, value, Icon }) => (
        <div key={key} className="flex flex-col items-center">
          <div className="relative">
            <div className="h-11 w-11 rounded-full bg-white border flex items-center justify-center shadow">
              <Icon className="w-5 h-5 text-slate-700" />
            </div>
            <span className={`absolute -top-1 -right-1 rounded-full text-[10px] px-1.5 py-0.5 ${ (value||0) > 0 ? 'bg-red-600 text-white' : 'bg-slate-300 text-slate-700' }`}>
              {value || 0}
            </span>
          </div>
          <div className="text-[10px] text-slate-600 mt-1">{label}</div>
        </div>
      ))}
    </div>
  );
}

function RoleCounters({ title, notifications }) {
  const items = [
    { label: "Staff", value: notifications?.unreadStaffMessages },
    { label: "Familias→Entrenador", value: notifications?.unreadFamilyMessages },
    { label: "Entrenador→Familias", value: notifications?.unreadCoachMessages },
    { label: "Coordinador", value: notifications?.unreadCoordinatorMessages },
    { label: "Administrador", value: notifications?.unreadAdminMessages },
    { label: "Privados (Club)", value: notifications?.unreadPrivateMessages },
  ];
  const total = items.reduce((s, it) => s + (it.value || 0), 0);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <span>{title}</span>
          <Badge className={total > 0 ? "bg-red-500" : "bg-green-600"}>{total}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2">
        {items.map((it) => (
          <div key={it.label} className="flex items-center justify-between rounded-lg border bg-white px-3 py-2">
            <span className="text-xs text-slate-600">{it.label}</span>
            <Badge className={it.value > 0 ? "bg-red-500" : "bg-slate-700"}>{it.value || 0}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function AlertPreview({ title, userStub, notifications }) {
  const items = (() => {
    if (!userStub) return [];
    if (userStub.role === 'admin') {
      return [
        { label: 'Chats críticos abiertos', value: notifications.unresolvedAdminChats },
        { label: 'Mensajes Staff', value: notifications.unreadStaffMessages },
        { label: 'Pagos en revisión', value: notifications.paymentsInReview },
      ];
    }
    if (userStub.es_coordinador) {
      return [
        { label: 'Familias (grupo)', value: notifications.unreadFamilyMessages },
        { label: 'Coord. directos', value: notifications.unreadCoordinatorMessages },
        { label: 'Respuestas convocatorias', value: notifications.pendingCallupResponses },
      ];
    }
    if (userStub.es_entrenador) {
      return [
        { label: 'Familias (grupo)', value: notifications.unreadFamilyMessages },
        { label: 'Respuestas convocatorias', value: notifications.pendingCallupResponses },
        { label: 'Observaciones pendientes', value: notifications.pendingMatchObservations },
      ];
    }
    // Familia
    return [
      { label: 'Entrenador→grupo', value: notifications.unreadCoachMessages },
      { label: 'Convocatorias por confirmar', value: notifications.pendingCallups },
      { label: 'Anuncios sin leer', value: notifications.unreadAnnouncements },
    ];
  })();
  const total = items.reduce((s, it) => s + (it.value || 0), 0);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <span>{title}</span>
          <Badge className={total > 0 ? 'bg-red-500' : 'bg-green-600'}>{total}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        {items.map((it) => (
          <div key={it.label} className="flex items-center justify-between rounded-lg border bg-white px-3 py-2">
            <span className="text-xs text-slate-600">{it.label}</span>
            <Badge className={(it.value||0) > 0 ? 'bg-red-500' : 'bg-slate-700'}>{it.value || 0}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function ChatTestConsole() {
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState([]);
  const [players, setPlayers] = useState([]);
  const [coachEmail, setCoachEmail] = useState("");
  const [coordEmail, setCoordEmail] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [category, setCategory] = useState("");

  // UI feedback
  const [busy, setBusy] = useState(null); // 'staff'|'p2c'|'c2g'|'p2coord'|'admin2fam'|'private'|null
  const [status, setStatus] = useState(null);
  const [bubbleRole, setBubbleRole] = useState('admin');

  // Impersonaciones ligeras (siempre declarar hooks antes de cualquier return)
  const asAdmin = me;
  const asCoordinator = useMemo(
    () => ({ email: coordEmail, full_name: "Coord (test)", role: "user", es_coordinador: true }),
    [coordEmail]
  );
  const asCoach = useMemo(
    () => ({ email: coachEmail, full_name: "Coach (test)", role: "user", es_entrenador: true, categorias_entrena: category ? [category] : [] }),
    [coachEmail, category]
  );
  const asFamily = useMemo(
    () => ({ email: parentEmail, full_name: "Familia (test)", role: "user" }),
    [parentEmail]
  );

  // Unificar: una instancia del hook por rol (evita duplicados y rate limits)
  const adminN = useUnifiedNotifications(asAdmin, { forceInstance: true, ignorePause: true, testModeLoadAll: true }).notifications;
  const coordN = useUnifiedNotifications(asCoordinator, { forceInstance: true, ignorePause: true }).notifications;
  const coachN = useUnifiedNotifications(asCoach, { forceInstance: true, ignorePause: true }).notifications;
  const familyN = useUnifiedNotifications(asFamily, { forceInstance: true, ignorePause: true }).notifications;

  useEffect(() => {
    (async () => {
      const u = await base44.auth.me();
      setMe(u);
      const allUsers = await base44.entities.User.list();
      setUsers(allUsers);
      const allPlayers = await base44.entities.Player.list();
      setPlayers(allPlayers);
      // Defaults
      const coach = allUsers.find((x) => x.es_entrenador === true);
      const coord = allUsers.find((x) => x.es_coordinador === true);
      const anyParent = allPlayers.find((p) => p.email_padre) || {};
      setCoachEmail(coach?.email || "");
      setCoordEmail(coord?.email || "");
      setParentEmail(anyParent.email_padre || "");
      setCategory(allPlayers[0]?.deporte || "Fútbol Alevín (Mixto)");
    })();
  }, []);

  if (!me) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" />
      </div>
    );
  }

  if (me.role !== "admin") {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <ShieldAlert className="w-5 h-5" /> Solo administradores
            </CardTitle>
          </CardHeader>
          <CardContent>
            Esta consola está restringida a administradores para pruebas internas del sistema de chats.
          </CardContent>
        </Card>
      </div>
    );
  }

  // (moved hooks above to keep consistent order)

  const categories = Array.from(new Set(players.map((p) => p.deporte).filter(Boolean)));
  const parentOptions = Array.from(new Set(players.map((p) => p.email_padre).filter(Boolean)));
  const coachOptions = users.filter((u) => u.es_entrenador).map((u) => u.email);
  const coordOptions = users.filter((u) => u.es_coordinador).map((u) => u.email);

  const slug = (str) => (str || "").toLowerCase().replace(/\s+/g, "_");

  // Actions (crear mensajes de prueba)
  const sendStaff = async () => {
    setBusy('staff'); setStatus(null);
    try {
      const convs = await base44.entities.StaffConversation.filter({ categoria: "General" });
      const conv = convs[0] || (await base44.entities.StaffConversation.create({ nombre: "Chat Interno Staff", categoria: "General", participantes: [], activa: true }));
      await base44.entities.StaffMessage.create({
        conversacion_id: conv.id,
        autor_email: me.email,
        autor_nombre: me.full_name,
        autor_rol: "admin",
        mensaje: `Prueba staff ${new Date().toLocaleTimeString()}`,
        leido_por: [{ email: me.email, nombre: me.full_name, fecha: new Date().toISOString() }],
      });
      setStatus('✅ Staff: mensaje creado');
    } catch (e) {
      setStatus(`❌ Staff: ${e?.message || e}`);
    } finally {
      setBusy(null);
    }
  };

  const sendParentToCoach = async () => {
    setBusy('p2c'); setStatus(null);
    try {
      if (!category || !parentEmail) throw new Error('Falta categoría o email de familia');
      await base44.entities.ChatMessage.create({
        grupo_id: slug(category),
        deporte: category,
        tipo: "padre_a_grupo",
        remitente_email: parentEmail,
        remitente_nombre: "Familia Test",
        mensaje: `Familia→Entrenador (${category}) ${new Date().toLocaleTimeString()}`,
        leido: false,
        leido_por: [],
      });
      setStatus('✅ Enviado: Familia→Entrenador');
    } catch (e) {
      setStatus(`❌ Familia→Entrenador: ${e?.message || e}`);
    } finally {
      setBusy(null);
    }
  };

  const sendCoachToGroup = async () => {
    setBusy('c2g'); setStatus(null);
    try {
      if (!category || !coachEmail) throw new Error('Falta categoría o email de entrenador');
      await base44.entities.ChatMessage.create({
        grupo_id: slug(category),
        deporte: category,
        tipo: "entrenador_a_grupo",
        remitente_email: coachEmail,
        remitente_nombre: "Coach Test",
        mensaje: `Entrenador→Grupo (${category}) ${new Date().toLocaleTimeString()}`,
        leido: false,
        leido_por: [],
      });
      setStatus('✅ Enviado: Entrenador→Grupo');
    } catch (e) {
      setStatus(`❌ Entrenador→Grupo: ${e?.message || e}`);
    } finally {
      setBusy(null);
    }
  };

  const sendParentToCoordinator = async () => {
    setBusy('p2coord'); setStatus(null);
    try {
      if (!parentEmail) throw new Error('Falta email de familia');
      const convs = await base44.entities.CoordinatorConversation.filter({ padre_email: parentEmail });
      const conv = convs[0] || (await base44.entities.CoordinatorConversation.create({ padre_email: parentEmail, padre_nombre: "Familia Test", no_leidos_coordinador: 0, no_leidos_padre: 0, archivada: false }));
      await base44.entities.CoordinatorMessage.create({
        conversacion_id: conv.id,
        autor: "padre",
        autor_email: parentEmail,
        autor_nombre: "Familia Test",
        mensaje: `Familia→Coordinador ${new Date().toLocaleTimeString()}`,
        leido_padre: true,
        leido_coordinador: false,
      });
      await base44.entities.CoordinatorConversation.update(conv.id, { ultimo_mensaje: "Nuevo mensaje (familia)", ultimo_mensaje_autor: "padre", ultimo_mensaje_fecha: new Date().toISOString(), no_leidos_coordinador: (conv.no_leidos_coordinador || 0) + 1 });
      setStatus('✅ Enviado: Familia→Coordinador');
    } catch (e) {
      setStatus(`❌ Familia→Coordinador: ${e?.message || e}`);
    } finally {
      setBusy(null);
    }
  };

  const sendCoordinatorToFamily = async () => {
    setBusy('coord2fam'); setStatus(null);
    try {
      if (!parentEmail || !coordEmail) throw new Error('Faltan emails (familia o coordinador)');
      const convs = await base44.entities.CoordinatorConversation.filter({ padre_email: parentEmail });
      const conv = convs[0] || (await base44.entities.CoordinatorConversation.create({ padre_email: parentEmail, padre_nombre: "Familia Test", no_leidos_coordinador: 0, no_leidos_padre: 0, archivada: false }));
      await base44.entities.CoordinatorMessage.create({
        conversacion_id: conv.id,
        autor: "coordinador",
        autor_email: coordEmail,
        autor_nombre: "Coordinador Test",
        mensaje: `Coordinador→Familia ${new Date().toLocaleTimeString()}`,
        leido_padre: false,
        leido_coordinador: true,
      });
      await base44.entities.CoordinatorConversation.update(conv.id, { ultimo_mensaje: "Nuevo mensaje (coordinador)", ultimo_mensaje_autor: "coordinador", ultimo_mensaje_fecha: new Date().toISOString(), no_leidos_padre: (conv.no_leidos_padre || 0) + 1 });
      setStatus('✅ Enviado: Coordinador→Familia');
    } catch (e) {
      setStatus(`❌ Coordinador→Familia: ${e?.message || e}`);
    } finally {
      setBusy(null);
    }
  };

  const sendAdminToFamily = async () => {
    setBusy('admin2fam'); setStatus(null);
    try {
      if (!parentEmail) throw new Error('Falta email de familia');
      const convs = await base44.entities.AdminConversation.filter({ padre_email: parentEmail, resuelta: false });
      const conv = convs[0] || (await base44.entities.AdminConversation.create({ padre_email: parentEmail, padre_nombre: "Familia Test", escalada_desde_coordinador: true, coordinador_que_escalo: coordEmail || "coordinador@club", motivo_escalacion: "Otro" }));
      await base44.entities.AdminMessage.create({
        conversacion_id: conv.id,
        autor: "admin",
        autor_email: me.email,
        autor_nombre: me.full_name,
        mensaje: `Admin→Familia ${new Date().toLocaleTimeString()}`,
        leido_admin: true,
        leido_padre: false,
      });
      await base44.entities.AdminConversation.update(conv.id, { ultimo_mensaje: "Nuevo mensaje (admin)", ultimo_mensaje_autor: "admin", ultimo_mensaje_fecha: new Date().toISOString(), no_leidos_padre: (conv.no_leidos_padre || 0) + 1 });
      setStatus('✅ Enviado: Admin→Familia');
    } catch (e) {
      setStatus(`❌ Admin→Familia: ${e?.message || e}`);
    } finally {
      setBusy(null);
    }
  };

  const sendPrivateToFamily = async () => {
    setBusy('private'); setStatus(null);
    try {
      if (!parentEmail) throw new Error('Falta email de familia');
      const convs = await base44.entities.PrivateConversation.filter({ participante_familia_email: parentEmail });
      const conv = convs[0] || (await base44.entities.PrivateConversation.create({
        participante_familia_email: parentEmail,
        participante_familia_nombre: "Familia Test",
        participante_staff_email: me.email,
        participante_staff_nombre: me.full_name,
        participante_staff_rol: "admin",
        categoria: category || "General",
        no_leidos_familia: 0,
        no_leidos_staff: 0,
      }));
      await base44.entities.PrivateMessage.create({
        conversacion_id: conv.id,
        remitente_email: me.email,
        remitente_nombre: me.full_name,
        remitente_tipo: "staff",
        mensaje: `Privado del Club ${new Date().toLocaleTimeString()}`,
        leido: false,
      });
      await base44.entities.PrivateConversation.update(conv.id, { ultimo_mensaje: "Privado del Club", ultimo_mensaje_de: "staff", ultimo_mensaje_fecha: new Date().toISOString(), no_leidos_familia: (conv.no_leidos_familia || 0) + 1 });
      setStatus('✅ Enviado: Privado del Club');
    } catch (e) {
      setStatus(`❌ Privado del Club: ${e?.message || e}`);
    } finally {
      setBusy(null);
    }
  };

  const bubbleN = bubbleRole==='admin' ? adminN : bubbleRole==='coordinator' ? coordN : bubbleRole==='coach' ? coachN : familyN;

  // ==== Reset de pruebas ====
  const resetStaff = async () => {
    setBusy('reset-staff'); setStatus(null);
    try {
      const msgs = await base44.entities.StaffMessage.filter({ created_by: me.email });
      for (const m of msgs) await base44.entities.StaffMessage.delete(m.id);
      setStatus('✅ Reset Staff completado');
    } catch (e) { setStatus(`❌ Reset Staff: ${e?.message || e}`); }
    finally { setBusy(null); }
  };

  const resetParentToCoach = async () => {
    setBusy('reset-p2c'); setStatus(null);
    try {
      // Borra TODOS los mensajes de familias al grupo de la categoría seleccionada
      const msgs = await base44.entities.ChatMessage.filter({ tipo: 'padre_a_grupo', grupo_id: slug(category) });
      for (const m of msgs) await base44.entities.ChatMessage.delete(m.id);
      setStatus('✅ Reset Familia→Entrenador completado');
    } catch (e) { setStatus(`❌ Reset Familia→Entrenador: ${e?.message || e}`); }
    finally { setBusy(null); }
  };

  const resetCoachToGroup = async () => {
    setBusy('reset-c2g'); setStatus(null);
    try {
      // Borra TODOS los mensajes de entrenador al grupo de la categoría seleccionada
      const msgs = await base44.entities.ChatMessage.filter({ tipo: 'entrenador_a_grupo', grupo_id: slug(category) });
      for (const m of msgs) await base44.entities.ChatMessage.delete(m.id);
      setStatus('✅ Reset Entrenador→Grupo completado');
    } catch (e) { setStatus(`❌ Reset Entrenador→Grupo: ${e?.message || e}`); }
    finally { setBusy(null); }
  };

  const resetCoordinatorFamily = async () => {
    setBusy('reset-coordfam'); setStatus(null);
    try {
      const convs = await base44.entities.CoordinatorConversation.filter({ padre_email: parentEmail });
      const conv = convs[0];
      if (conv) {
        const msgs = await base44.entities.CoordinatorMessage.filter({ conversacion_id: conv.id });
        for (const m of msgs) await base44.entities.CoordinatorMessage.delete(m.id);
        await base44.entities.CoordinatorConversation.update(conv.id, { no_leidos_coordinador: 0, no_leidos_padre: 0 });
        // Eliminar la conversación para limpiar totalmente contadores/badges
        await base44.entities.CoordinatorConversation.delete(conv.id);
      }
      setStatus('✅ Reset Coordinador↔Familia completado');
    } catch (e) { setStatus(`❌ Reset Coordinador↔Familia: ${e?.message || e}`); }
    finally { setBusy(null); }
  };

  const resetAdminFamily = async () => {
    setBusy('reset-adminfam'); setStatus(null);
    try {
      const convs = await base44.entities.AdminConversation.filter({ padre_email: parentEmail });
      const conv = convs[0];
      if (conv) {
        const msgs = await base44.entities.AdminMessage.filter({ conversacion_id: conv.id });
        for (const m of msgs) await base44.entities.AdminMessage.delete(m.id);
        await base44.entities.AdminConversation.update(conv.id, { no_leidos_admin: 0, no_leidos_padre: 0 });
        // Eliminar conversación para borrar badges de críticos
        await base44.entities.AdminConversation.delete(conv.id);
      }
      setStatus('✅ Reset Admin↔Familia completado');
    } catch (e) { setStatus(`❌ Reset Admin↔Familia: ${e?.message || e}`); }
    finally { setBusy(null); }
  };

  const resetPrivateClub = async () => {
    setBusy('reset-private'); setStatus(null);
    try {
      const convs = await base44.entities.PrivateConversation.filter({ participante_familia_email: parentEmail, participante_staff_email: me.email });
      const conv = convs[0];
      if (conv) {
        const msgs = await base44.entities.PrivateMessage.filter({ conversacion_id: conv.id });
        for (const m of msgs) await base44.entities.PrivateMessage.delete(m.id);
        await base44.entities.PrivateConversation.update(conv.id, { no_leidos_familia: 0, no_leidos_staff: 0 });
        await base44.entities.PrivateConversation.delete(conv.id);
      }
      setStatus('✅ Reset Privados (Club) completado');
    } catch (e) { setStatus(`❌ Reset Privados: ${e?.message || e}`); }
    finally { setBusy(null); }
  };

  const resetAll = async () => {
    setBusy('reset-all'); setStatus('⏳ Reseteando todo...');
    try {
      // Ejecutar en serie para evitar picos de carga
      await resetParentToCoach();
      await resetCoachToGroup();
      await resetCoordinatorFamily();
      await resetAdminFamily();
      await resetPrivateClub();
      await resetStaff();
      setStatus('✅ Reset completo');
    } catch (e) {
      setStatus(`❌ Reset general: ${e?.message || e}`);
    } finally {
      setBusy(null);
    }
  };

   return (
    <div className="min-h-screen p-4 lg:p-6 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-6xl mx-auto grid gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Rocket className="w-5 h-5 text-orange-600" /> Consola de Pruebas de Chat (Admin)
          </h1>
          <Badge className="bg-slate-800 text-white">{me.email}</Badge>
        </div>

        {/* Configuración de prueba */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Configuración rápida</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-4 gap-3">
            <div>
              <div className="text-xs text-slate-500 mb-1">Categoría</div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Categoría" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Email Entrenador</div>
              <Select value={coachEmail} onValueChange={setCoachEmail}>
                <SelectTrigger><SelectValue placeholder="Entrenador" /></SelectTrigger>
                <SelectContent>
                  {coachOptions.map((e) => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Email Coordinador</div>
              <Select value={coordEmail} onValueChange={setCoordEmail}>
                <SelectTrigger><SelectValue placeholder="Coordinador" /></SelectTrigger>
                <SelectContent>
                  {coordOptions.map((e) => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Email Familia</div>
              <Select value={parentEmail} onValueChange={setParentEmail}>
                <SelectTrigger><SelectValue placeholder="Familia" /></SelectTrigger>
                <SelectContent>
                  {parentOptions.map((e) => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Acciones */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Acciones de prueba</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-2">
            <Button disabled={!!busy} onClick={sendStaff} className="gap-2">
              {busy==='staff' ? <div className="spinner-elegant" /> : <Users className="w-4 h-4" />} Staff: nuevo mensaje
            </Button>
            <Button disabled={!!busy} onClick={sendParentToCoach} className="gap-2">
              {busy==='p2c' ? <div className="spinner-elegant" /> : <MessageCircle className="w-4 h-4" />} Familia→Entrenador
            </Button>
            <Button disabled={!!busy} onClick={sendCoachToGroup} className="gap-2">
              {busy==='c2g' ? <div className="spinner-elegant" /> : <MessageCircle className="w-4 h-4" />} Entrenador→Grupo
            </Button>
            <Button disabled={!!busy} onClick={sendParentToCoordinator} className="gap-2">
              {busy==='p2coord' ? <div className="spinner-elegant" /> : <MessageCircle className="w-4 h-4" />} Familia→Coordinador
            </Button>
            <Button disabled={!!busy} onClick={sendCoordinatorToFamily} className="gap-2">
              {busy==='coord2fam' ? <div className="spinner-elegant" /> : <MessageCircle className="w-4 h-4" />} Coordinador→Familia
            </Button>
            <Button disabled={!!busy} onClick={sendAdminToFamily} className="gap-2">
              {busy==='admin2fam' ? <div className="spinner-elegant" /> : <ShieldAlert className="w-4 h-4" />} Admin→Familia (crítica)
            </Button>
            <Button disabled={!!busy} onClick={sendPrivateToFamily} className="gap-2">
              {busy==='private' ? <div className="spinner-elegant" /> : <Mail className="w-4 h-4" />} Privado del Club
            </Button>
            {status && (
              <div className="md:col-span-3 text-sm text-slate-600 mt-2">{status}</div>
            )}
          </CardContent>
        </Card>

        {/* Reseteo de pruebas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Reseteo de pruebas</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-2">
            <Button disabled={!!busy} onClick={resetStaff} className="gap-2">
              {busy==='reset-staff' ? <div className="spinner-elegant" /> : <Users className="w-4 h-4" />} Reset Staff
            </Button>
            <Button disabled={!!busy} onClick={resetParentToCoach} className="gap-2">
              {busy==='reset-p2c' ? <div className="spinner-elegant" /> : <MessageCircle className="w-4 h-4" />} Reset Familia→Entrenador
            </Button>
            <Button disabled={!!busy} onClick={resetCoachToGroup} className="gap-2">
              {busy==='reset-c2g' ? <div className="spinner-elegant" /> : <MessageCircle className="w-4 h-4" />} Reset Entrenador→Grupo
            </Button>
            <Button disabled={!!busy} onClick={resetCoordinatorFamily} className="gap-2">
              {busy==='reset-coordfam' ? <div className="spinner-elegant" /> : <MessageCircle className="w-4 h-4" />} Reset Coordinador↔Familia
            </Button>
            <Button disabled={!!busy} onClick={resetAdminFamily} className="gap-2">
              {busy==='reset-adminfam' ? <div className="spinner-elegant" /> : <ShieldAlert className="w-4 h-4" />} Reset Admin↔Familia
            </Button>
            <Button disabled={!!busy} onClick={resetPrivateClub} className="gap-2">
              {busy==='reset-private' ? <div className="spinner-elegant" /> : <Mail className="w-4 h-4" />} Reset Privados (Club)
            </Button>
            <Button disabled={!!busy} onClick={resetAll} variant="outline" className="gap-2 md:col-span-3">
              {busy==='reset-all' ? <div className="spinner-elegant" /> : <Bell className="w-4 h-4" />} Reset TODO
            </Button>
          </CardContent>
        </Card>

        {/* Previsualización de burbujas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Previsualización de burbujas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-slate-500">Rol:</span>
              <Button size="sm" variant={bubbleRole==='admin' ? 'default' : 'outline'} onClick={() => setBubbleRole('admin')}>Admin</Button>
              <Button size="sm" variant={bubbleRole==='coordinator' ? 'default' : 'outline'} onClick={() => setBubbleRole('coordinator')}>Coordinador</Button>
              <Button size="sm" variant={bubbleRole==='coach' ? 'default' : 'outline'} onClick={() => setBubbleRole('coach')}>Entrenador</Button>
              <Button size="sm" variant={bubbleRole==='family' ? 'default' : 'outline'} onClick={() => setBubbleRole('family')}>Familia</Button>
            </div>
            <BubbleRow role={bubbleRole} notifications={bubbleN} />
          </CardContent>
        </Card>

        {/* Contadores en vivo por rol */}
        <div className="text-xs text-slate-500 mb-1">Arriba: contadores en vivo por rol. Abajo: previsualización de la barra de tareas.</div>
        <div className="grid md:grid-cols-4 gap-3">
          <RoleCounters title="Vista Admin" notifications={adminN} />
          <RoleCounters title="Vista Coordinador" notifications={coordN} />
          <RoleCounters title="Vista Entrenador" notifications={coachN} />
          <RoleCounters title="Vista Familia" notifications={familyN} />
        </div>

        {/* Previsualización barra de tareas (AlertCenter) por rol */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Previsualización de barra de tareas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-3">
              <AlertPreview title="Admin" userStub={asAdmin} notifications={adminN} />
              <AlertPreview title="Coordinador" userStub={asCoordinator} notifications={coordN} />
              <AlertPreview title="Entrenador" userStub={asCoach} notifications={coachN} />
              <AlertPreview title="Familia" userStub={asFamily} notifications={familyN} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, ShieldAlert, Users, Bell, Rocket, Mail, RefreshCw } from "lucide-react";
import { UnifiedChatNotificationStore } from "../components/notifications/UnifiedChatNotificationStore";

function LiveChatCounters({ userEmail, role }) {
  const [counts, setCounts] = useState({});

  useEffect(() => {
    if (!userEmail) return;
    UnifiedChatNotificationStore.initUser(userEmail);
    const unsub = UnifiedChatNotificationStore.subscribe(userEmail, (state) => {
      setCounts(state);
    });
    return unsub;
  }, [userEmail]);

  const items = (() => {
    if (role === 'staff') {
      return [
        { key: 'staff', label: 'Staff', value: counts.staff, Icon: Users },
        { key: 'coord', label: 'Coord→Fam', value: counts.coordinator, Icon: MessageCircle },
        { key: 'coach', label: 'Coach→Fam', value: counts.coach, Icon: MessageCircle },
      ];
    }
    if (role === 'family') {
      return [
        { key: 'system', label: 'Sistema', value: counts.systemMessages, Icon: Mail },
        { key: 'coord', label: 'Coordinador', value: counts.coordinatorForFamily, Icon: MessageCircle },
        { key: 'coach', label: 'Entrenador', value: counts.coachForFamily, Icon: MessageCircle },
      ];
    }
    return [];
  })();

  return (
    <div className="flex flex-wrap gap-4 items-center">
      {items.map(({ key, label, value, Icon }) => (
        <div key={key} className="flex flex-col items-center">
          <div className="relative">
            <div className="h-11 w-11 rounded-full bg-white border flex items-center justify-center shadow">
              <Icon className="w-5 h-5 text-slate-700" />
            </div>
            <span className={`absolute -top-1 -right-1 rounded-full text-[10px] px-1.5 py-0.5 ${(value||0) > 0 ? 'bg-red-600 text-white' : 'bg-slate-300 text-slate-700'}`}>
              {value || 0}
            </span>
          </div>
          <div className="text-[10px] text-slate-600 mt-1">{label}</div>
        </div>
      ))}
    </div>
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
  const [busy, setBusy] = useState(null);
  const [status, setStatus] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    (async () => {
      const u = await base44.auth.me();
      setMe(u);
      const allUsers = await base44.entities.User.list();
      setUsers(allUsers);
      const allPlayers = await base44.entities.Player.list();
      setPlayers(allPlayers);
      const coach = allUsers.find((x) => x.es_entrenador === true);
      const coord = allUsers.find((x) => x.es_coordinador === true);
      const anyParent = allPlayers.find((p) => p.email_padre) || {};
      setCoachEmail(coach?.email || "");
      setCoordEmail(coord?.email || "");
      setParentEmail(anyParent.email_padre || "");
      setCategory(allPlayers[0]?.deporte || "Fútbol Alevín (Mixto)");
    })();
  }, []);

  const [staffCounts, setStaffCounts] = useState({});
  const [familyCounts, setFamilyCounts] = useState({});

  useEffect(() => {
    if (!coordEmail) return;
    UnifiedChatNotificationStore.initUser(coordEmail);
    const unsub = UnifiedChatNotificationStore.subscribe(coordEmail, setStaffCounts);
    return unsub;
  }, [coordEmail, refreshKey]);

  useEffect(() => {
    if (!parentEmail) return;
    UnifiedChatNotificationStore.initUser(parentEmail);
    const unsub = UnifiedChatNotificationStore.subscribe(parentEmail, setFamilyCounts);
    return unsub;
  }, [parentEmail, refreshKey]);

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

  const sendStaff = async () => {
    setBusy('staff'); setStatus(null);
    try {
      const convs = await base44.entities.StaffConversation.filter({ categoria: "General" });
      const conv = convs[0] || (await base44.entities.StaffConversation.create({ nombre: "Test Staff", categoria: "General", participantes: [], activa: true }));
      await base44.entities.StaffMessage.create({
        conversacion_id: conv.id,
        autor_email: me.email,
        autor_nombre: me.full_name,
        autor_rol: 'admin',
        mensaje: `Prueba Staff ${new Date().toLocaleTimeString()}`,
        leido_por: [{ email: me.email, nombre: me.full_name, fecha: new Date().toISOString() }],
      });
      setStatus('✅ Mensaje Staff enviado');
    } catch (e) {
      setStatus(`❌ ${e?.message || e}`);
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
        participante_staff_email: 'sistema@cdbustarviejo.com',
        participante_staff_nombre: "Sistema",
        participante_staff_rol: "admin",
        categoria: category || "General",
        no_leidos_familia: 0,
        no_leidos_staff: 0,
      }));
      await base44.entities.PrivateMessage.create({
        conversacion_id: conv.id,
        remitente_email: 'sistema@cdbustarviejo.com',
        remitente_nombre: "Sistema",
        remitente_tipo: "staff",
        mensaje: `🤖 Privado del Club ${new Date().toLocaleTimeString()}`,
        leido: false,
      });
      await base44.entities.PrivateConversation.update(conv.id, { 
        ultimo_mensaje: "Privado del Club", 
        ultimo_mensaje_de: "staff", 
        ultimo_mensaje_fecha: new Date().toISOString(), 
        no_leidos_familia: (conv.no_leidos_familia || 0) + 1 
      });
      setStatus('✅ Mensaje Privado enviado a Familia');
    } catch (e) {
      setStatus(`❌ ${e?.message || e}`);
    } finally {
      setBusy(null);
    }
  };

  const sendCoachConversation = async () => {
    setBusy('coach1a1'); setStatus(null);
    try {
      if (!coachEmail || !parentEmail) throw new Error('Falta email de entrenador o familia');
      const convs = await base44.entities.CoachConversation.filter({ 
        entrenador_email: coachEmail, 
        padre_email: parentEmail 
      });
      const conv = convs[0] || (await base44.entities.CoachConversation.create({
        entrenador_email: coachEmail,
        entrenador_nombre: "Coach Test",
        padre_email: parentEmail,
        padre_nombre: "Familia Test",
        categoria: category,
        no_leidos_entrenador: 0,
        no_leidos_padre: 0,
      }));
      await base44.entities.ChatMessage.create({
        grupo_id: conv.id,
        deporte: category,
        tipo: "padre_a_grupo",
        remitente_email: parentEmail,
        remitente_nombre: "Familia Test",
        destinatario_email: coachEmail,
        mensaje: `Familia→Entrenador (1-a-1) ${new Date().toLocaleTimeString()}`,
        leido: false,
        leido_por: [],
      });
      await base44.entities.CoachConversation.update(conv.id, {
        no_leidos_entrenador: (conv.no_leidos_entrenador || 0) + 1,
        ultimo_mensaje_fecha: new Date().toISOString()
      });
      setStatus('✅ Mensaje enviado a CoachConversation (entrenador debe recibir notificación)');
    } catch (e) {
      setStatus(`❌ ${e?.message || e}`);
    } finally {
      setBusy(null);
    }
  };

  const resetCounters = () => {
    if (coordEmail) UnifiedChatNotificationStore.clearChatOnly(coordEmail, 'staff');
    if (coordEmail) UnifiedChatNotificationStore.clearChatOnly(coordEmail, 'coordinator');
    if (coachEmail) UnifiedChatNotificationStore.clearChatOnly(coachEmail, 'coach');
    if (parentEmail) UnifiedChatNotificationStore.clearChatOnly(parentEmail, 'systemMessages');
    if (parentEmail) UnifiedChatNotificationStore.clearChatOnly(parentEmail, 'coordinatorForFamily');
    if (parentEmail) UnifiedChatNotificationStore.clearChatOnly(parentEmail, 'coachForFamily');
    setRefreshKey(k => k + 1);
    setStatus('🧹 Contadores limpiados a 0');
  };

  const resetAll = async () => {
    setBusy('reset'); setStatus('⏳ Limpiando...');
    try {
      const msgs1 = await base44.entities.StaffMessage.filter({ created_by: me.email });
      for (const m of msgs1) await base44.entities.StaffMessage.delete(m.id);
      
      const msgs2 = await base44.entities.ChatMessage.filter({ grupo_id: slug(category) });
      for (const m of msgs2) await base44.entities.ChatMessage.delete(m.id);
      
      const convCoord = await base44.entities.CoordinatorConversation.filter({ padre_email: parentEmail });
      for (const c of convCoord) {
        const msgs = await base44.entities.CoordinatorMessage.filter({ conversacion_id: c.id });
        for (const m of msgs) await base44.entities.CoordinatorMessage.delete(m.id);
        await base44.entities.CoordinatorConversation.delete(c.id);
      }
      
      const convPrivate = await base44.entities.PrivateConversation.filter({ participante_familia_email: parentEmail });
      for (const c of convPrivate) {
        const msgs = await base44.entities.PrivateMessage.filter({ conversacion_id: c.id });
        for (const m of msgs) await base44.entities.PrivateMessage.delete(m.id);
        await base44.entities.PrivateConversation.delete(c.id);
      }

      const convCoach = await base44.entities.CoachConversation.filter({ padre_email: parentEmail });
      for (const c of convCoach) await base44.entities.CoachConversation.delete(c.id);

      resetCounters();
      setStatus('✅ Todo limpiado');
    } catch (e) {
      setStatus(`❌ ${e?.message || e}`);
    } finally {
      setBusy(null);
    }
  };



  return (
    <div className="min-h-screen p-4 lg:p-6 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Rocket className="w-6 h-6 text-orange-600" /> Test de Notificaciones
          </h1>
          <Button onClick={() => setRefreshKey(k => k + 1)} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Config */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">⚙️ Configuración</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-slate-500 mb-1">Categoría</div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Coordinador</div>
              <Select value={coordEmail} onValueChange={setCoordEmail}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {coordOptions.map((e) => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Familia</div>
              <Select value={parentEmail} onValueChange={setParentEmail}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {parentOptions.map((e) => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Contadores en vivo */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">👥 Staff (Coordinador)</CardTitle>
            </CardHeader>
            <CardContent>
              <LiveChatCounters key={`staff-${coordEmail}-${refreshKey}`} userEmail={coordEmail} role="staff" />
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                <div className="bg-slate-50 p-2 rounded">
                  <span className="text-slate-600">Staff:</span> <Badge>{staffCounts.staff || 0}</Badge>
                </div>
                <div className="bg-slate-50 p-2 rounded">
                  <span className="text-slate-600">Coord→Fam:</span> <Badge>{staffCounts.coordinator || 0}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">👨‍👩‍👧 Familia</CardTitle>
            </CardHeader>
            <CardContent>
              <LiveChatCounters key={`family-${parentEmail}-${refreshKey}`} userEmail={parentEmail} role="family" />
              <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                <div className="bg-slate-50 p-2 rounded">
                  <span className="text-slate-600">Sistema:</span> <Badge>{familyCounts.systemMessages || 0}</Badge>
                </div>
                <div className="bg-slate-50 p-2 rounded">
                  <span className="text-slate-600">Coord:</span> <Badge>{familyCounts.coordinatorForFamily || 0}</Badge>
                </div>
                <div className="bg-slate-50 p-2 rounded">
                  <span className="text-slate-600">Coach:</span> <Badge>{familyCounts.coachForFamily || 0}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Acciones */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">🚀 Enviar Mensajes de Prueba</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-2">
            <Button disabled={!!busy} onClick={sendStaff} className="gap-2">
              <Users className="w-4 h-4" /> Staff (general)
            </Button>
            <Button disabled={!!busy} onClick={sendParentToCoach} className="gap-2">
              <MessageCircle className="w-4 h-4" /> Familia→Entrenador (grupo)
            </Button>
            <Button disabled={!!busy} onClick={sendCoachConversation} className="gap-2">
              <MessageCircle className="w-4 h-4" /> Familia→Entrenador (1-a-1)
            </Button>
            <Button disabled={!!busy} onClick={sendParentToCoordinator} className="gap-2">
              <MessageCircle className="w-4 h-4" /> Familia→Coordinador
            </Button>
            <Button disabled={!!busy} onClick={sendCoordinatorToFamily} className="gap-2">
              <MessageCircle className="w-4 h-4" /> Coordinador→Familia
            </Button>
            <Button disabled={!!busy} onClick={sendPrivateToFamily} className="gap-2">
              <Mail className="w-4 h-4" /> Sistema→Familia
            </Button>
          </CardContent>
        </Card>

        {/* Reset */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">🧹 Limpieza</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button disabled={!!busy} onClick={resetCounters} variant="outline">
              Poner contadores a 0
            </Button>
            <Button disabled={!!busy} onClick={resetAll} variant="destructive">
              {busy === 'reset' ? '⏳' : '🗑️'} Borrar TODO
            </Button>
          </CardContent>
        </Card>

        {status && (
          <Card className="border-blue-300 bg-blue-50">
            <CardContent className="p-4">
              <p className="text-sm font-medium">{status}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
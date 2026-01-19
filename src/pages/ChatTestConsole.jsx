import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MessageCircle, ShieldAlert, Users, Bell, Rocket, Mail } from "lucide-react";
import { useUnifiedNotifications } from "../components/notifications/useUnifiedNotifications";

function RoleCounters({ title, userStub }) {
  const { notifications } = useUnifiedNotifications(userStub);
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

export default function ChatTestConsole() {
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState([]);
  const [players, setPlayers] = useState([]);
  const [coachEmail, setCoachEmail] = useState("");
  const [coordEmail, setCoordEmail] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [category, setCategory] = useState("");

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

  // Impersonaciones ligeras (solo para contadores del hook)
  const asAdmin = me;
  const asCoordinator = useMemo(() => ({ email: coordEmail, full_name: "Coord (test)", role: "user", es_coordinador: true }), [coordEmail]);
  const asCoach = useMemo(() => ({ email: coachEmail, full_name: "Coach (test)", role: "user", es_entrenador: true, categorias_entrena: category ? [category] : [] }), [coachEmail, category]);
  const asFamily = useMemo(() => ({ email: parentEmail, full_name: "Familia (test)", role: "user" }), [parentEmail]);

  const categories = Array.from(new Set(players.map((p) => p.deporte).filter(Boolean)));
  const parentOptions = Array.from(new Set(players.map((p) => p.email_padre).filter(Boolean)));
  const coachOptions = users.filter((u) => u.es_entrenador).map((u) => u.email);
  const coordOptions = users.filter((u) => u.es_coordinador).map((u) => u.email);

  const slug = (str) => (str || "").toLowerCase().replace(/\s+/g, "_");

  // Actions (crear mensajes de prueba)
  const sendStaff = async () => {
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
  };

  const sendParentToCoach = async () => {
    if (!category || !parentEmail) return;
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
  };

  const sendCoachToGroup = async () => {
    if (!category || !coachEmail) return;
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
  };

  const sendParentToCoordinator = async () => {
    if (!parentEmail) return;
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
  };

  const sendAdminToFamily = async () => {
    if (!parentEmail) return;
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
  };

  const sendPrivateToFamily = async () => {
    if (!parentEmail) return;
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
            <Button onClick={sendStaff} className="gap-2"><Users className="w-4 h-4" /> Staff: nuevo mensaje</Button>
            <Button onClick={sendParentToCoach} className="gap-2"><MessageCircle className="w-4 h-4" /> Familia→Entrenador</Button>
            <Button onClick={sendCoachToGroup} className="gap-2"><MessageCircle className="w-4 h-4" /> Entrenador→Grupo</Button>
            <Button onClick={sendParentToCoordinator} className="gap-2"><MessageCircle className="w-4 h-4" /> Familia→Coordinador</Button>
            <Button onClick={sendAdminToFamily} className="gap-2"><ShieldAlert className="w-4 h-4" /> Admin→Familia (crítica)</Button>
            <Button onClick={sendPrivateToFamily} className="gap-2"><Mail className="w-4 h-4" /> Privado del Club</Button>
          </CardContent>
        </Card>

        {/* Contadores en vivo por rol */}
        <div className="grid md:grid-cols-4 gap-3">
          <RoleCounters title="Vista Admin" userStub={asAdmin} />
          <RoleCounters title="Vista Coordinador" userStub={asCoordinator} />
          <RoleCounters title="Vista Entrenador" userStub={asCoach} />
          <RoleCounters title="Vista Familia" userStub={asFamily} />
        </div>
      </div>
    </div>
  );
}
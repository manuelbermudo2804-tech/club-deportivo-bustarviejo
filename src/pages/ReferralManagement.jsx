import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Users, Gift, Shirt, Ticket, Hotel, Trophy, Search, 
  CheckCircle2, Clock, Crown, Star, Sparkles, Download,
  Eye, Award, PartyPopper, Dices, Play, History, Package,
  Plus, HelpCircle, Info, UserPlus, AlertCircle, UserCheck,
  MessageCircle, Send, RefreshCw, ExternalLink, Copy, Check, Mail
} from "lucide-react";
import { toast } from "sonner";

const TIER_CONFIG = [
  { count: 1, emoji: "🎁", label: "Bronce", color: "bg-blue-500" },
  { count: 3, emoji: "⭐", label: "Plata", color: "bg-green-500" },
  { count: 5, emoji: "🏆", label: "Oro", color: "bg-orange-500" },
  { count: 10, emoji: "👑", label: "Platino", color: "bg-purple-500" },
  { count: 15, emoji: "🏨", label: "Diamante", color: "bg-pink-500" }
];

const getTierForCount = (count) => {
  if (count >= 15) return TIER_CONFIG[4];
  if (count >= 10) return TIER_CONFIG[3];
  if (count >= 5) return TIER_CONFIG[2];
  if (count >= 3) return TIER_CONFIG[1];
  if (count >= 1) return TIER_CONFIG[0];
  return null;
};

// Generar código único para renovación
const generateRenewalCode = (memberId) => {
  let hash = 0;
  const str = memberId + "renewal";
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).toUpperCase().slice(0, 8);
};

// Componente para la pestaña de Socios Externos
function ExternalMembersTab({ clubMembers, players, seasonConfig, searchTerm, setSearchTerm, filter, setFilter, copiedId, setCopiedId, queryClient }) {
  const [sendingEmail, setSendingEmail] = useState(null);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [sendingBulk, setSendingBulk] = useState(false);

  // Obtener emails de padres con jugadores activos
  const parentEmails = new Set();
  players.forEach(p => {
    if (p.email_padre) parentEmails.add(p.email_padre.toLowerCase());
    if (p.email_tutor_2) parentEmails.add(p.email_tutor_2.toLowerCase());
  });

  // Socios externos = socios cuyo email NO está en la lista de padres
  const currentSeason = seasonConfig?.temporada;
  const externalMembers = clubMembers.filter(m => {
    const isExternal = !parentEmails.has(m.email?.toLowerCase());
    const isCurrentSeason = m.temporada === currentSeason;
    return isExternal && isCurrentSeason;
  });

  // Filtrar por búsqueda y estado
  const filteredMembers = externalMembers.filter(m => {
    const matchesSearch = 
      m.nombre_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.telefono?.includes(searchTerm);
    const matchesFilter = filter === "all" || m.estado_pago === filter;
    return matchesSearch && matchesFilter;
  });

  // Estadísticas
  const totalExternal = externalMembers.length;
  const pagados = externalMembers.filter(m => m.estado_pago === "Pagado").length;
  const pendientes = externalMembers.filter(m => m.estado_pago === "Pendiente").length;
  const enRevision = externalMembers.filter(m => m.estado_pago === "En revisión").length;

  const getNextSeason = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    if (month >= 6) {
      return `${year}/${year + 1}`;
    }
    return `${year}/${year + 1}`;
  };

  // Generar mensaje de WhatsApp para renovación
  const generateWhatsAppRenewalLink = (member) => {
    const baseUrl = window.location.origin;
    const renewalCode = generateRenewalCode(member.id);
    const renewalLink = `${baseUrl}/ClubMembership?renew=${renewalCode}`;
    
    const message = `¡Hola ${member.nombre_completo}! 👋

Desde el CD Bustarviejo queremos darte las GRACIAS de corazón 💚

Gracias a socios como tú, más de 200 niños y niñas pueden disfrutar del deporte cada semana.

🎉 ¡Te invitamos a renovar tu carnet de socio para la temporada ${getNextSeason()}!

👉 ${renewalLink}

(Tus datos ya están guardados, ¡solo confirma!)

¡GRACIAS por ser parte de nuestra familia! ⚽🏀💪

CD Bustarviejo 🧡💚`;

    return `https://wa.me/${member.telefono?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
  };

  // Enviar email individual
  const sendEmailToMember = async (member) => {
    if (!member.email) {
      toast.error("Este socio no tiene email");
      return;
    }
    
    setSendingEmail(member.id);
    try {
      const baseUrl = window.location.origin;
      const renewalCode = generateRenewalCode(member.id);
      const renewalLink = `${baseUrl}/ClubMembership?renew=${renewalCode}`;

      await base44.integrations.Core.SendEmail({
        from_name: "CD Bustarviejo",
        to: member.email,
        subject: `💚 ¡Te echamos de menos, ${member.nombre_completo}! Renueva tu carnet de socio`,
        body: `Estimado/a ${member.nombre_completo},

¡Esperamos que estés muy bien! 👋

Desde el CD Bustarviejo queremos darte las GRACIAS de corazón 💚

Gracias a socios como tú, más de 200 niños y niñas de nuestro pueblo pueden disfrutar del fútbol y baloncesto cada semana. Tu apoyo no es solo una cuota, es un voto de confianza en el futuro de nuestra comunidad.

🏆 Desde 1980, más de 40 años formando deportistas y personas en la sierra norte de Madrid.

🎉 ¡TE INVITAMOS A RENOVAR TU CARNET DE SOCIO!

La nueva temporada ${getNextSeason()} ya está en marcha y nos encantaría seguir contando contigo como parte de nuestra gran familia deportiva.

Por solo 25€ al año, seguirás apoyando:
✅ El desarrollo deportivo de nuestros niños y jóvenes
✅ La mejora de instalaciones y equipamiento
✅ Las actividades y eventos del club
✅ El crecimiento de la comunidad deportiva de Bustarviejo

👉 Renueva aquí: ${renewalLink}

(Tus datos ya están guardados, ¡solo confirma y listo!)

Tu número de socio: ${member.numero_socio || 'Se asignará al renovar'}

¡GRACIAS por seguir creyendo en nuestro proyecto! ⚽🏀💪

Con cariño,
CD Bustarviejo 🧡💚

---
Email: cdbustarviejo@gmail.com`
      });

      toast.success(`✅ Email enviado a ${member.nombre_completo}`);
    } catch (error) {
      toast.error("Error enviando email: " + error.message);
    } finally {
      setSendingEmail(null);
    }
  };

  // Enviar emails masivos
  const sendBulkEmails = async () => {
    const membersToEmail = selectedMembers.length > 0 
      ? filteredMembers.filter(m => selectedMembers.includes(m.id) && m.email)
      : filteredMembers.filter(m => m.email);

    if (membersToEmail.length === 0) {
      toast.error("No hay socios con email para enviar");
      return;
    }

    setSendingBulk(true);
    let sent = 0;
    let errors = 0;

    for (const member of membersToEmail) {
      try {
        const baseUrl = window.location.origin;
        const renewalCode = generateRenewalCode(member.id);
        const renewalLink = `${baseUrl}/ClubMembership?renew=${renewalCode}`;

        await base44.integrations.Core.SendEmail({
          from_name: "CD Bustarviejo",
          to: member.email,
          subject: `💚 ¡Te echamos de menos! Renueva tu carnet de socio - CD Bustarviejo`,
          body: `Estimado/a ${member.nombre_completo},

¡Te echamos de menos en el CD Bustarviejo! 💚

🎉 TE INVITAMOS A RENOVAR TU CARNET DE SOCIO para la temporada ${getNextSeason()}.

Por solo 25€ al año, seguirás apoyando a más de 200 jóvenes deportistas de Bustarviejo.

👉 Renueva aquí: ${renewalLink}

¡Gracias por ser parte de nuestra familia!

CD Bustarviejo
cdbustarviejo@gmail.com`
        });
        sent++;
      } catch (error) {
        errors++;
      }
      // Pequeña pausa entre emails
      await new Promise(r => setTimeout(r, 200));
    }

    setSendingBulk(false);
    setSelectedMembers([]);
    
    if (errors === 0) {
      toast.success(`✅ ${sent} emails enviados correctamente`);
    } else {
      toast.warning(`Enviados: ${sent}, Errores: ${errors}`);
    }
  };

  const copyRenewalLink = (member) => {
    const baseUrl = window.location.origin;
    const renewalCode = generateRenewalCode(member.id);
    const renewalLink = `${baseUrl}/ClubMembership?renew=${renewalCode}`;
    navigator.clipboard.writeText(renewalLink);
    setCopiedId(member.id);
    toast.success("Enlace copiado");
    setTimeout(() => setCopiedId(null), 3000);
  };

  // Toggle selección
  const toggleSelect = (memberId) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedMembers.length === filteredMembers.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(filteredMembers.map(m => m.id));
    }
  };

  // Exportar socios externos a CSV
  const exportExternalMembers = () => {
    const data = filteredMembers.map(m => ({
      nombre: m.nombre_completo,
      email: m.email,
      telefono: m.telefono,
      municipio: m.municipio,
      estado_pago: m.estado_pago,
      temporada: m.temporada,
      referido_por: m.referido_por || ""
    }));

    const csv = [
      ["Nombre", "Email", "Teléfono", "Municipio", "Estado Pago", "Temporada", "Referido Por"],
      ...data.map(d => [d.nombre, d.email, d.telefono, d.municipio, d.estado_pago, d.temporada, d.referido_por])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `socios_externos_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4 text-center">
            <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-80" />
            <p className="text-3xl font-bold">{totalExternal}</p>
            <p className="text-sm opacity-80">Socios Externos</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-80" />
            <p className="text-3xl font-bold">{pagados}</p>
            <p className="text-sm opacity-80">Pagados</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
          <CardContent className="p-4 text-center">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-80" />
            <p className="text-3xl font-bold">{enRevision}</p>
            <p className="text-sm opacity-80">En Revisión</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
          <CardContent className="p-4 text-center">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-80" />
            <p className="text-3xl font-bold">{pendientes}</p>
            <p className="text-sm opacity-80">Pendientes</p>
          </CardContent>
        </Card>
      </div>

      {/* Info */}
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Socios Externos:</strong> Personas que son socios del club pero NO tienen hijos inscritos como jugadores. 
          Puedes enviarles recordatorios por <strong>Email</strong> o <strong>WhatsApp</strong>.
        </AlertDescription>
      </Alert>

      {/* Acciones masivas */}
      {filteredMembers.length > 0 && (
        <Card className="bg-gradient-to-r from-orange-50 to-green-50 border-2 border-orange-200">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Send className="w-6 h-6 text-orange-600" />
                <div>
                  <h3 className="font-bold text-slate-900">Envío de Recordatorios</h3>
                  <p className="text-sm text-slate-600">
                    {selectedMembers.length > 0 
                      ? `${selectedMembers.length} socios seleccionados`
                      : `${filteredMembers.filter(m => m.email).length} socios con email`
                    }
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={sendBulkEmails}
                  disabled={sendingBulk}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {sendingBulk ? (
                    <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
                  ) : (
                    <><Mail className="w-4 h-4 mr-2" /> Enviar Emails {selectedMembers.length > 0 ? `(${selectedMembers.length})` : "a todos"}</>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de socios externos */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-blue-600" />
              Socios Externos ({filteredMembers.length})
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nombre, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Pagado">Pagados</SelectItem>
                  <SelectItem value="En revisión">En revisión</SelectItem>
                  <SelectItem value="Pendiente">Pendientes</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={exportExternalMembers} variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredMembers.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <UserCheck className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">No hay socios externos</p>
              <p className="text-sm">Los socios sin hijos en el club aparecerán aquí</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <input 
                        type="checkbox" 
                        checked={selectedMembers.length === filteredMembers.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded"
                      />
                    </TableHead>
                    <TableHead>Socio</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead>Referido Por</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
                    <TableRow key={member.id} className={selectedMembers.includes(member.id) ? "bg-orange-50" : ""}>
                      <TableCell>
                        <input 
                          type="checkbox" 
                          checked={selectedMembers.includes(member.id)}
                          onChange={() => toggleSelect(member.id)}
                          className="w-4 h-4 rounded"
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-slate-900">{member.nombre_completo}</p>
                          <p className="text-xs text-slate-500">DNI: {member.dni} · {member.municipio}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{member.email || <span className="text-slate-400">Sin email</span>}</p>
                          <p className="text-slate-500">{member.telefono || <span className="text-slate-400">Sin teléfono</span>}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={
                          member.estado_pago === "Pagado" ? "bg-green-600" :
                          member.estado_pago === "En revisión" ? "bg-yellow-600" : "bg-red-600"
                        }>
                          {member.estado_pago === "Pagado" ? "✅" : member.estado_pago === "En revisión" ? "⏳" : "⚠️"} {member.estado_pago}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {member.referido_por ? (
                          <Badge variant="outline" className="text-purple-700 border-purple-300">
                            <Gift className="w-3 h-3 mr-1" />
                            {member.referido_por}
                          </Badge>
                        ) : (
                          <span className="text-slate-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          {/* Email */}
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => sendEmailToMember(member)}
                            disabled={!member.email || sendingEmail === member.id}
                            className="gap-1"
                            title="Enviar email"
                          >
                            {sendingEmail === member.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Mail className="w-4 h-4" />
                            )}
                          </Button>
                          {/* WhatsApp */}
                          {member.telefono && (
                            <a 
                              href={generateWhatsAppRenewalLink(member)} 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              <Button size="sm" className="bg-green-600 hover:bg-green-700 gap-1" title="WhatsApp">
                                <MessageCircle className="w-4 h-4" />
                              </Button>
                            </a>
                          )}
                          {/* Copiar enlace */}
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => copyRenewalLink(member)}
                            title="Copiar enlace"
                          >
                            {copiedId === member.id ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ReferralManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showRaffleDialog, setShowRaffleDialog] = useState(false);
  const [showAddReferralDialog, setShowAddReferralDialog] = useState(false);
  const [selectedPrize, setSelectedPrize] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [winner, setWinner] = useState(null);
  const [activeTab, setActiveTab] = useState("ranking");
  const [newReferral, setNewReferral] = useState({ referrer_email: "", referred_name: "" });
  const [externalSearchTerm, setExternalSearchTerm] = useState("");
  const [externalFilter, setExternalFilter] = useState("all");
  const [copiedId, setCopiedId] = useState(null);
  const queryClient = useQueryClient();

  // Fetch data
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: referralRewards = [], isLoading: loadingRewards } = useQuery({
    queryKey: ['referralRewards'],
    queryFn: () => base44.entities.ReferralReward.list(),
  });

  const { data: seasonConfig } = useQuery({
    queryKey: ['seasonConfig'],
    queryFn: async () => {
      const configs = await base44.entities.SeasonConfig.list();
      return configs.find(c => c.activa === true);
    },
  });

  const { data: raffleDraws = [] } = useQuery({
    queryKey: ['raffleDraws'],
    queryFn: () => base44.entities.RaffleDraw.list(),
  });

  const { data: clubMembers = [] } = useQuery({
    queryKey: ['clubMembers'],
    queryFn: () => base44.entities.ClubMember.list(),
  });

  const { data: players = [] } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
  });

  // Mutation para crear sorteo
  const createDrawMutation = useMutation({
    mutationFn: (data) => base44.entities.RaffleDraw.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raffleDraws'] });
      toast.success("🎉 ¡Sorteo registrado!");
    }
  });

  // Mutation para marcar premio como entregado
  const markDeliveredMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RaffleDraw.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raffleDraws'] });
      toast.success("Premio marcado como entregado");
    }
  });

  // Mutation para añadir referido manualmente
  const addReferralMutation = useMutation({
    mutationFn: async ({ referrerEmail, referredName }) => {
      const referrer = users.find(u => u.email === referrerEmail);
      if (!referrer) throw new Error("Usuario no encontrado");

      // Crear registro de referido
      await base44.entities.ReferralReward.create({
        referrer_email: referrer.email,
        referrer_name: referrer.full_name,
        referred_member_id: `manual_${Date.now()}`,
        referred_member_name: referredName,
        temporada: seasonConfig?.temporada,
        clothing_credit_earned: seasonConfig?.referidos_premio_1 || 5
      });

      // Calcular nuevos valores
      const newCount = (referrer.referrals_count || 0) + 1;
      let newCredit = (referrer.clothing_credit_balance || 0) + (seasonConfig?.referidos_premio_1 || 5);
      let newRaffles = referrer.raffle_entries_total || 0;

      // Bonificaciones por niveles
      if (newCount === 3) {
        newCredit += (seasonConfig?.referidos_premio_3 || 15) - (seasonConfig?.referidos_premio_1 || 5);
        newRaffles += seasonConfig?.referidos_sorteo_3 || 1;
      } else if (newCount === 5) {
        newCredit += (seasonConfig?.referidos_premio_5 || 25) - (seasonConfig?.referidos_premio_3 || 15);
        newRaffles += (seasonConfig?.referidos_sorteo_5 || 3) - (seasonConfig?.referidos_sorteo_3 || 1);
      } else if (newCount === 10) {
        newCredit += (seasonConfig?.referidos_premio_10 || 50) - (seasonConfig?.referidos_premio_5 || 25);
        newRaffles += (seasonConfig?.referidos_sorteo_10 || 5) - (seasonConfig?.referidos_sorteo_5 || 3);
      } else if (newCount === 15) {
        newCredit += (seasonConfig?.referidos_premio_15 || 50) - (seasonConfig?.referidos_premio_10 || 50);
        newRaffles += (seasonConfig?.referidos_sorteo_15 || 10) - (seasonConfig?.referidos_sorteo_10 || 5);
      }

      // Actualizar usuario
      await base44.entities.User.update(referrer.id, {
        referrals_count: newCount,
        clothing_credit_balance: newCredit,
        raffle_entries_total: newRaffles
      });

      return { referrer, newCount };
    },
    onSuccess: ({ referrer, newCount }) => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      queryClient.invalidateQueries({ queryKey: ['referralRewards'] });
      toast.success(`🎉 ¡Referido añadido! ${referrer.full_name} ahora tiene ${newCount} referidos`);
      setShowAddReferralDialog(false);
      setNewReferral({ referrer_email: "", referred_name: "" });
    },
    onError: (error) => {
      toast.error("Error: " + error.message);
    }
  });

  // Usuarios con referidos
  const usersWithReferrals = users
    .filter(u => (u.referrals_count || 0) > 0)
    .sort((a, b) => (b.referrals_count || 0) - (a.referrals_count || 0));

  // Filtrar por búsqueda
  const filteredUsers = usersWithReferrals.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Estadísticas generales
  const totalReferrals = usersWithReferrals.reduce((sum, u) => sum + (u.referrals_count || 0), 0);
  const totalCredit = usersWithReferrals.reduce((sum, u) => sum + (u.clothing_credit_balance || 0), 0);
  const totalRaffleEntries = usersWithReferrals.reduce((sum, u) => sum + (u.raffle_entries_total || 0), 0);
  const diamondUsers = usersWithReferrals.filter(u => (u.referrals_count || 0) >= 15).length;

  // Referidos de un usuario específico
  const getUserReferrals = (email) => {
    return referralRewards.filter(r => r.referrer_email === email);
  };

  // Usuarios elegibles para sorteo (con participaciones)
  const eligibleUsers = usersWithReferrals.filter(u => (u.raffle_entries_total || 0) > 0);

  // Función para hacer el sorteo
  const performDraw = async (prize) => {
    if (eligibleUsers.length === 0) {
      toast.error("No hay participantes con papeletas para el sorteo");
      return;
    }

    setSelectedPrize(prize);
    setShowRaffleDialog(true);
    setIsDrawing(true);
    setWinner(null);

    // Crear pool de participaciones
    const pool = [];
    eligibleUsers.forEach(user => {
      const entries = user.raffle_entries_total || 0;
      for (let i = 0; i < entries; i++) {
        pool.push(user);
      }
    });

    // Animación de sorteo
    let iterations = 0;
    const maxIterations = 20;
    const interval = setInterval(() => {
      const randomUser = pool[Math.floor(Math.random() * pool.length)];
      setWinner(randomUser);
      iterations++;

      if (iterations >= maxIterations) {
        clearInterval(interval);
        // Seleccionar ganador final
        const finalWinner = pool[Math.floor(Math.random() * pool.length)];
        setWinner(finalWinner);
        setIsDrawing(false);

        // Guardar el sorteo
        createDrawMutation.mutate({
          temporada: seasonConfig?.temporada,
          premio_nombre: prize.nombre,
          premio_emoji: prize.emoji,
          premio_descripcion: prize.descripcion,
          ganador_email: finalWinner.email,
          ganador_nombre: finalWinner.full_name,
          participaciones_ganador: finalWinner.raffle_entries_total || 0,
          total_participaciones: pool.length,
          fecha_sorteo: new Date().toISOString()
        });
      }
    }, 100);
  };

  // Sorteos de la temporada actual
  const currentSeasonDraws = raffleDraws.filter(d => d.temporada === seasonConfig?.temporada);

  // Exportar datos
  const exportData = () => {
    const data = filteredUsers.map(u => ({
      nombre: u.full_name,
      email: u.email,
      referidos: u.referrals_count || 0,
      credito_ropa: u.clothing_credit_balance || 0,
      participaciones_sorteo: u.raffle_entries_total || 0,
      nivel: getTierForCount(u.referrals_count || 0)?.label || "Sin nivel"
    }));

    const csv = [
      ["Nombre", "Email", "Referidos", "Crédito Ropa (€)", "Participaciones Sorteo", "Nivel"],
      ...data.map(d => [d.nombre, d.email, d.referidos, d.credito_ropa, d.participaciones_sorteo, d.nivel])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `referidos_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loadingUsers || loadingRewards) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 flex items-center gap-2">
                <Gift className="w-8 h-8 text-purple-600" />
                Trae un Socio Amigo
              </h1>
              <p className="text-slate-600">Controla premios y participaciones del programa de incentivos</p>
            </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddReferralDialog(true)} className="bg-purple-600 hover:bg-purple-700 gap-2">
            <UserPlus className="w-4 h-4" />
            Añadir Socio Amigo
          </Button>
          <Button onClick={exportData} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Explicación del programa */}
      <Card className="bg-gradient-to-r from-purple-50 via-pink-50 to-orange-50 border-2 border-purple-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
              <HelpCircle className="w-6 h-6 text-purple-600" />
            </div>
            <div className="space-y-3">
              <h3 className="font-bold text-purple-900 text-lg">¿Cómo funciona "Trae un Socio Amigo"?</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <p className="flex items-start gap-2 text-slate-700">
                    <span className="text-lg">1️⃣</span>
                    <span>Un socio <strong>invita a un amigo o familiar</strong> a hacerse socio del club</span>
                  </p>
                  <p className="flex items-start gap-2 text-slate-700">
                    <span className="text-lg">2️⃣</span>
                    <span>Al registrarse en <strong>"Hacerse Socio"</strong>, el nuevo socio indica el nombre de quien le invitó</span>
                  </p>
                  <p className="flex items-start gap-2 text-slate-700">
                    <span className="text-lg">3️⃣</span>
                    <span>El sistema <strong>suma automáticamente</strong> crédito en ropa y participaciones en sorteos</span>
                  </p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-purple-200">
                  <p className="font-semibold text-purple-800 mb-2">📊 Premios por amigos:</p>
                    <div className="space-y-1 text-xs">
                      <p>🎁 <strong>1 amigo:</strong> 5€ en ropa</p>
                      <p>⭐ <strong>3 amigos:</strong> 15€ + 1 participación sorteo</p>
                      <p>🏆 <strong>5 amigos:</strong> 25€ + 3 participaciones</p>
                      <p>👑 <strong>10 amigos:</strong> 50€ + 5 participaciones</p>
                      <p>🏨 <strong>15 amigos:</strong> 50€ + 10 participaciones + HOTEL</p>
                    </div>
                </div>
              </div>
              <Alert className="bg-blue-50 border-blue-200">
                <Info className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-sm">
                  <strong>¿Dónde lo ve el usuario?</strong> En su panel de "Hacerse Socio" aparece una tarjeta con su progreso, crédito acumulado y participaciones en sorteos.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ranking" className="gap-2">
            <Trophy className="w-4 h-4" />
            Ranking
          </TabsTrigger>
          <TabsTrigger value="externos" className="gap-2">
            <UserCheck className="w-4 h-4" />
            Socios Externos
          </TabsTrigger>
          <TabsTrigger value="sorteo" className="gap-2">
            <Dices className="w-4 h-4" />
            Sorteo
          </TabsTrigger>
          <TabsTrigger value="historial" className="gap-2">
            <History className="w-4 h-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ranking" className="space-y-6 mt-6">

      {/* Estadísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-4 text-center">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-80" />
            <p className="text-3xl font-bold">{usersWithReferrals.length}</p>
            <p className="text-sm opacity-80">Participantes</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4 text-center">
            <Trophy className="w-8 h-8 mx-auto mb-2 opacity-80" />
            <p className="text-3xl font-bold">{totalReferrals}</p>
            <p className="text-sm opacity-80">Total Referidos</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-4 text-center">
            <Shirt className="w-8 h-8 mx-auto mb-2 opacity-80" />
            <p className="text-3xl font-bold">{totalCredit}€</p>
            <p className="text-sm opacity-80">Crédito Total</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-4 text-center">
            <Ticket className="w-8 h-8 mx-auto mb-2 opacity-80" />
            <p className="text-3xl font-bold">{totalRaffleEntries}</p>
            <p className="text-sm opacity-80">Participaciones</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white">
          <CardContent className="p-4 text-center">
            <Hotel className="w-8 h-8 mx-auto mb-2 opacity-80" />
            <p className="text-3xl font-bold">{diamondUsers}</p>
            <p className="text-sm opacity-80">Nivel Diamante</p>
          </CardContent>
        </Card>
      </div>

      {/* Ranking / Lista de participantes */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-500" />
                Ranking de Socios Amigos
              </CardTitle>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Gift className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">No hay participantes en el programa</p>
              <p className="text-sm">Los usuarios aparecerán aquí cuando traigan nuevos socios amigos</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead className="text-center">Amigos</TableHead>
                    <TableHead className="text-center">Nivel</TableHead>
                    <TableHead className="text-center">Crédito Ropa</TableHead>
                    <TableHead className="text-center">Sorteos</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user, index) => {
                    const tier = getTierForCount(user.referrals_count || 0);
                    const isTop3 = index < 3;
                    
                    return (
                      <TableRow key={user.id} className={isTop3 ? "bg-yellow-50" : ""}>
                        <TableCell>
                          {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-semibold text-slate-900">{user.full_name}</p>
                            <p className="text-xs text-slate-500">{user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-purple-600 text-lg px-3">
                            {user.referrals_count || 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {tier && (
                            <Badge className={`${tier.color} text-white`}>
                              {tier.emoji} {tier.label}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-semibold text-green-600">
                            {user.clothing_credit_balance || 0}€
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-semibold text-orange-600">
                            {user.raffle_entries_total || 0}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDetailsDialog(true);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

        </TabsContent>

        {/* TAB SOCIOS EXTERNOS */}
        <TabsContent value="externos" className="space-y-6 mt-6">
          <ExternalMembersTab 
            clubMembers={clubMembers}
            players={players}
            seasonConfig={seasonConfig}
            searchTerm={externalSearchTerm}
            setSearchTerm={setExternalSearchTerm}
            filter={externalFilter}
            setFilter={setExternalFilter}
            copiedId={copiedId}
            setCopiedId={setCopiedId}
            queryClient={queryClient}
          />
        </TabsContent>

        {/* TAB SORTEO */}
        <TabsContent value="sorteo" className="space-y-6 mt-6">
          {/* Info de participantes */}
          <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-purple-900 text-lg">Participantes en el Sorteo</h3>
                  <p className="text-purple-700">
                    <strong>{eligibleUsers.length}</strong> usuarios con <strong>{totalRaffleEntries}</strong> papeletas totales
                  </p>
                </div>
                <Dices className="w-12 h-12 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          {/* Premios para sortear */}
          {seasonConfig?.sorteo_premios && seasonConfig.sorteo_premios.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                  Selecciona un Premio para Sortear
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {seasonConfig.sorteo_premios.map((prize, index) => {
                    const alreadyDrawn = currentSeasonDraws.some(d => d.premio_nombre === prize.nombre);
                    return (
                      <div 
                        key={index} 
                        className={`rounded-xl p-6 text-center border-2 transition-all ${
                          alreadyDrawn 
                            ? "bg-slate-100 border-slate-300 opacity-60" 
                            : "bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300 hover:border-yellow-500 hover:shadow-lg cursor-pointer"
                        }`}
                      >
                        <span className="text-5xl block mb-3">{prize.emoji}</span>
                        <p className="font-bold text-lg text-slate-900">{prize.nombre}</p>
                        <p className="text-sm text-slate-600 mb-4">{prize.descripcion}</p>
                        {alreadyDrawn ? (
                          <Badge className="bg-slate-500">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Ya sorteado
                          </Badge>
                        ) : (
                          <Button 
                            onClick={() => performDraw(prize)}
                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                          >
                            <Play className="w-4 h-4 mr-2" />
                            ¡Sortear!
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-slate-500">
                <Gift className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>No hay premios configurados</p>
                <p className="text-sm">Ve a Temporadas para añadir premios al sorteo</p>
              </CardContent>
            </Card>
          )}

          {/* Lista de participantes */}
          <Card>
            <CardHeader>
              <CardTitle>Participantes con Papeletas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {eligibleUsers.map((user, idx) => (
                  <div key={user.id} className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-slate-400">#{idx + 1}</span>
                      <div>
                        <p className="font-medium text-slate-900">{user.full_name}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                    </div>
                    <Badge className="bg-orange-500 text-lg px-3">
                      <Ticket className="w-4 h-4 mr-1" />
                      {user.raffle_entries_total || 0}
                    </Badge>
                  </div>
                ))}
                {eligibleUsers.length === 0 && (
                  <p className="text-center text-slate-500 py-8">No hay participantes con papeletas</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB HISTORIAL */}
        <TabsContent value="historial" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-slate-600" />
                Historial de Sorteos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {raffleDraws.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Dices className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>No hay sorteos realizados</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {raffleDraws.sort((a, b) => new Date(b.fecha_sorteo) - new Date(a.fecha_sorteo)).map((draw) => (
                    <div 
                      key={draw.id} 
                      className={`rounded-xl p-4 border-2 ${
                        draw.entregado 
                          ? "bg-green-50 border-green-200" 
                          : "bg-yellow-50 border-yellow-200"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <span className="text-4xl">{draw.premio_emoji}</span>
                          <div>
                            <p className="font-bold text-lg text-slate-900">{draw.premio_nombre}</p>
                            <p className="text-sm text-slate-600">{draw.premio_descripcion}</p>
                            <div className="mt-2">
                              <Badge className="bg-purple-600">
                                🏆 Ganador: {draw.ganador_nombre}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                              {new Date(draw.fecha_sorteo).toLocaleDateString('es-ES', { 
                                day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                              })}
                              {" • "}{draw.participaciones_ganador} de {draw.total_participaciones} papeletas
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {draw.entregado ? (
                            <Badge className="bg-green-600">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Entregado
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => markDeliveredMutation.mutate({
                                id: draw.id,
                                data: { entregado: true, fecha_entrega: new Date().toISOString() }
                              })}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Package className="w-4 h-4 mr-1" />
                              Marcar Entregado
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de sorteo */}
      <Dialog open={showRaffleDialog} onOpenChange={setShowRaffleDialog}>
        <DialogContent className="max-w-md text-center">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center justify-center gap-2">
              <Dices className={`w-6 h-6 text-purple-600 ${isDrawing ? 'animate-spin' : ''}`} />
              {isDrawing ? "¡Sorteando!" : "🎉 ¡Tenemos Ganador!"}
            </DialogTitle>
          </DialogHeader>
          
          {selectedPrize && (
            <div className="space-y-6 py-4">
              {/* Premio */}
              <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-2xl p-6 border-2 border-yellow-300">
                <span className="text-6xl block mb-2">{selectedPrize.emoji}</span>
                <p className="font-bold text-xl text-slate-900">{selectedPrize.nombre}</p>
                <p className="text-slate-600">{selectedPrize.descripcion}</p>
              </div>

              {/* Ganador */}
              {winner && (
                <div className={`bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-6 border-2 border-purple-300 ${isDrawing ? 'animate-pulse' : ''}`}>
                  <PartyPopper className="w-12 h-12 mx-auto mb-3 text-purple-600" />
                  <p className="text-2xl font-bold text-purple-900">{winner.full_name}</p>
                  <p className="text-purple-600">{winner.email}</p>
                  <Badge className="mt-2 bg-orange-500">
                    <Ticket className="w-3 h-3 mr-1" />
                    {winner.raffle_entries_total || 0} papeletas
                  </Badge>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowRaffleDialog(false);
                setWinner(null);
                setSelectedPrize(null);
              }}
              disabled={isDrawing}
            >
              {isDrawing ? "Sorteando..." : "Cerrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para añadir socio amigo manualmente */}
      <Dialog open={showAddReferralDialog} onOpenChange={setShowAddReferralDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-purple-600" />
              Añadir Socio Amigo Manualmente
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert className="bg-amber-50 border-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <AlertDescription className="text-amber-800 text-sm">
                Usa esto para añadir socios amigos que no se registraron indicando el nombre de quien les invitó, o para corregir errores.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>¿Quién le invitó? (el que gana el premio)</Label>
              <Select 
                value={newReferral.referrer_email} 
                onValueChange={(v) => setNewReferral(prev => ({ ...prev, referrer_email: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un usuario..." />
                </SelectTrigger>
                <SelectContent>
                  {users.filter(u => u.role !== 'admin').map(u => (
                    <SelectItem key={u.id} value={u.email}>
                      {u.full_name} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nombre del nuevo socio amigo</Label>
              <Input
                value={newReferral.referred_name}
                onChange={(e) => setNewReferral(prev => ({ ...prev, referred_name: e.target.value }))}
                placeholder="Ej: María García López"
              />
            </div>

            {newReferral.referrer_email && (
              <div className="bg-green-50 rounded-xl p-3 border border-green-200">
                <p className="text-sm text-green-800">
                  <strong>Premio que recibirá:</strong> +{seasonConfig?.referidos_premio_1 || 5}€ en crédito de ropa
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddReferralDialog(false)}>
              Cancelar
            </Button>
            <Button 
                onClick={() => addReferralMutation.mutate({
                  referrerEmail: newReferral.referrer_email,
                  referredName: newReferral.referred_name
                })}
                disabled={!newReferral.referrer_email || !newReferral.referred_name || addReferralMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {addReferralMutation.isPending ? "Añadiendo..." : "Añadir Socio Amigo"}
              </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de detalles */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PartyPopper className="w-5 h-5 text-purple-600" />
              Detalles de {selectedUser?.full_name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
              {/* Resumen */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-purple-50 rounded-xl p-4 text-center border-2 border-purple-200">
                  <Users className="w-6 h-6 mx-auto mb-1 text-purple-600" />
                  <p className="text-2xl font-bold text-purple-700">{selectedUser.referrals_count || 0}</p>
                  <p className="text-xs text-purple-600">Referidos</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 text-center border-2 border-green-200">
                  <Shirt className="w-6 h-6 mx-auto mb-1 text-green-600" />
                  <p className="text-2xl font-bold text-green-700">{selectedUser.clothing_credit_balance || 0}€</p>
                  <p className="text-xs text-green-600">Crédito Ropa</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-4 text-center border-2 border-orange-200">
                  <Ticket className="w-6 h-6 mx-auto mb-1 text-orange-600" />
                  <p className="text-2xl font-bold text-orange-700">{selectedUser.raffle_entries_total || 0}</p>
                  <p className="text-xs text-orange-600">Sorteos</p>
                </div>
              </div>

              {/* Niveles alcanzados */}
              <div>
                <h4 className="font-semibold mb-2">Niveles Alcanzados</h4>
                <div className="flex flex-wrap gap-2">
                  {TIER_CONFIG.map((tier) => {
                    const achieved = (selectedUser.referrals_count || 0) >= tier.count;
                    return (
                      <Badge
                        key={tier.count}
                        className={achieved ? `${tier.color} text-white` : "bg-slate-200 text-slate-500"}
                      >
                        {achieved ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                        {tier.emoji} {tier.count} - {tier.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Lista de referidos */}
              <div>
                <h4 className="font-semibold mb-2">Socios Referidos</h4>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {getUserReferrals(selectedUser.email).map((ref, idx) => (
                    <div key={ref.id} className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">#{idx + 1}</span>
                        <div>
                          <p className="font-medium text-slate-900">{ref.referred_member_name}</p>
                          <p className="text-xs text-slate-500">{ref.temporada}</p>
                        </div>
                      </div>
                      <div className="text-right text-xs">
                        <p className="text-green-600">+{ref.clothing_credit_earned || 0}€</p>
                        {ref.raffle_entries_earned > 0 && (
                          <p className="text-orange-600">+{ref.raffle_entries_earned} sorteo(s)</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {getUserReferrals(selectedUser.email).length === 0 && (
                    <p className="text-slate-500 text-center py-4">No hay registros detallados</p>
                  )}
                </div>
              </div>

              {/* Premio hotel si aplica */}
              {(selectedUser.referrals_count || 0) >= 15 && seasonConfig?.referidos_premio_hotel && (
                <div className="bg-gradient-to-r from-pink-100 to-purple-100 rounded-xl p-4 border-2 border-pink-300 text-center">
                  <Hotel className="w-10 h-10 mx-auto mb-2 text-pink-600" />
                  <p className="font-bold text-pink-800 text-lg">🏨 ¡PREMIO HOTEL DESBLOQUEADO!</p>
                  <p className="text-sm text-pink-700">Este usuario ha ganado una noche de hotel para dos</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
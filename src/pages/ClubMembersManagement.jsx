import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, CheckCircle2, Clock, AlertCircle, Mail, 
  TrendingUp, UserPlus, Heart, Eye, Loader2, Edit, Trash2,
  MessageCircle, RefreshCw, UserCheck, Send
} from "lucide-react";
import { toast } from "sonner";
import RenewalReminderDialog from "../components/members/RenewalReminderDialog";
import MemberEditForm from "../components/members/MemberEditForm";
import MemberDetailDialog from "../components/members/MemberDetailDialog";
import MemberAdvancedFilters from "../components/members/MemberAdvancedFilters";
import { sendMemberCard } from "../components/members/MemberCardEmail";

export default function ClubMembersManagement() {
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [seasonFilter, setSeasonFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [memberTypeFilter, setMemberTypeFilter] = useState("all"); // externos/padres
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [viewingMember, setViewingMember] = useState(null);
  const [sendingEmailTo, setSendingEmailTo] = useState(null);
  const [sendingBulkEmails, setSendingBulkEmails] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['allMembers'],
    queryFn: () => base44.entities.ClubMember.list('-created_date'),
  });

  const { data: players = [] } = useQuery({
    queryKey: ['allPlayers'],
    queryFn: () => base44.entities.Player.list(),
  });

  const { data: seasonConfig } = useQuery({
    queryKey: ['seasonConfig'],
    queryFn: async () => {
      const configs = await base44.entities.SeasonConfig.list();
      return configs.find(c => c.activa === true);
    },
  });

  // Emails de padres con jugadores
  const parentEmails = new Set();
  players.forEach(p => {
    if (p.email_padre) parentEmails.add(p.email_padre.toLowerCase());
    if (p.email_tutor_2) parentEmails.add(p.email_tutor_2.toLowerCase());
  });

  // Obtener temporadas únicas para el filtro
  const availableSeasons = [...new Set(members.map(m => m.temporada).filter(Boolean))].sort().reverse();

  // Establecer temporada actual como filtro por defecto
  useEffect(() => {
    if (seasonConfig?.temporada && seasonFilter === "all") {
      setSeasonFilter(seasonConfig.temporada);
    }
  }, [seasonConfig]);

  const updateMemberMutation = useMutation({
    mutationFn: async ({ id, data, memberEmail, memberName, sendEmail = false, member = null }) => {
      const result = await base44.entities.ClubMember.update(id, data);
      
      // Cuando el admin marca como PAGADO, enviar carnet virtual + email de confirmación
      if (sendEmail && data.estado_pago === "Pagado" && memberEmail && member) {
        try {
          // Enviar carnet virtual
          await sendMemberCard({ ...member, ...data }, seasonConfig, base44);
          
          // Marcar carnet como enviado
          await base44.entities.ClubMember.update(id, {
            carnet_enviado: true,
            fecha_carnet_enviado: new Date().toISOString()
          });
          
          toast.success("📧 Carnet virtual enviado al socio");
        } catch (error) {
          console.error("Error enviando carnet:", error);
          // Si falla el carnet, al menos enviar email simple
          try {
            await base44.integrations.Core.SendEmail({
              from_name: "CD Bustarviejo",
              to: memberEmail,
              subject: "🎉 ¡Confirmación de Pago - Ya eres Socio del CD Bustarviejo!",
              body: `Estimado/a ${memberName},

¡Gracias por tu apoyo al CD Bustarviejo! 

Hemos recibido y confirmado tu pago de la cuota de socio para la temporada ${seasonConfig?.temporada || "actual"}.

🎉 ¡YA ERES OFICIALMENTE SOCIO DEL CLUB!

Tu contribución es fundamental para el desarrollo de nuestros jóvenes deportistas.

Un cordial saludo,
CD Bustarviejo`
            });
          } catch (e) {
            console.error("Error enviando email simple:", e);
          }
        }
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allMembers'] });
      setEditingMember(null);
      toast.success("✅ Socio actualizado correctamente");
    },
    onError: (error) => {
      toast.error("Error: " + error.message);
    }
  });

  const deleteMemberMutation = useMutation({
    mutationFn: (id) => base44.entities.ClubMember.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allMembers'] });
      toast.success("Socio eliminado");
    }
  });

  const handleStatusChange = (member, newStatus) => {
    updateMemberMutation.mutate({
      id: member.id,
      data: {
        estado_pago: newStatus,
        ...(newStatus === "Pagado" ? { fecha_pago: new Date().toISOString().split('T')[0] } : {})
      },
      memberEmail: member.email,
      memberName: member.nombre_completo,
      sendEmail: newStatus === "Pagado",
      member: member // Pasar datos del socio para el carnet
    });
  };

  const handleSaveEdit = (formData) => {
    if (!editingMember) return;
    updateMemberMutation.mutate({
      id: editingMember.id,
      data: formData,
      memberEmail: formData.email,
      memberName: formData.nombre_completo,
      sendEmail: false
    });
  };

  const handleDelete = (member) => {
    if (confirm(`¿Seguro que quieres eliminar a ${member.nombre_completo}?`)) {
      deleteMemberMutation.mutate(member.id);
    }
  };

  const formatPhoneForWhatsApp = (phone) => {
    if (!phone) return null;
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 9) cleaned = '34' + cleaned;
    return cleaned;
  };

  // Generar enlace WhatsApp para renovación
  const generateWhatsAppLink = (member) => {
    const phone = formatPhoneForWhatsApp(member.telefono);
    if (!phone) return null;
    const message = `¡Hola ${member.nombre_completo}! 👋

Desde el CD Bustarviejo queremos darte las GRACIAS 💚

🎉 ¡Te invitamos a renovar tu carnet de socio para la temporada ${seasonConfig?.temporada}!

Por solo 25€/año seguirás apoyando a nuestros jóvenes deportistas.

¡Gracias por ser parte de nuestra familia! ⚽🏀

CD Bustarviejo`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  // Enviar email individual
  const sendEmailToMember = async (member) => {
    if (!member.email) {
      toast.error("Este socio no tiene email");
      return;
    }
    setSendingEmailTo(member.id);
    try {
      await base44.integrations.Core.SendEmail({
        from_name: "CD Bustarviejo",
        to: member.email,
        subject: `💚 ¡Renueva tu carnet de socio! - CD Bustarviejo`,
        body: `Estimado/a ${member.nombre_completo},

¡Te echamos de menos en el CD Bustarviejo! 💚

🎉 TE INVITAMOS A RENOVAR TU CARNET DE SOCIO para la temporada ${seasonConfig?.temporada}.

Por solo 25€ al año, seguirás apoyando a más de 200 jóvenes deportistas de Bustarviejo.

¡Gracias por ser parte de nuestra familia!

CD Bustarviejo
cdbustarviejo@gmail.com`
      });
      toast.success(`✅ Email enviado a ${member.nombre_completo}`);
    } catch (error) {
      toast.error("Error: " + error.message);
    } finally {
      setSendingEmailTo(null);
    }
  };

  // Enviar emails masivos a todos los filtrados
  const sendBulkEmails = async () => {
    const membersWithEmail = filteredMembers.filter(m => m.email);
    if (membersWithEmail.length === 0) {
      toast.error("No hay socios con email");
      return;
    }
    if (!confirm(`¿Enviar email de renovación a ${membersWithEmail.length} socios?`)) return;

    setSendingBulkEmails(true);
    let sent = 0, errors = 0;

    for (const member of membersWithEmail) {
      try {
        await base44.integrations.Core.SendEmail({
          from_name: "CD Bustarviejo",
          to: member.email,
          subject: `💚 ¡Renueva tu carnet de socio! - CD Bustarviejo`,
          body: `Estimado/a ${member.nombre_completo},

¡Te echamos de menos! 💚

🎉 TE INVITAMOS A RENOVAR TU CARNET DE SOCIO para la temporada ${seasonConfig?.temporada}.

Por solo 25€/año seguirás apoyando a nuestros jóvenes deportistas.

¡Gracias!
CD Bustarviejo`
        });
        sent++;
      } catch (e) { errors++; }
      await new Promise(r => setTimeout(r, 150));
    }

    setSendingBulkEmails(false);
    toast.success(`✅ ${sent} emails enviados${errors > 0 ? `, ${errors} errores` : ""}`);
  };

  const handleSendReminders = async (uniqueMembers, options) => {
    const { sendEmail, sendWhatsApp } = options;
    let emailsSent = 0;
    let whatsappOpened = 0;

    if (sendEmail) {
      for (const member of uniqueMembers) {
        if (!member.email) continue;
        try {
          await base44.integrations.Core.SendEmail({
            from_name: "CD Bustarviejo",
            to: member.email,
            subject: "💚 ¡Te echamos de menos! Renueva tu carnet de socio",
            body: `Estimado/a ${member.nombre_completo},

Queremos agradecerte tu apoyo como socio del CD Bustarviejo.

🎉 ¡TE INVITAMOS A RENOVAR TU CARNET DE SOCIO!

La nueva temporada ${seasonConfig?.temporada} ya está en marcha.

Por solo 25€ al año, seguirás apoyando a nuestros jóvenes deportistas.

Un cordial saludo,
CD Bustarviejo`
          });
          emailsSent++;
        } catch (error) {
          console.error(`Error enviando email a ${member.email}:`, error);
        }
      }
    }

    if (sendWhatsApp) {
      const membersWithPhone = uniqueMembers.filter(m => m.telefono?.length >= 9);
      for (const member of membersWithPhone) {
        const phone = formatPhoneForWhatsApp(member.telefono);
        if (!phone) continue;
        const message = encodeURIComponent(
`¡Hola ${member.nombre_completo}! 👋

Te escribimos desde el *CD Bustarviejo* 💚⚽

🎉 *¡Te invitamos a renovar tu carnet de socio!*

Por solo *25€/año* seguirás apoyando a nuestros jóvenes deportistas.

¡Gracias por formar parte de nuestra familia! 🙏`
        );
        window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
        whatsappOpened++;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return { emailsSent, whatsappOpened };
  };

  // Exportar a CSV
  const handleExport = () => {
    const dataToExport = filteredMembers;
    const headers = ["Nº Socio", "Nombre", "DNI", "Email", "Teléfono", "Dirección", "Municipio", "Tipo", "Estado", "Temporada", "Cuota", "Fecha Pago"];
    const rows = dataToExport.map(m => [
      m.numero_socio || "",
      m.nombre_completo,
      m.dni,
      m.email,
      m.telefono,
      m.direccion,
      m.municipio,
      m.tipo_inscripcion,
      m.estado_pago,
      m.temporada,
      m.cuota_socio || 25,
      m.fecha_pago || ""
    ]);

    const csvContent = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `socios_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  };

  // Determinar si un socio es externo (no tiene hijos en el club)
  const isExternalMember = (member) => {
    return !parentEmails.has(member.email?.toLowerCase());
  };

  // Filtrar miembros
  const filteredMembers = members.filter(m => {
    const matchesSearch = 
      m.nombre_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.dni?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.numero_socio?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || m.estado_pago === statusFilter;
    const matchesSeason = seasonFilter === "all" || m.temporada === seasonFilter;
    const matchesType = typeFilter === "all" || m.tipo_inscripcion === typeFilter;
    
    // Filtro externos/padres
    const isExternal = isExternalMember(m);
    const matchesMemberType = memberTypeFilter === "all" || 
      (memberTypeFilter === "externos" && isExternal) ||
      (memberTypeFilter === "padres" && !isExternal);
    
    return matchesSearch && matchesStatus && matchesSeason && matchesType && matchesMemberType;
  });

  // Contar filtros activos
  const activeFiltersCount = [
    searchTerm !== "",
    statusFilter !== "all",
    seasonFilter !== "all" && seasonFilter !== seasonConfig?.temporada,
    typeFilter !== "all",
    memberTypeFilter !== "all"
  ].filter(Boolean).length;

  // Stats de externos
  const currentSeasonExternos = members.filter(m => m.temporada === seasonConfig?.temporada && isExternalMember(m)).length;

  // Estadísticas de la temporada actual
  const currentSeasonMembers = members.filter(m => m.temporada === seasonConfig?.temporada);
  const stats = {
    total: currentSeasonMembers.length,
    pagados: currentSeasonMembers.filter(m => m.estado_pago === "Pagado").length,
    enRevision: currentSeasonMembers.filter(m => m.estado_pago === "En revisión").length,
    pendientes: currentSeasonMembers.filter(m => m.estado_pago === "Pendiente").length,
    nuevos: currentSeasonMembers.filter(m => m.tipo_inscripcion === "Nueva Inscripción").length,
    renovaciones: currentSeasonMembers.filter(m => m.tipo_inscripcion === "Renovación").length,
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Pagado":
        return <Badge className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Pagado</Badge>;
      case "En revisión":
        return <Badge className="bg-yellow-600"><Clock className="w-3 h-3 mr-1" /> En revisión</Badge>;
      default:
        return <Badge className="bg-red-600"><AlertCircle className="w-3 h-3 mr-1" /> Pendiente</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Diálogos */}
      <RenewalReminderDialog
        open={showReminderDialog}
        onClose={() => setShowReminderDialog(false)}
        members={members}
        seasonConfig={seasonConfig}
        onSendReminders={handleSendReminders}
      />
      
      <MemberEditForm
        member={editingMember}
        open={!!editingMember}
        onClose={() => setEditingMember(null)}
        onSave={handleSaveEdit}
        isLoading={updateMemberMutation.isPending}
      />

      <MemberDetailDialog
        member={viewingMember}
        open={!!viewingMember}
        onClose={() => setViewingMember(null)}
        onEdit={(m) => { setViewingMember(null); setEditingMember(m); }}
        referrals={members}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-8 h-8 text-orange-600" />
            Gestión de Socios
          </h1>
          <p className="text-slate-600 mt-1">Administra los socios del club · Temporada {seasonConfig?.temporada}</p>
        </div>
        <Button
          onClick={() => setShowReminderDialog(true)}
          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
        >
          <Mail className="w-4 h-4 mr-2" /> Enviar Recordatorios
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-4 text-center">
            <Users className="w-6 h-6 text-blue-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
            <p className="text-xs text-blue-600">Total Socios</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="pt-4 text-center">
            <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-green-700">{stats.pagados}</p>
            <p className="text-xs text-green-600">Pagados</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="pt-4 text-center">
            <Clock className="w-6 h-6 text-yellow-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-yellow-700">{stats.enRevision}</p>
            <p className="text-xs text-yellow-600">En Revisión</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="pt-4 text-center">
            <AlertCircle className="w-6 h-6 text-red-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-red-700">{stats.pendientes}</p>
            <p className="text-xs text-red-600">Pendientes</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="pt-4 text-center">
            <UserPlus className="w-6 h-6 text-purple-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-purple-700">{stats.nuevos}</p>
            <p className="text-xs text-purple-600">Nuevos</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="pt-4 text-center">
            <Heart className="w-6 h-6 text-orange-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-orange-700">{stats.renovaciones}</p>
            <p className="text-xs text-orange-600">Renovaciones</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros avanzados */}
      <MemberAdvancedFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        seasonFilter={seasonFilter}
        setSeasonFilter={setSeasonFilter}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        availableSeasons={availableSeasons}
        onExport={handleExport}
        activeFiltersCount={activeFiltersCount}
      />

      {/* Filtro Externos/Padres + Envío masivo */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={memberTypeFilter} onValueChange={setMemberTypeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Tipo de socio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">👥 Todos los socios</SelectItem>
              <SelectItem value="externos">🌍 Solo Externos ({currentSeasonExternos})</SelectItem>
              <SelectItem value="padres">👨‍👩‍👧 Solo Padres</SelectItem>
            </SelectContent>
          </Select>
          {memberTypeFilter === "externos" && (
            <Badge className="bg-blue-100 text-blue-800">
              <UserCheck className="w-3 h-3 mr-1" />
              Socios sin hijos en el club
            </Badge>
          )}
        </div>
        
        <Button
          onClick={sendBulkEmails}
          disabled={sendingBulkEmails || filteredMembers.filter(m => m.email).length === 0}
          className="bg-orange-600 hover:bg-orange-700"
        >
          {sendingBulkEmails ? (
            <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
          ) : (
            <><Send className="w-4 h-4 mr-2" /> Enviar Email a {filteredMembers.filter(m => m.email).length} socios</>
          )}
        </Button>
      </div>

      {/* Resultados */}
      <div className="text-sm text-slate-600">
        Mostrando {filteredMembers.length} de {members.length} socios
      </div>

      {/* Lista de socios */}
      <div className="space-y-3">
        {filteredMembers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No se encontraron socios con los filtros seleccionados</p>
          </div>
        ) : (
          filteredMembers.map(member => (
            <Card key={member.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 cursor-pointer" onClick={() => setViewingMember(member)}>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-slate-900">{member.nombre_completo}</h3>
                      <Badge variant="outline" className="text-xs">{member.numero_socio || "Sin nº"}</Badge>
                      {member.es_segundo_progenitor && (
                        <Badge variant="outline" className="text-xs bg-purple-50">2º Prog.</Badge>
                      )}
                      {member.es_socio_externo && (
                        <Badge variant="outline" className="text-xs bg-cyan-50">Externo</Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {member.tipo_inscripcion === "Nueva Inscripción" ? "🆕" : "🔄"} {member.temporada}
                      </Badge>
                      {member.referido_por && (
                        <Badge className="bg-orange-100 text-orange-800 text-xs">
                          Ref: {member.referido_por}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-slate-600 space-y-0.5">
                      <p>📧 {member.email} | 📱 {member.telefono}</p>
                      <p>🪪 {member.dni} | 📍 {member.municipio}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    {/* Botones de acción */}
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setViewingMember(member)} title="Ver detalle">
                        <Eye className="w-4 h-4 text-slate-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setEditingMember(member)} title="Editar">
                        <Edit className="w-4 h-4 text-blue-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(member)} title="Eliminar">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>

                    {/* Email individual */}
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => sendEmailToMember(member)}
                      disabled={!member.email || sendingEmailTo === member.id}
                      title="Enviar email"
                    >
                      {sendingEmailTo === member.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Mail className="w-4 h-4 text-orange-600" />
                      )}
                    </Button>

                    {/* WhatsApp */}
                    {member.telefono && generateWhatsAppLink(member) && (
                      <a href={generateWhatsAppLink(member)} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="icon" title="WhatsApp">
                          <MessageCircle className="w-4 h-4 text-green-600" />
                        </Button>
                      </a>
                    )}

                    {/* Ver justificante */}
                    {(member.justificante_url || member.justificante_base64) && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setViewingMember(member)}
                      >
                        <Eye className="w-4 h-4 mr-1" /> Justificante
                      </Button>
                    )}
                    
                    {/* Estado y cambio rápido */}
                    <div className="flex items-center gap-2">
                      {getStatusBadge(member.estado_pago)}
                      
                      {member.estado_pago !== "Pagado" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                          onClick={() => handleStatusChange(member, "Pagado")}
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Marcar Pagado
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
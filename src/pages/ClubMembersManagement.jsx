import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, Search, CheckCircle2, Clock, AlertCircle, Mail, 
  TrendingUp, UserPlus, Heart, Download, Eye, Loader2, MessageCircle 
} from "lucide-react";
import { toast } from "sonner";
import RenewalReminderDialog from "../components/members/RenewalReminderDialog";

export default function ClubMembersManagement() {
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sendingReminders, setSendingReminders] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
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

  const { data: seasonConfig } = useQuery({
    queryKey: ['seasonConfig'],
    queryFn: async () => {
      const configs = await base44.entities.SeasonConfig.list();
      return configs.find(c => c.activa === true);
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: async ({ id, data, memberEmail, memberName }) => {
      const result = await base44.entities.ClubMember.update(id, data);
      
      // Si se marca como Pagado, enviar email de confirmación
      if (data.estado_pago === "Pagado" && memberEmail) {
        try {
          await base44.integrations.Core.SendEmail({
            from_name: "CD Bustarviejo",
            to: memberEmail,
            subject: "🎉 ¡Confirmación de Pago - Ya eres Socio del CD Bustarviejo!",
            body: `
Estimado/a ${memberName},

¡Gracias por tu apoyo al CD Bustarviejo! 

Hemos recibido y confirmado tu pago de la cuota de socio para la temporada ${seasonConfig?.temporada || "actual"}.

🎉 ¡YA ERES OFICIALMENTE SOCIO DEL CLUB!

Tu contribución es fundamental para el desarrollo de nuestros jóvenes deportistas y el crecimiento de nuestra comunidad deportiva.

Gracias por formar parte de la familia del CD Bustarviejo.

Un cordial saludo,
CD Bustarviejo

---
Email: cdbustarviejo@gmail.com
            `
          });
        } catch (error) {
          console.error("Error enviando email de confirmación:", error);
        }
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allMembers'] });
      toast.success("✅ Estado actualizado correctamente");
    },
    onError: (error) => {
      toast.error("Error al actualizar: " + error.message);
    }
  });

  const handleStatusChange = (member, newStatus) => {
    const updateData = {
      estado_pago: newStatus,
      ...(newStatus === "Pagado" ? { fecha_pago: new Date().toISOString().split('T')[0] } : {})
    };
    
    updateMemberMutation.mutate({
      id: member.id,
      data: updateData,
      memberEmail: member.email,
      memberName: member.nombre_completo
    });
  };

  // Función para formatear teléfono para WhatsApp
  const formatPhoneForWhatsApp = (phone) => {
    if (!phone) return null;
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 9) {
      cleaned = '34' + cleaned;
    }
    return cleaned;
  };

  // Handler para enviar recordatorios con opciones
  const handleSendReminders = async (uniqueMembers, options) => {
    const { sendEmail, sendWhatsApp } = options;
    let emailsSent = 0;
    let whatsappOpened = 0;

    // Enviar emails
    if (sendEmail) {
      for (const member of uniqueMembers) {
        if (!member.email) continue;
        try {
          await base44.integrations.Core.SendEmail({
            from_name: "CD Bustarviejo",
            to: member.email,
            subject: "💚 ¡Te echamos de menos! Renueva tu carnet de socio",
            body: `
Estimado/a ${member.nombre_completo},

¡Esperamos que estés muy bien!

Queremos agradecerte tu apoyo como socio del CD Bustarviejo en temporadas anteriores. Tu contribución fue fundamental para el desarrollo de nuestros jóvenes deportistas.

🎉 ¡TE INVITAMOS A RENOVAR TU CARNET DE SOCIO!

La nueva temporada ${seasonConfig.temporada} ya está en marcha y nos encantaría seguir contando contigo como parte de nuestra gran familia deportiva.

Por solo 25€ al año, seguirás apoyando:
✅ El desarrollo deportivo de nuestros niños y jóvenes
✅ La mejora de instalaciones y equipamiento
✅ Las actividades y eventos del club
✅ El crecimiento de la comunidad deportiva de Bustarviejo

Para renovar, puedes hacerlo a través de la aplicación del club o contactarnos directamente.

¡Gracias por seguir creyendo en nuestro proyecto!

Un cordial saludo,
CD Bustarviejo

---
Email: cdbustarviejo@gmail.com
            `
          });
          emailsSent++;
        } catch (error) {
          console.error(`Error enviando email a ${member.email}:`, error);
        }
      }
    }

    // Abrir WhatsApp para cada miembro con teléfono
    if (sendWhatsApp) {
      const membersWithPhone = uniqueMembers.filter(m => m.telefono && m.telefono.length >= 9);
      
      for (const member of membersWithPhone) {
        const phone = formatPhoneForWhatsApp(member.telefono);
        if (!phone) continue;

        const message = encodeURIComponent(
`¡Hola ${member.nombre_completo}! 👋

Te escribimos desde el *CD Bustarviejo* 💚⚽

Queremos agradecerte tu apoyo como socio en temporadas anteriores. ¡Tu contribución fue muy valiosa!

🎉 *¡Te invitamos a renovar tu carnet de socio!*

La nueva temporada *${seasonConfig?.temporada}* ya está en marcha y nos encantaría seguir contando contigo.

Por solo *25€/año* seguirás apoyando a nuestros jóvenes deportistas.

Para renovar, accede a la app del club o contáctanos.

¡Gracias por formar parte de nuestra familia! 🙏

_CD Bustarviejo_
📧 cdbustarviejo@gmail.com`
        );

        // Abrir WhatsApp Web en una nueva pestaña
        window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
        whatsappOpened++;

        // Pequeña pausa entre aperturas para no saturar
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return { emailsSent, whatsappOpened };
  };

  // Filtrar miembros
  const filteredMembers = members.filter(m => {
    const matchesSearch = 
      m.nombre_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.dni?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || m.estado_pago === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Estadísticas
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
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-8 h-8 text-orange-600" />
            Gestión de Socios
          </h1>
          <p className="text-slate-600 mt-1">Administra los socios del club</p>
        </div>
        <Button
          onClick={sendRenewalReminders}
          disabled={sendingReminders}
          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
        >
          {sendingReminders ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Enviando...</>
          ) : (
            <><Mail className="w-4 h-4 mr-2" /> Enviar Recordatorios de Renovación</>
          )}
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

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por nombre, email o DNI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Estado de pago" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="Pagado">Pagado</SelectItem>
            <SelectItem value="En revisión">En revisión</SelectItem>
            <SelectItem value="Pendiente">Pendiente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de socios */}
      <Tabs defaultValue="current" className="space-y-4">
        <TabsList>
          <TabsTrigger value="current">Temporada Actual ({currentSeasonMembers.length})</TabsTrigger>
          <TabsTrigger value="all">Histórico ({members.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-3">
          {filteredMembers.filter(m => m.temporada === seasonConfig?.temporada).length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No se encontraron socios</p>
            </div>
          ) : (
            filteredMembers
              .filter(m => m.temporada === seasonConfig?.temporada)
              .map(member => (
                <Card key={member.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900">{member.nombre_completo}</h3>
                          {member.es_segundo_progenitor && (
                            <Badge variant="outline" className="text-xs">2º Progenitor</Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {member.tipo_inscripcion === "Nueva Inscripción" ? "🆕 Nuevo" : "🔄 Renovación"}
                          </Badge>
                        </div>
                        <div className="text-sm text-slate-600 space-y-0.5">
                          <p>📧 {member.email}</p>
                          <p>📱 {member.telefono} | 🪪 {member.dni}</p>
                          <p>📍 {member.direccion}, {member.municipio}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        {member.justificante_url && (
                          <a href={member.justificante_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-1" /> Ver Justificante
                            </Button>
                          </a>
                        )}
                        
                        <div className="flex items-center gap-2">
                          {getStatusBadge(member.estado_pago)}
                          
                          {member.estado_pago !== "Pagado" && (
                            <Select
                              value={member.estado_pago}
                              onValueChange={(value) => handleStatusChange(member, value)}
                            >
                              <SelectTrigger className="w-36">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Pendiente">Pendiente</SelectItem>
                                <SelectItem value="En revisión">En revisión</SelectItem>
                                <SelectItem value="Pagado">✅ Marcar Pagado</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-3">
          {filteredMembers.map(member => (
            <Card key={member.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900">{member.nombre_completo}</h3>
                      <Badge variant="outline">{member.temporada}</Badge>
                    </div>
                    <p className="text-sm text-slate-600">📧 {member.email} | 📱 {member.telefono}</p>
                  </div>
                  {getStatusBadge(member.estado_pago)}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
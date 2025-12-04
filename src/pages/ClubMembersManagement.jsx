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
  MessageCircle, RefreshCw, UserCheck, Send, Bell, Upload, FileSpreadsheet
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importData, setImportData] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importPreview, setImportPreview] = useState([]);
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
      console.log('[ClubMembersManagement] updateMemberMutation llamado:', { id, sendEmail, memberEmail, estadoPago: data.estado_pago });
      
      const result = await base44.entities.ClubMember.update(id, data);
      
      // Cuando el admin marca como PAGADO, enviar carnet virtual + email de confirmación
      if (sendEmail && data.estado_pago === "Pagado" && memberEmail && member) {
        console.log('[ClubMembersManagement] Intentando enviar carnet a:', memberEmail);
        
        try {
          // Enviar carnet virtual
          const memberData = { ...member, ...data };
          console.log('[ClubMembersManagement] Datos del socio para carnet:', { 
            nombre: memberData.nombre_completo, 
            email: memberData.email,
            numero_socio: memberData.numero_socio 
          });
          
          await sendMemberCard(memberData, seasonConfig, base44);
          
          // Marcar carnet como enviado
          await base44.entities.ClubMember.update(id, {
            carnet_enviado: true,
            fecha_carnet_enviado: new Date().toISOString()
          });
          
          console.log('[ClubMembersManagement] ✅ Carnet enviado y marcado en BD');
          toast.success("📧 Carnet virtual enviado al socio");
        } catch (error) {
          console.error("[ClubMembersManagement] ❌ Error enviando carnet:", error);
          toast.error("Error al enviar carnet: " + (error.message || "Error desconocido"));
          
          // Si falla el carnet, al menos enviar email simple
          try {
            console.log('[ClubMembersManagement] Intentando email simple de fallback...');
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
            console.log('[ClubMembersManagement] ✅ Email simple de fallback enviado');
            toast.success("📧 Email de confirmación enviado");
          } catch (e) {
            console.error("[ClubMembersManagement] ❌ Error enviando email simple:", e);
            toast.error("No se pudo enviar el email de confirmación");
          }
        }
      } else {
        console.log('[ClubMembersManagement] No se envía email:', { sendEmail, estadoPago: data.estado_pago, tieneEmail: !!memberEmail, tieneMember: !!member });
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

  // Importar desde CSV
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          toast.error("El archivo está vacío o no tiene datos");
          return;
        }

        // Detectar separador (coma o punto y coma)
        const separator = lines[0].includes(';') ? ';' : ',';
        const headers = lines[0].split(separator).map(h => h.trim().toLowerCase().replace(/"/g, ''));
        
        // Mapear headers esperados
        const headerMap = {
          'nombre': ['nombre', 'nombre_completo', 'nombre completo', 'name'],
          'dni': ['dni', 'documento', 'nif'],
          'email': ['email', 'correo', 'e-mail', 'mail'],
          'telefono': ['telefono', 'teléfono', 'phone', 'movil', 'móvil'],
          'direccion': ['direccion', 'dirección', 'address', 'domicilio'],
          'municipio': ['municipio', 'ciudad', 'city', 'localidad', 'poblacion', 'población'],
          'cuota': ['cuota', 'importe', 'amount', 'precio']
        };

        const getColumnIndex = (field) => {
          const possibleNames = headerMap[field] || [field];
          return headers.findIndex(h => possibleNames.some(name => h.includes(name)));
        };

        const indices = {
          nombre: getColumnIndex('nombre'),
          dni: getColumnIndex('dni'),
          email: getColumnIndex('email'),
          telefono: getColumnIndex('telefono'),
          direccion: getColumnIndex('direccion'),
          municipio: getColumnIndex('municipio'),
          cuota: getColumnIndex('cuota')
        };

        if (indices.nombre === -1) {
          toast.error("No se encontró columna de nombre. Asegúrate de incluir una columna 'Nombre' o 'Nombre Completo'");
          return;
        }

        const parsedData = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(separator).map(v => v.trim().replace(/"/g, ''));
          if (!values[indices.nombre]) continue;

          parsedData.push({
            nombre_completo: values[indices.nombre] || '',
            dni: indices.dni >= 0 ? values[indices.dni] || '' : '',
            email: indices.email >= 0 ? values[indices.email] || '' : '',
            telefono: indices.telefono >= 0 ? values[indices.telefono] || '' : '',
            direccion: indices.direccion >= 0 ? values[indices.direccion] || '' : '',
            municipio: indices.municipio >= 0 ? values[indices.municipio] || 'Bustarviejo' : 'Bustarviejo',
            cuota_socio: indices.cuota >= 0 ? Number(values[indices.cuota]) || 25 : 25
          });
        }

        if (parsedData.length === 0) {
          toast.error("No se encontraron datos válidos en el archivo");
          return;
        }

        setImportPreview(parsedData);
        setShowImportDialog(true);
        toast.success(`${parsedData.length} registros encontrados`);
      } catch (error) {
        console.error("Error parsing CSV:", error);
        toast.error("Error al leer el archivo. Verifica el formato.");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const executeImport = async () => {
    if (importPreview.length === 0) return;
    
    setIsImporting(true);
    let imported = 0;
    let errors = 0;

    for (const record of importPreview) {
      try {
        // Generar número de socio automático
        const currentYear = new Date().getFullYear();
        const existingCount = members.length + imported + 1;
        const numeroSocio = `CDB-${currentYear}-${String(existingCount).padStart(4, '0')}`;

        await base44.entities.ClubMember.create({
          numero_socio: numeroSocio,
          nombre_completo: record.nombre_completo,
          dni: record.dni,
          email: record.email,
          telefono: record.telefono,
          direccion: record.direccion,
          municipio: record.municipio,
          cuota_socio: record.cuota_socio,
          tipo_inscripcion: "Nueva Inscripción",
          estado_pago: "Pendiente",
          temporada: seasonConfig?.temporada || `${currentYear}/${currentYear + 1}`,
          activo: true
        });
        imported++;
      } catch (error) {
        console.error("Error importing:", record.nombre_completo, error);
        errors++;
      }
    }

    setIsImporting(false);
    setShowImportDialog(false);
    setImportPreview([]);
    queryClient.invalidateQueries({ queryKey: ['allMembers'] });
    
    toast.success(`✅ ${imported} socios importados${errors > 0 ? `, ${errors} errores` : ''}`);
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

  // Detectar nuevos socios recientes (últimos 7 días) para alertas
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentMembers = currentSeasonMembers.filter(m => {
    const createdDate = new Date(m.created_date);
    return createdDate >= sevenDaysAgo;
  });
  
  // Socios pendientes de revisar justificante (En revisión)
  const pendingReviewMembers = currentSeasonMembers.filter(m => 
    m.estado_pago === "En revisión" && (m.justificante_url || m.justificante_base64)
  );

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

      {/* Dialog de importación */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
              Importar Socios desde CSV
            </DialogTitle>
            <DialogDescription>
              Se encontraron {importPreview.length} registros. Revisa los datos antes de importar.
            </DialogDescription>
          </DialogHeader>

          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription className="text-blue-800 text-sm">
              <strong>Formato esperado:</strong> CSV con columnas: Nombre, DNI, Email, Teléfono, Dirección, Municipio, Cuota (opcional).
              El separador puede ser coma (,) o punto y coma (;).
            </AlertDescription>
          </Alert>

          <div className="mt-4 max-h-72 overflow-y-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="text-left p-2 border-b">#</th>
                  <th className="text-left p-2 border-b">Nombre</th>
                  <th className="text-left p-2 border-b">DNI</th>
                  <th className="text-left p-2 border-b">Email</th>
                  <th className="text-left p-2 border-b">Teléfono</th>
                  <th className="text-left p-2 border-b">Cuota</th>
                </tr>
              </thead>
              <tbody>
                {importPreview.slice(0, 50).map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="p-2 border-b text-slate-500">{i + 1}</td>
                    <td className="p-2 border-b font-medium">{row.nombre_completo}</td>
                    <td className="p-2 border-b">{row.dni || '-'}</td>
                    <td className="p-2 border-b text-blue-600">{row.email || '-'}</td>
                    <td className="p-2 border-b">{row.telefono || '-'}</td>
                    <td className="p-2 border-b">{row.cuota_socio}€</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {importPreview.length > 50 && (
              <p className="text-center text-slate-500 py-2">... y {importPreview.length - 50} más</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowImportDialog(false); setImportPreview([]); }}>
              Cancelar
            </Button>
            <Button 
              onClick={executeImport} 
              disabled={isImporting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isImporting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importando...</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" /> Importar {importPreview.length} socios</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-8 h-8 text-orange-600" />
            Gestión de Socios
          </h1>
          <p className="text-slate-600 mt-1">Administra los socios del club · Temporada {seasonConfig?.temporada}</p>
        </div>
        <div className="flex gap-2">
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button variant="outline" className="pointer-events-none">
              <Upload className="w-4 h-4 mr-2" /> Importar CSV
            </Button>
          </label>
          <Button
            onClick={() => setShowReminderDialog(true)}
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
          >
            <Mail className="w-4 h-4 mr-2" /> Enviar Recordatorios
          </Button>
        </div>
      </div>

      {/* Alertas de nuevos socios y pendientes de revisión */}
      {(recentMembers.length > 0 || pendingReviewMembers.length > 0) && (
        <div className="space-y-3">
          {pendingReviewMembers.length > 0 && (
            <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-400 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-yellow-500 flex items-center justify-center animate-pulse">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-yellow-900">🔔 {pendingReviewMembers.length} socios pendientes de revisión</h3>
                      <p className="text-sm text-yellow-800">Han subido justificante y esperan confirmación</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setStatusFilter("En revisión")}
                    className="bg-yellow-600 hover:bg-yellow-700"
                  >
                    <Eye className="w-4 h-4 mr-2" /> Ver pendientes
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {pendingReviewMembers.slice(0, 5).map(m => (
                    <Badge key={m.id} className="bg-yellow-100 text-yellow-800 cursor-pointer" onClick={() => setViewingMember(m)}>
                      {m.nombre_completo}
                    </Badge>
                  ))}
                  {pendingReviewMembers.length > 5 && (
                    <Badge className="bg-yellow-200 text-yellow-900">+{pendingReviewMembers.length - 5} más</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {recentMembers.length > 0 && (
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                      <UserPlus className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-green-900">🆕 {recentMembers.length} nuevos socios esta semana</h3>
                      <p className="text-sm text-green-800">Inscripciones de los últimos 7 días</p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {recentMembers.slice(0, 5).map(m => (
                    <Badge key={m.id} className="bg-green-100 text-green-800 cursor-pointer" onClick={() => setViewingMember(m)}>
                      {m.nombre_completo} ({m.estado_pago === "Pagado" ? "✅" : m.estado_pago === "En revisión" ? "🟡" : "🔴"})
                    </Badge>
                  ))}
                  {recentMembers.length > 5 && (
                    <Badge className="bg-green-200 text-green-900">+{recentMembers.length - 5} más</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

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
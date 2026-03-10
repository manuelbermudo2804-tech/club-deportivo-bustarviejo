import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, CheckCircle2, Clock, AlertCircle, Mail, CreditCard,
  TrendingUp, UserPlus, Heart, Eye, Loader2, Edit, Trash2,
  MessageCircle, RefreshCw, UserCheck, Send, Bell, Upload, FileSpreadsheet, BarChart3, Gift
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import RenewalReminderDialog from "../components/members/RenewalReminderDialog";
import MemberEditForm from "../components/members/MemberEditForm";
import MemberDetailDialog from "../components/members/MemberDetailDialog";
import MemberAdvancedFilters from "../components/members/MemberAdvancedFilters";
import MembershipStatsPanel from "../components/members/MembershipStatsPanel";

export default function ClubMembersManagement() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [seasonFilter, setSeasonFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [memberTypeFilter, setMemberTypeFilter] = useState("all"); // externos/padres
  const [originFilter, setOriginFilter] = useState("all"); // origen pago
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [viewingMember, setViewingMember] = useState(null);
  const [sendingEmailTo, setSendingEmailTo] = useState(null);
  const [sendingBulkEmails, setSendingBulkEmails] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importData, setImportData] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importPreview, setImportPreview] = useState([]);
  const [showManualImportForm, setShowManualImportForm] = useState(false);
  const [manualImportForm, setManualImportForm] = useState({
    nombre_completo: "",
    dni: "",
    email: "",
    telefono: "",
    direccion: "",
    municipio: "",
  });
  const [isManualImporting, setIsManualImporting] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      // Permitir acceso a admin Y tesoreros
      setIsAdmin(currentUser.role === "admin" || currentUser.es_tesorero === true);
    };
    fetchUser();
  }, []);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['allMembers'],
    queryFn: () => base44.entities.ClubMember.list('-created_date'),
    staleTime: 120000,
    refetchOnWindowFocus: false,
  });

  const { data: players = [] } = useQuery({
    queryKey: ['allPlayers'],
    queryFn: () => base44.entities.Player.list(),
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  const { data: seasonConfig } = useQuery({
    queryKey: ['seasonConfig'],
    queryFn: async () => {
      const configs = await base44.entities.SeasonConfig.list();
      return configs.find(c => c.activa === true);
    },
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  // Detectar socios que NO se renovaron (de temporada anterior sin registro en actual)
  const { data: noRenovados = [] } = useQuery({
    queryKey: ['noRenovados', seasonConfig?.temporada],
    queryFn: async () => {
      if (!seasonConfig?.temporada) return [];
      
      // Obtener temporada anterior
      const [yearStart] = seasonConfig.temporada.split('/').map(Number);
      const prevSeason = `${yearStart - 1}/${yearStart}`;
      
      // Socios de temporada anterior
      const prevSeasonMembers = members.filter(m => m.temporada === prevSeason);
      
      // Verificar cuáles NO aparecen en temporada actual
      const notRenewed = prevSeasonMembers.filter(prevMember => {
        const renewed = members.find(m => 
          m.temporada === seasonConfig.temporada &&
          (m.email?.toLowerCase() === prevMember.email?.toLowerCase() ||
           m.dni === prevMember.dni)
        );
        return !renewed;
      });
      
      return notRenewed;
    },
    enabled: !!seasonConfig?.temporada && members.length > 0,
  });

  // Emails de padres con jugadores
  const parentEmails = React.useMemo(() => {
    const emails = new Set();
    
    // Desde jugadores registrados
    players.forEach(p => {
      if (p.email_padre) emails.add(p.email_padre.toLowerCase().trim());
      if (p.email_tutor_2) emails.add(p.email_tutor_2.toLowerCase().trim());
    });
    
    // Desde ClubMember con jugadores asociados
    members.forEach(m => {
      if ((m.jugadores_hijos?.length > 0 || m.jugadores_relacionados?.length > 0) && m.email) {
        emails.add(m.email.toLowerCase().trim());
      }
    });
    
    console.log('[ClubMembersManagement] parentEmails construido:', Array.from(emails));
    return emails;
  }, [players, members]);

  // Normalizar temporadas y utilidades
  const normalizeSeasonKey = (s) => (s ? String(s).replace(/[^\d]/g, "") : "");
  const seasonMatches = (a, b) => {
    if (!a || !b) return false;
    return normalizeSeasonKey(a) === normalizeSeasonKey(b);
  };

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
      
      // Cuando el admin marca como PAGADO, enviar email de confirmación
      if (sendEmail && data.estado_pago === "Pagado" && memberEmail && member) {
        console.log('[ClubMembersManagement] Enviando confirmación de pago a:', memberEmail);
        
        try {
          const CLUB_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";
          
          await base44.functions.invoke('sendEmail', {
            to: memberEmail,
            subject: "🎉 ¡Ya eres Socio del CD Bustarviejo! - Tu Carnet Digital",
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <style>
                  body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f1f5f9; }
                  .container { max-width: 600px; margin: 0 auto; background: white; }
                  .header { background: linear-gradient(135deg, #ea580c, #22c55e); padding: 30px; text-align: center; }
                  .header h1 { color: white; margin: 0; font-size: 28px; }
                  .content { padding: 30px; }
                  .carnet { 
                    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
                    border-radius: 20px;
                    padding: 25px;
                    margin: 20px 0;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                    border: 3px solid #ea580c;
                  }
                  .carnet-header { 
                    display: flex; 
                    align-items: center; 
                    justify-content: space-between;
                    border-bottom: 2px solid #ea580c;
                    padding-bottom: 15px;
                    margin-bottom: 20px;
                  }
                  .carnet-logo { 
                    width: 80px; 
                    height: 80px; 
                    border-radius: 12px;
                    object-fit: cover;
                    border: 3px solid #ea580c;
                  }
                  .carnet-title { 
                    color: white; 
                    font-size: 20px; 
                    font-weight: bold;
                    text-align: center;
                    flex: 1;
                    margin: 0 15px;
                  }
                  .carnet-data { color: white; }
                  .carnet-data p { margin: 10px 0; font-size: 15px; }
                  .carnet-data strong { color: #fb923c; }
                  .carnet-footer { 
                    text-align: center; 
                    margin-top: 20px; 
                    padding-top: 15px;
                    border-top: 2px solid #ea580c;
                  }
                  .carnet-number { 
                    background: linear-gradient(135deg, #ea580c, #f97316);
                    color: white;
                    padding: 8px 20px;
                    border-radius: 10px;
                    font-weight: bold;
                    font-size: 18px;
                    display: inline-block;
                    margin: 10px 0;
                  }
                  .footer { background: #1e293b; color: white; padding: 20px; text-align: center; }
                  .footer a { color: #fb923c; text-decoration: none; }
                  .emoji { font-size: 40px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>🎉 ¡BIENVENIDO AL CLUB!</h1>
                  </div>
                  
                  <div class="content">
                    <p style="font-size: 18px; color: #334155;">Estimado/a <strong>${memberName}</strong>,</p>
                    
                    <p style="font-size: 16px; color: #64748b; line-height: 1.6;">
                      ¡Gracias por tu apoyo al CD Bustarviejo! Hemos confirmado tu pago y nos complace darte la bienvenida como <strong style="color: #ea580c;">socio oficial</strong> para la temporada <strong>${seasonConfig?.temporada || "actual"}</strong>.
                    </p>
                    
                    <div style="text-align: center; margin: 20px 0;">
                      <div class="emoji">⚽</div>
                    </div>

                    <div class="carnet">
                      <div class="carnet-header">
                        <img src="${CLUB_LOGO_URL}" alt="CD Bustarviejo" class="carnet-logo" />
                        <div class="carnet-title">
                          CARNET DE SOCIO<br/>
                          <span style="font-size: 16px; color: #22c55e;">CD BUSTARVIEJO</span>
                        </div>
                      </div>
                      
                      <div class="carnet-data">
                        <p><strong>NOMBRE:</strong> ${memberName}</p>
                        <p><strong>Nº SOCIO:</strong> ${member.numero_socio || 'En proceso'}</p>
                        <p><strong>TEMPORADA:</strong> ${seasonConfig?.temporada || new Date().getFullYear()}</p>
                        <p><strong>DNI:</strong> ${member.dni || 'N/A'}</p>
                      </div>
                      
                      <div class="carnet-footer">
                        <div class="carnet-number">
                          ✅ SOCIO VERIFICADO
                        </div>
                        <p style="color: #22c55e; font-size: 12px; margin-top: 10px;">
                          CUOTA PAGADA • ${CUOTA_SOCIO}€
                        </p>
                      </div>
                    </div>

                    <div style="background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 20px; border-radius: 15px; margin: 25px 0;">
                      <h3 style="margin: 0 0 10px 0; font-size: 18px;">💚 ¡Gracias por formar parte de nuestra familia!</h3>
                      <p style="margin: 5px 0; font-size: 14px;">Tu contribución es fundamental para el desarrollo de más de 200 jóvenes deportistas de Bustarviejo.</p>
                      <p style="margin: 5px 0; font-size: 14px;">Juntos hacemos grande al CD Bustarviejo ⚽🏀</p>
                    </div>

                    <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0;">
                      <p style="margin: 0; font-size: 14px; color: #166534;">
                        <strong>📲 Guarda este email</strong> como comprobante de tu membresía. Puedes presentarlo cuando lo necesites.
                      </p>
                    </div>

                    <p style="font-size: 14px; color: #64748b; margin-top: 20px;">
                      Atentamente,<br/>
                      <strong style="color: #ea580c;">CD Bustarviejo</strong><br/>
                      <span style="font-size: 12px;">Tu club de siempre 💚</span>
                    </p>
                  </div>
                  
                  <div class="footer">
                    <p style="margin: 5px 0; font-size: 14px;">📧 <a href="mailto:cdbustarviejo@gmail.com">cdbustarviejo@gmail.com</a></p>
                    <p style="margin: 5px 0; font-size: 14px;">📧 <a href="mailto:C.D.BUSTARVIEJO@HOTMAIL.ES">C.D.BUSTARVIEJO@HOTMAIL.ES</a></p>
                    <p style="margin-top: 15px; font-size: 12px; color: #94a3b8;">© ${new Date().getFullYear()} CD Bustarviejo - Todos los derechos reservados</p>
                  </div>
                </div>
              </body>
              </html>
            `
          });
          console.log('[ClubMembersManagement] ✅ Email de confirmación enviado');
          toast.success("📧 Email con carnet digital enviado al socio");
        } catch (error) {
          console.error("[ClubMembersManagement] ❌ Error enviando email:", error);
          toast.error("No se pudo enviar el email de confirmación");
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

  const handleStatusChange = async (member, newStatus) => {
    // Procesar programa de referidos cuando se marca como PAGADO
    if (newStatus === "Pagado" && member.referido_por_email && !member.referido_procesado) {
      try {
        console.log('[Referidos] Procesando referido:', member.nombre_completo);
        
        // Buscar jugadores relacionados al socio para detectar fútbol femenino
        const allPlayers = await base44.entities.Player.list();
        const relatedPlayers = allPlayers.filter(p => 
          p.email_padre === member.email || p.email_tutor_2 === member.email
        );
        const hasFemeninoPlayer = relatedPlayers.some(p => p.deporte === "Fútbol Femenino");
        
        // Calcular premios según tier actual del referidor
        const allMembers = await base44.entities.ClubMember.list();
        const referrerValidatedCount = allMembers.filter(m => 
          m.referido_por_email === member.referido_por_email &&
          m.estado_pago === "Pagado" &&
          m.referido_procesado === true
        ).length;
        
        const nextCount = referrerValidatedCount + 1;
        let creditToAdd = 0;
        let rafflesToAdd = 0;
        let rewardTier = '';
        
        // Aplicar premios según tier
        if (nextCount === 1 && seasonConfig?.tier_1_activo !== false) {
          creditToAdd = seasonConfig?.referidos_premio_1 || 5;
          rewardTier = 'tier_1';
        } else if (nextCount === 3 && seasonConfig?.tier_3_activo !== false) {
          creditToAdd = seasonConfig?.referidos_premio_3 || 15;
          rafflesToAdd = seasonConfig?.referidos_sorteo_3 || 1;
          rewardTier = 'tier_3';
        } else if (nextCount === 5 && seasonConfig?.tier_5_activo !== false) {
          creditToAdd = seasonConfig?.referidos_premio_5 || 25;
          rafflesToAdd = seasonConfig?.referidos_sorteo_5 || 3;
          rewardTier = 'tier_5';
        } else if (nextCount === 10 && seasonConfig?.tier_10_activo !== false) {
          creditToAdd = seasonConfig?.referidos_premio_10 || 50;
          rafflesToAdd = seasonConfig?.referidos_sorteo_10 || 5;
          rewardTier = 'tier_10';
        } else if (nextCount === 15 && seasonConfig?.tier_15_activo !== false) {
          creditToAdd = seasonConfig?.referidos_premio_15 || 50;
          rafflesToAdd = seasonConfig?.referidos_sorteo_15 || 10;
          rewardTier = 'tier_15';
        }
        
        // Bonus femenino
        if (hasFemeninoPlayer && seasonConfig?.bonus_femenino_activo) {
          creditToAdd += seasonConfig?.bonus_femenino_credito || 10;
          rafflesToAdd += seasonConfig?.bonus_femenino_sorteos || 2;
        }
        
        // Actualizar crédito y sorteos del referidor en User
        if (creditToAdd > 0 || rafflesToAdd > 0) {
          const allUsers = await base44.entities.User.list();
          const referrer = allUsers.find(u => u.email === member.referido_por_email);
          
          if (referrer) {
            const currentCredit = referrer.referral_clothing_credit || 0;
            const currentRaffles = referrer.referral_raffle_entries || 0;
            const currentCount = referrer.referral_validated_count || 0;
            const currentFemeninoCount = referrer.referral_femenino_count || 0;
            
            await base44.entities.User.update(referrer.id, {
              referral_clothing_credit: currentCredit + creditToAdd,
              referral_raffle_entries: currentRaffles + rafflesToAdd,
              referral_validated_count: currentCount + 1,
              ...(hasFemeninoPlayer ? { referral_femenino_count: currentFemeninoCount + 1 } : {})
            });
            
            console.log(`[Referidos] ✅ Premios otorgados a ${member.referido_por_email}: +${creditToAdd}€, +${rafflesToAdd} sorteos`);
          }
        }
        
        // Crear registro histórico
        const rewardData = {
          referrer_email: member.referido_por_email,
          referrer_name: member.referido_por,
          referred_member_id: member.id,
          referred_member_name: member.nombre_completo,
          temporada: member.temporada,
          clothing_credit_earned: creditToAdd,
          raffle_entries_earned: rafflesToAdd,
          is_femenino_bonus: hasFemeninoPlayer,
          reward_tier: rewardTier || 'none'
        };
        
        if (relatedPlayers.length > 0) {
          rewardData.referred_player_id = relatedPlayers[0].id;
          rewardData.referred_player_name = relatedPlayers[0].nombre;
          rewardData.referred_player_category = relatedPlayers[0].deporte;
        }
        
        await base44.entities.ReferralReward.create(rewardData);
        
        toast.success(`🎁 Premios de referido procesados correctamente`);
      } catch (error) {
        console.error('[Referidos] Error procesando:', error);
        toast.error('Error procesando programa de referidos');
      }
    }
    
    // Actualizar estado del socio
    updateMemberMutation.mutate({
      id: member.id,
      data: {
        estado_pago: newStatus,
        ...(newStatus === "Pagado" ? { 
          fecha_pago: new Date().toISOString().split('T')[0],
          referido_procesado: true // Marcar como procesado
        } : {})
      },
      memberEmail: member.email,
      memberName: member.nombre_completo,
      sendEmail: newStatus === "Pagado",
      member: member
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
      const response = await base44.functions.invoke('sendEmail', {
        to: member.email,
        subject: `💚 ¡Renueva tu carnet de socio! - CD Bustarviejo`,
        html: `Estimado/a ${member.nombre_completo},

¡Te echamos de menos en el CD Bustarviejo! 💚

🎉 TE INVITAMOS A RENOVAR TU CARNET DE SOCIO para la temporada ${seasonConfig?.temporada}.

Por solo 25€ al año, seguirás apoyando a más de 200 jóvenes deportistas de Bustarviejo.

¡Gracias por ser parte de nuestra familia!

CD Bustarviejo
cdbustarviejo@gmail.com`
      });
      
      console.log('[sendEmailToMember] Respuesta:', response);
      
      if (response.data?.error) {
        toast.error(`Error enviando email: ${response.data.error}`);
      } else {
        toast.success(`✅ Email enviado a ${member.nombre_completo}`);
      }
    } catch (error) {
      console.error('[sendEmailToMember] Error:', error);
      toast.error("Error enviando email: " + (error.response?.data?.error || error.message));
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
        const response = await base44.functions.invoke('sendEmail', {
          to: member.email,
          subject: `💚 ¡Renueva tu carnet de socio! - CD Bustarviejo`,
          html: `Estimado/a ${member.nombre_completo},

¡Te echamos de menos! 💚

🎉 TE INVITAMOS A RENOVAR TU CARNET DE SOCIO para la temporada ${seasonConfig?.temporada}.

Por solo 25€/año seguirás apoyando a nuestros jóvenes deportistas.

¡Gracias!
CD Bustarviejo`
        });
        
        if (response.data?.error) {
          console.error('[sendBulkEmails] Error enviando a:', member.email, response.data.error);
          errors++;
        } else {
          sent++;
        }
      } catch (e) { 
        console.error('[sendBulkEmails] Excepción:', e);
        errors++; 
      }
      await new Promise(r => setTimeout(r, 500));
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
          await base44.functions.invoke('sendEmail', {
            to: member.email,
            subject: "💚 ¡Te echamos de menos! Renueva tu carnet de socio",
            html: `Estimado/a ${member.nombre_completo},

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

  const handleManualImport = async (e) => {
    e.preventDefault();
    
    if (!manualImportForm.nombre_completo || !manualImportForm.dni || !manualImportForm.email) {
      toast.error("Por favor, rellena al menos: nombre, DNI y email");
      return;
    }

    setIsManualImporting(true);
    try {
      // Generar número de socio
      const currentYear = new Date().getFullYear();
      const allCurrentMembers = await base44.entities.ClubMember.list();
      const membersThisYear = allCurrentMembers.filter(m => m.numero_socio?.includes(`CDB-${currentYear}`));
      const nextNumber = membersThisYear.length + 1;
      const numeroSocio = `CDB-${currentYear}-${String(nextNumber).padStart(4, '0')}`;

      // Crear socio
      await base44.entities.ClubMember.create({
        numero_socio: numeroSocio,
        nombre_completo: manualImportForm.nombre_completo,
        dni: manualImportForm.dni,
        email: manualImportForm.email,
        telefono: manualImportForm.telefono || "",
        direccion: manualImportForm.direccion || "",
        municipio: manualImportForm.municipio || "Bustarviejo",
        cuota_socio: 25,
        tipo_inscripcion: "Nueva Inscripción",
        estado_pago: "Pendiente",
        temporada: seasonConfig?.temporada || `${currentYear}/${currentYear + 1}`,
        activo: true,
        es_socio_externo: true,
        metodo_pago: "Formulario Externo"
      });

      // Limpiar formulario
      setManualImportForm({
        nombre_completo: "",
        dni: "",
        email: "",
        telefono: "",
        direccion: "",
        municipio: "",
      });
      
      setShowManualImportForm(false);
      queryClient.invalidateQueries({ queryKey: ['allMembers'] });
      toast.success(`✅ ${manualImportForm.nombre_completo} importado correctamente`);
    } catch (error) {
      toast.error("Error al importar: " + error.message);
    } finally {
      setIsManualImporting(false);
    }
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
    const matchesSeason = seasonFilter === "all" || seasonMatches(m.temporada, seasonFilter);
    const matchesType = typeFilter === "all" || m.tipo_inscripcion === typeFilter;
    
    // Filtro externos/padres
    const emailToCheck = m.email?.toLowerCase().trim();
    const isPadre = emailToCheck && parentEmails.has(emailToCheck);
    const matchesMemberType = memberTypeFilter === "all" || 
      (memberTypeFilter === "externos" && !isPadre) ||
      (memberTypeFilter === "padres" && isPadre);

    // Filtro por origen de pago
    const emailToCheckOrigin = m.email?.toLowerCase()?.trim();
    const isPadreByEmail = emailToCheckOrigin && parentEmails.has(emailToCheckOrigin);
    const matchesOrigin = originFilter === "all" ||
      (originFilter === "stripe_suscripcion" && m.origen_pago === 'stripe_suscripcion') ||
      (originFilter === "stripe_unico" && m.origen_pago === 'stripe_unico') ||
      (originFilter === "transferencia" && m.origen_pago === 'transferencia') ||
      (originFilter === "socio_padre_auto" && (m.origen_pago === 'socio_padre_auto' || (m.es_socio_padre === true) || (!m.origen_pago && isPadreByEmail && m.estado_pago === 'Pagado'))) ||
      (originFilter === "app" && m.origen_pago === 'stripe_unico' && !m.es_socio_externo) ||
      (originFilter === "web" && m.es_socio_externo === true) ||
      (originFilter === "sin_origen" && !m.origen_pago && !isPadreByEmail);
    
    return matchesSearch && matchesStatus && matchesSeason && matchesType && matchesMemberType && matchesOrigin;
  });

  // Contar filtros activos
  const activeFiltersCount = [
    searchTerm !== "",
    statusFilter !== "all",
    seasonFilter !== "all" && seasonFilter !== seasonConfig?.temporada,
    typeFilter !== "all",
    memberTypeFilter !== "all",
    originFilter !== "all"
  ].filter(Boolean).length;

  // Stats de externos
  const currentSeasonExternos = members.filter(m => 
    m.temporada === seasonConfig?.temporada && 
    isExternalMember(m)
  ).length;

  // Estadísticas de la temporada actual - incluir TODOS los socios de la temporada
  const currentSeasonMembers = members.filter(m => {
    const targetSeason = seasonConfig?.temporada || availableSeasons[0];
    return seasonMatches(m.temporada, targetSeason);
  });
  
  const stats = {
    total: currentSeasonMembers.length,
    pagados: currentSeasonMembers.filter(m => m.estado_pago === "Pagado").length,
    enRevision: currentSeasonMembers.filter(m => m.estado_pago === "En revisión").length,
    pendientes: currentSeasonMembers.filter(m => m.estado_pago === "Pendiente").length,
    fallidos: currentSeasonMembers.filter(m => m.estado_pago === "Fallido").length,
    nuevos: currentSeasonMembers.filter(m => m.tipo_inscripcion === "Nueva Inscripción").length,
    renovaciones: currentSeasonMembers.filter(m => m.tipo_inscripcion === "Renovación").length,
    suscripciones: currentSeasonMembers.filter(m => m.renovacion_automatica === true).length,
    stripeUnico: currentSeasonMembers.filter(m => m.origen_pago === 'stripe_unico').length,
    transferencias: currentSeasonMembers.filter(m => m.origen_pago === 'transferencia').length,
    sociosPadre: currentSeasonMembers.filter(m => m.es_socio_padre === true).length,
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
      case "Fallido":
        return <Badge className="bg-red-600 animate-pulse"><AlertCircle className="w-3 h-3 mr-1" /> Fallido</Badge>;
      default:
        return <Badge className="bg-red-600"><AlertCircle className="w-3 h-3 mr-1" /> Pendiente</Badge>;
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-800 ml-2">
            No tienes permisos para acceder a esta sección.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

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

      {/* Dialog de importación manual */}
      <Dialog open={showManualImportForm} onOpenChange={setShowManualImportForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600" />
              Importar Socio Manualmente
            </DialogTitle>
            <DialogDescription>
              Introduce los datos del socio que recibiste por email del formulario
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleManualImport} className="space-y-4">
            {/* Obligatorios */}
            <div className="space-y-3 pb-4 border-b">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre y Apellidos *</Label>
                <input
                  id="nombre"
                  type="text"
                  value={manualImportForm.nombre_completo}
                  onChange={(e) => setManualImportForm({...manualImportForm, nombre_completo: e.target.value})}
                  placeholder="Juan García López"
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dni">DNI *</Label>
                <input
                  id="dni"
                  type="text"
                  value={manualImportForm.dni}
                  onChange={(e) => setManualImportForm({...manualImportForm, dni: e.target.value})}
                  placeholder="12345678A"
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico *</Label>
                <input
                  id="email"
                  type="email"
                  value={manualImportForm.email}
                  onChange={(e) => setManualImportForm({...manualImportForm, email: e.target.value})}
                  placeholder="correo@ejemplo.com"
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Opcionales */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <input
                  id="telefono"
                  type="text"
                  value={manualImportForm.telefono}
                  onChange={(e) => setManualImportForm({...manualImportForm, telefono: e.target.value})}
                  placeholder="600123456"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="direccion">Dirección</Label>
                <input
                  id="direccion"
                  type="text"
                  value={manualImportForm.direccion}
                  onChange={(e) => setManualImportForm({...manualImportForm, direccion: e.target.value})}
                  placeholder="Calle, número, piso..."
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="municipio">Municipio</Label>
                <input
                  id="municipio"
                  type="text"
                  value={manualImportForm.municipio}
                  onChange={(e) => setManualImportForm({...manualImportForm, municipio: e.target.value})}
                  placeholder="Bustarviejo"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-blue-800 text-sm">
                El estado se marcará como "Pendiente". El socio deberá completar el pago por Stripe.
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowManualImportForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isManualImporting} className="bg-blue-600 hover:bg-blue-700">
                {isManualImporting ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Importando...</>
                ) : (
                  <>✅ Importar Socio</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de importación CSV */}
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
        <div className="flex flex-wrap gap-2">
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
            onClick={() => setShowManualImportForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <UserPlus className="w-4 h-4 mr-2" /> Importar Manual
          </Button>
          <Button
            onClick={() => setShowReminderDialog(true)}
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
          >
            <Mail className="w-4 h-4 mr-2" /> Enviar Recordatorios
          </Button>
        </div>
      </div>

      {/* Tabs: Lista vs Estadísticas */}
      <Tabs defaultValue="lista" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 max-w-3xl">
          <TabsTrigger value="lista" className="flex items-center gap-2">
            <Users className="w-4 h-4" /> Lista de Socios
          </TabsTrigger>
          <TabsTrigger value="estadisticas" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Estadísticas
          </TabsTrigger>
          <TabsTrigger value="historico" className="flex items-center gap-2">
            <Clock className="w-4 h-4" /> Histórico
          </TabsTrigger>
          <TabsTrigger value="no-renovados" className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> No Renovados {noRenovados.length > 0 && `(${noRenovados.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="estadisticas">
          <MembershipStatsPanel members={members} seasonConfig={seasonConfig} />
        </TabsContent>

        <TabsContent value="lista" className="space-y-6">

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
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-4 text-center">
            <Users className="w-5 h-5 text-blue-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
            <p className="text-xs text-blue-600">Total</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="pt-4 text-center">
            <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-green-700">{stats.pagados}</p>
            <p className="text-xs text-green-600">Pagados</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="pt-4 text-center">
            <Clock className="w-5 h-5 text-yellow-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-yellow-700">{stats.enRevision}</p>
            <p className="text-xs text-yellow-600">Revisión</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="pt-4 text-center">
            <AlertCircle className="w-5 h-5 text-red-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-red-700">{stats.pendientes + stats.fallidos}</p>
            <p className="text-xs text-red-600">Pend/Fallido</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="pt-4 text-center">
            <RefreshCw className="w-5 h-5 text-purple-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-purple-700">{stats.suscripciones}</p>
            <p className="text-xs text-purple-600">Suscripc.</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-sky-50 to-sky-100 border-sky-200">
          <CardContent className="pt-4 text-center">
            <CreditCard className="w-5 h-5 text-sky-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-sky-700">{stats.stripeUnico}</p>
            <p className="text-xs text-sky-600">Stripe 1x</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="pt-4 text-center">
            <Heart className="w-5 h-5 text-orange-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-orange-700">{stats.transferencias}</p>
            <p className="text-xs text-orange-600">Transfer.</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="pt-4 text-center">
            <UserPlus className="w-5 h-5 text-amber-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-amber-700">{stats.sociosPadre}</p>
            <p className="text-xs text-amber-600">Padres auto</p>
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

      {/* Filtro Externos/Padres + Origen + Envío masivo */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
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
          <Select value={originFilter} onValueChange={setOriginFilter}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Origen del pago" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">🏷️ Todos los orígenes</SelectItem>
              <SelectItem value="stripe_suscripcion">🔄 Suscripción Stripe</SelectItem>
              <SelectItem value="stripe_unico">💳 Pago Único Stripe</SelectItem>
              <SelectItem value="transferencia">🏦 Transferencia</SelectItem>
              <SelectItem value="socio_padre_auto">👨‍👩‍👧 Padre Automático</SelectItem>
              <SelectItem value="web">🌐 Desde Web (Externo)</SelectItem>
              <SelectItem value="sin_origen">❓ Sin origen registrado</SelectItem>
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
                      {/* ORIGEN: Cómo llegó este socio */}
                      {member.origen_pago === 'stripe_suscripcion' && (
                        <Badge className="bg-purple-100 text-purple-700 text-xs border border-purple-200">
                          🔄 Suscripción
                        </Badge>
                      )}
                      {member.origen_pago === 'stripe_unico' && (
                        <Badge className="bg-blue-100 text-blue-700 text-xs border border-blue-200">
                          💳 Pago Único
                        </Badge>
                      )}
                      {member.origen_pago === 'transferencia' && (
                        <Badge className="bg-orange-100 text-orange-700 text-xs border border-orange-200">
                          🏦 Transfer.
                        </Badge>
                      )}
                      {member.origen_pago === 'socio_padre_auto' && (
                        <Badge className="bg-amber-100 text-amber-700 text-xs border border-amber-200">
                          👨‍👩‍👧 Padre Auto
                        </Badge>
                      )}
                      {!member.origen_pago && member.estado_pago === 'Pagado' && (
                        parentEmails.has(member.email?.toLowerCase()?.trim()) ? (
                          <Badge className="bg-amber-100 text-amber-700 text-xs border border-amber-200">
                            👨‍👩‍👧 Padre (Inscripción)
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-slate-50 text-slate-500">
                            ❓ Sin origen
                          </Badge>
                        )
                      )}
                      {/* CANAL: Desde dónde se registró */}
                      {member.es_socio_externo && (
                        <Badge variant="outline" className="text-xs bg-cyan-50 text-cyan-700 border-cyan-200">
                          🌐 Web
                        </Badge>
                      )}
                      {!member.es_socio_externo && !member.es_socio_padre && member.origen_pago && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                          📱 App
                        </Badge>
                      )}
                      {member.estado_pago === 'Fallido' && (
                        <Badge className="bg-red-100 text-red-700 text-xs border border-red-200 animate-pulse">
                          ⚠️ Cobro fallido
                        </Badge>
                      )}
                      {member.referido_por && (
                        <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs">
                          <Gift className="w-3 h-3 mr-1" /> Referido
                        </Badge>
                      )}
                      {member.es_segundo_progenitor && (
                        <Badge variant="outline" className="text-xs bg-purple-50">2º Prog.</Badge>
                      )}
                      {member.es_socio_padre && (
                        <Badge variant="outline" className="text-xs bg-amber-50">Padre auto</Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {member.tipo_inscripcion === "Nueva Inscripción" ? "🆕" : "🔄"} {member.temporada}
                      </Badge>
                      {member.fecha_vencimiento && (
                        <span className="text-xs text-slate-400">
                          Vence: {new Date(member.fecha_vencimiento).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </span>
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
        </TabsContent>

        <TabsContent value="historico" className="space-y-6">
          <Card className="bg-gradient-to-r from-slate-50 to-slate-100 border-2 border-slate-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-8 h-8 text-slate-600" />
                <div>
                  <h3 className="text-xl font-bold text-slate-900">📚 Socios Anteriores que NO Renovaron</h3>
                  <p className="text-sm text-slate-700">Socios de temporadas pasadas sin registro en {seasonConfig?.temporada}</p>
                </div>
              </div>
              
              {(() => {
                const historicMembers = members.filter(m => {
                  if (m.temporada === seasonConfig?.temporada) return false;
                  const hasRenewed = members.some(current => 
                    current.temporada === seasonConfig?.temporada &&
                    (current.email?.toLowerCase() === m.email?.toLowerCase() ||
                     current.dni === m.dni)
                  );
                  return !hasRenewed;
                });
                
                return historicMembers.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <p className="text-slate-600">¡Todos los socios anteriores ya renovaron! 🎉</p>
                  </div>
                ) : (
                <>
                  <div className="mb-4">
                    <p className="text-sm text-slate-600 mb-2">
                      Total: {historicMembers.length} socios históricos sin renovar
                    </p>
                    <div className="flex gap-2">
                      <Select value={seasonFilter === "all" ? "all" : seasonFilter} onValueChange={setSeasonFilter}>
                        <SelectTrigger className="w-64">
                          <SelectValue placeholder="Filtrar por temporada" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">📅 Todas las temporadas</SelectItem>
                          {availableSeasons.filter(s => s !== seasonConfig?.temporada).map(season => (
                            <SelectItem key={season} value={season}>
                              {season} ({historicMembers.filter(m => m.temporada === season).length})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={async () => {
                          if (!confirm(`¿Enviar recordatorio a ${historicMembers.filter(m => m.email).length} socios no renovados?`)) return;
                          
                          let sent = 0;
                          for (const member of historicMembers) {
                            if (!member.email) continue;
                            try {
                              await base44.functions.invoke('sendEmail', {
                                to: member.email,
                                subject: "💚 ¡Te echamos de menos! - Renueva tu carnet de socio",
                                html: `Estimado/a ${member.nombre_completo},

                              ¡Esperamos que todo vaya bien! 💚

                              Fuiste socio del CD Bustarviejo en la temporada ${member.temporada}.

                              🎉 TE INVITAMOS A RENOVAR para la temporada ${seasonConfig?.temporada}

                              Por solo 25€/año seguirás apoyando a nuestros jóvenes deportistas.

                              ¡Esperamos verte de nuevo!

                              CD Bustarviejo
                              cdbustarviejo@gmail.com`
                              });
                              sent++;
                            } catch (e) {
                              console.error("Error enviando:", e);
                            }
                            await new Promise(r => setTimeout(r, 200));
                          }
                          toast.success(`✅ ${sent} recordatorios enviados`);
                        }}
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        <Mail className="w-4 h-4 mr-2" /> Enviar a Todos ({historicMembers.filter(m => m.email).length})
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {historicMembers
                      .filter(m => seasonFilter === "all" || m.temporada === seasonFilter)
                      .map(member => (
                        <Card key={member.id} className="bg-white hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1 cursor-pointer" onClick={() => setViewingMember(member)}>
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <h4 className="font-semibold text-slate-900">{member.nombre_completo}</h4>
                                  <Badge variant="outline" className="text-xs">{member.numero_socio || "Sin nº"}</Badge>
                                  <Badge className="bg-slate-100 text-slate-700 text-xs">
                                    {member.temporada}
                                  </Badge>
                                  <Badge className="bg-red-100 text-red-700 text-xs">❌ No renovó {seasonConfig?.temporada}</Badge>
                                  {isExternalMember(member) && (
                                    <Badge className="bg-cyan-100 text-cyan-700 text-xs">Externo</Badge>
                                  )}
                                </div>
                                <div className="text-sm text-slate-600">
                                  <p>📧 {member.email} | 📱 {member.telefono}</p>
                                  <p className="text-xs">📍 {member.municipio}</p>
                                </div>
                              </div>
                              
                              <div className="flex gap-2">
                                <Button variant="ghost" size="icon" onClick={() => setViewingMember(member)} title="Ver detalle">
                                  <Eye className="w-4 h-4 text-slate-500" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => sendEmailToMember(member)}
                                  disabled={!member.email || sendingEmailTo === member.id}
                                  title="Enviar recordatorio de renovación"
                                >
                                  {sendingEmailTo === member.id ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <><Mail className="w-4 h-4 mr-1" /> Recordar</>
                                  )}
                                </Button>
                                {member.telefono && generateWhatsAppLink(member) && (
                                  <a href={generateWhatsAppLink(member)} target="_blank" rel="noopener noreferrer">
                                    <Button size="sm" variant="outline">
                                      <MessageCircle className="w-4 h-4 text-green-600" />
                                    </Button>
                                  </a>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                  </>
                  );
                  })()}
                  </CardContent>
                  </Card>
                  </TabsContent>

        <TabsContent value="no-renovados" className="space-y-6">
          <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
                <div>
                  <h3 className="text-xl font-bold text-red-900">Socios NO Renovados</h3>
                  <p className="text-sm text-red-700">Socios de temporadas anteriores que no se han renovado en {seasonConfig?.temporada}</p>
                </div>
              </div>
              
              {noRenovados.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-slate-600">¡Todos los socios anteriores se han renovado! 🎉</p>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex gap-2">
                    <Button
                      onClick={async () => {
                        if (!confirm(`¿Enviar recordatorio de renovación a ${noRenovados.length} socios?`)) return;
                        
                        let sent = 0;
                        for (const member of noRenovados) {
                          if (!member.email) continue;
                          try {
                            await base44.functions.invoke('sendEmail', {
                              to: member.email,
                              subject: "💚 ¡Te echamos de menos! - Renueva tu carnet de socio",
                              html: `Estimado/a ${member.nombre_completo},

¡Esperamos que todo vaya bien! 💚

Nos hemos dado cuenta de que aún no has renovado tu carnet de socio para la temporada ${seasonConfig?.temporada}.

🎉 TE INVITAMOS A RENOVAR

Por solo 25€/año seguirás apoyando a nuestros jóvenes deportistas de Bustarviejo.

Tu apoyo es importante para nosotros. ¡Esperamos verte de nuevo!

Un cordial saludo,
CD Bustarviejo
cdbustarviejo@gmail.com`
                            });
                            sent++;
                          } catch (e) {
                            console.error("Error enviando a:", member.email, e);
                          }
                          await new Promise(r => setTimeout(r, 200));
                        }
                        toast.success(`✅ ${sent} recordatorios enviados`);
                      }}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Enviar Recordatorio a Todos ({noRenovados.length})
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {noRenovados.map(member => (
                      <Card key={member.id} className="bg-white">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                              <h4 className="font-semibold text-slate-900">{member.nombre_completo}</h4>
                              <div className="text-sm text-slate-600 space-y-0.5 mt-1">
                                <p>📧 {member.email} | 📱 {member.telefono}</p>
                                <p className="text-xs">
                                  Última temporada: <Badge variant="outline">{member.temporada}</Badge>
                                  {member.es_socio_externo && <Badge className="ml-2 bg-cyan-100">Externo</Badge>}
                                  {member.es_socio_padre && <Badge className="ml-2 bg-purple-100">Padre</Badge>}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => sendEmailToMember(member)}
                                disabled={!member.email || sendingEmailTo === member.id}
                              >
                                {sendingEmailTo === member.id ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <><Mail className="w-4 h-4 mr-1" /> Recordar</>
                                )}
                              </Button>
                              {member.telefono && generateWhatsAppLink(member) && (
                                <a href={generateWhatsAppLink(member)} target="_blank" rel="noopener noreferrer">
                                  <Button size="sm" variant="outline">
                                    <MessageCircle className="w-4 h-4 text-green-600" />
                                  </Button>
                                </a>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    </div>
                    </>
                    )}
                    </CardContent>
                    </Card>
                    </TabsContent>
                    </Tabs>
    </div>
  );
}